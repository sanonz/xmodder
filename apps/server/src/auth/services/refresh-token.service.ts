import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AuditLog, AuditEventType } from '../../audit-log/audit-log.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { ValidationUtils } from '../../common/utils/validation.utils';
import { nanoid } from 'nanoid';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 创建刷新令牌
   */
  async createRefreshToken(
    userId: string,
    deviceId?: string,
    request?: any,
  ): Promise<string> {
    const token = nanoid(64); // 生成64字符的随机令牌
    const tokenHash = await this.cryptoService.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天过期

    const clientIp = request ? ValidationUtils.getClientIp(request) : null;
    const userAgent = request ? ValidationUtils.getUserAgent(request) : null;

    // 创建刷新令牌记录
    const refreshToken = this.refreshTokenRepository.create({
      tokenHash,
      userId,
      expiresAt,
      deviceId,
      userAgent,
      ipAddress: clientIp,
    });

    await this.refreshTokenRepository.save(refreshToken);

    // 记录审计日志
    if (request) {
      await this.auditLogRepository.save({
        userId,
        eventType: AuditEventType.REFRESH_TOKEN_USED,
        ipAddress: clientIp,
        userAgent,
        deviceId,
        success: true,
        metadata: { action: 'create' },
      });
    }

    return token;
  }

  /**
   * 验证并使用刷新令牌（令牌轮换）
   */
  async validateAndRotateToken(
    token: string,
    deviceId?: string,
    request?: any,
  ): Promise<{ userId: string; newToken: string }> {
    const clientIp = request ? ValidationUtils.getClientIp(request) : null;
    const userAgent = request ? ValidationUtils.getUserAgent(request) : null;

    // 查找所有可能的刷新令牌
    const refreshTokens = await this.refreshTokenRepository.find({
      where: {
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    let validToken: RefreshToken | null = null;

    // 验证令牌
    for (const refreshToken of refreshTokens) {
      const isValid = await this.cryptoService.verifyToken(
        refreshToken.tokenHash,
        token,
      );
      if (isValid) {
        validToken = refreshToken;
        break;
      }
    }

    if (!validToken) {
      // 记录失败的审计日志
      if (request) {
        await this.auditLogRepository.save({
          eventType: AuditEventType.REFRESH_TOKEN_USED,
          ipAddress: clientIp,
          userAgent,
          deviceId,
          success: false,
          errorMessage: 'Invalid refresh token',
        });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 检查设备ID匹配（如果提供）
    if (deviceId && validToken.deviceId && validToken.deviceId !== deviceId) {
      await this.auditLogRepository.save({
        userId: validToken.userId,
        eventType: AuditEventType.REFRESH_TOKEN_USED,
        ipAddress: clientIp,
        userAgent,
        deviceId,
        success: false,
        errorMessage: 'Device ID mismatch',
      });
      throw new UnauthorizedException('Device mismatch');
    }

    // 撤销当前令牌
    await this.revokeToken(validToken.id);

    // 创建新的刷新令牌
    const newToken = await this.createRefreshToken(
      validToken.userId,
      deviceId || validToken.deviceId || undefined,
      request,
    );

    // 更新最后使用时间
    await this.refreshTokenRepository.update(validToken.id, {
      lastUsedAt: new Date(),
    });

    return {
      userId: validToken.userId,
      newToken,
    };
  }

  /**
   * 撤销刷新令牌
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, {
      isActive: false,
    });

    // 记录审计日志
    const token = await this.refreshTokenRepository.findOne({
      where: { id: tokenId },
    });

    if (token) {
      await this.auditLogRepository.save({
        userId: token.userId,
        eventType: AuditEventType.REFRESH_TOKEN_REVOKED,
        ipAddress: token.ipAddress,
        deviceId: token.deviceId,
        success: true,
        metadata: { reason: 'manual_revoke' },
      });
    }
  }

  /**
   * 撤销用户的所有刷新令牌
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    // 记录审计日志
    await this.auditLogRepository.save({
      userId,
      eventType: AuditEventType.REFRESH_TOKEN_REVOKED,
      success: true,
      metadata: { reason: 'revoke_all' },
    });
  }

  /**
   * 撤销设备的所有刷新令牌
   */
  async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, deviceId, isActive: true },
      { isActive: false },
    );

    // 记录审计日志
    await this.auditLogRepository.save({
      userId,
      eventType: AuditEventType.REFRESH_TOKEN_REVOKED,
      deviceId,
      success: true,
      metadata: { reason: 'revoke_device' },
    });
  }

  /**
   * 清理过期的刷新令牌
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * 获取用户的活跃会话
   */
  async getUserActiveSessions(userId: string): Promise<RefreshToken[]> {
    return await this.refreshTokenRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });
  }
}
