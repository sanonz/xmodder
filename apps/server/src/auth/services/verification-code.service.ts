import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { VerificationCode, VerificationCodePurpose } from '../entities/verification-code.entity';
import { AuditLog, AuditEventType } from '../../audit-log/audit-log.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { ValidationUtils } from '../../common/utils/validation.utils';

@Injectable()
export class VerificationCodeService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 发送验证码
   */
  async sendVerificationCode(
    target: string,
    purpose: VerificationCodePurpose,
    request: any,
  ): Promise<void> {
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);

    // 标准化目标（邮箱或手机号）
    const normalizedTarget = this.normalizeTarget(target);

    // 检查频率限制
    await this.checkRateLimit(normalizedTarget, clientIp);

    // 生成验证码
    const code = ValidationUtils.generateVerificationCode();
    const hashedCode = await this.cryptoService.hashVerificationCode(code);

    // 清理过期的验证码
    await this.cleanupExpiredCodes();

    // 保存验证码
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期
    const verificationCode = this.verificationCodeRepository.create({
      target: normalizedTarget,
      hashedCode,
      purpose,
      expiresAt,
      requestIp: clientIp,
    });

    await this.verificationCodeRepository.save(verificationCode);

    // 模拟发送验证码（实际项目中需要集成短信/邮件服务）
    console.log(`Verification code for ${normalizedTarget}: ${code}`);

    // 记录审计日志
    await this.auditLogRepository.save({
      eventType: AuditEventType.VERIFICATION_CODE_SENT,
      target: normalizedTarget,
      ipAddress: clientIp,
      userAgent,
      success: true,
      metadata: { purpose },
    });

    // 设置发送频率限制缓存
    const rateLimitKey = `rate_limit:${normalizedTarget}`;
    await this.cacheManager.set(rateLimitKey, Date.now(), 60 * 1000); // 1分钟
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    target: string,
    code: string,
    purpose: VerificationCodePurpose,
    request: any,
  ): Promise<boolean> {
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);
    const normalizedTarget = this.normalizeTarget(target);

    // 查找最新的未使用验证码
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        target: normalizedTarget,
        purpose,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!verificationCode) {
      await this.logVerificationFailure(
        normalizedTarget,
        clientIp,
        userAgent,
        purpose,
        'Code not found or expired',
      );
      throw new BadRequestException('Invalid or expired verification code');
    }

    // 检查是否超过最大尝试次数
    if (verificationCode.attempts >= verificationCode.maxAttempts) {
      await this.logVerificationFailure(
        normalizedTarget,
        clientIp,
        userAgent,
        purpose,
        'Max attempts exceeded',
      );
      throw new BadRequestException('Too many failed attempts');
    }

    // 验证码是否正确
    const isValid = await this.cryptoService.verifyVerificationCode(
      verificationCode.hashedCode,
      code,
    );

    if (!isValid) {
      // 增加失败次数
      await this.verificationCodeRepository.update(verificationCode.id, {
        attempts: verificationCode.attempts + 1,
      });

      await this.logVerificationFailure(
        normalizedTarget,
        clientIp,
        userAgent,
        purpose,
        'Invalid code',
      );
      throw new BadRequestException('Invalid verification code');
    }

    // 标记验证码为已使用
    await this.verificationCodeRepository.update(verificationCode.id, {
      used: true,
    });

    // 记录成功的审计日志
    await this.auditLogRepository.save({
      eventType: AuditEventType.VERIFICATION_CODE_SUCCESS,
      target: normalizedTarget,
      ipAddress: clientIp,
      userAgent,
      success: true,
      metadata: { purpose },
    });

    return true;
  }

  /**
   * 检查发送频率限制
   */
  private async checkRateLimit(target: string, ip: string): Promise<void> {
    const targetRateLimitKey = `rate_limit:${target}`;
    const ipRateLimitKey = `rate_limit:ip:${ip}`;

    const [targetLastSent, ipLastSent] = await Promise.all([
      this.cacheManager.get<number>(targetRateLimitKey),
      this.cacheManager.get<number>(ipRateLimitKey),
    ]);

    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (targetLastSent && now - targetLastSent < oneMinute) {
      throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (ipLastSent && now - ipLastSent < oneMinute) {
      throw new HttpException('Too many requests from this IP', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * 标准化目标（邮箱或手机号）
   */
  private normalizeTarget(target: string): string {
    if (ValidationUtils.isValidEmail(target)) {
      return ValidationUtils.normalizeEmail(target);
    } else if (ValidationUtils.isValidPhoneNumber(target)) {
      return ValidationUtils.normalizePhoneNumber(target);
    } else {
      throw new BadRequestException('Invalid email or phone number format');
    }
  }

  /**
   * 清理过期的验证码
   */
  private async cleanupExpiredCodes(): Promise<void> {
    await this.verificationCodeRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * 记录验证失败的审计日志
   */
  private async logVerificationFailure(
    target: string,
    ipAddress: string,
    userAgent: string,
    purpose: VerificationCodePurpose,
    errorMessage: string,
  ): Promise<void> {
    await this.auditLogRepository.save({
      eventType: AuditEventType.VERIFICATION_CODE_FAILED,
      target,
      ipAddress,
      userAgent,
      success: false,
      errorMessage,
      metadata: { purpose },
    });
  }
}
