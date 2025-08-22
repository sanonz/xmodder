import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { AuditLog, AuditEventType } from '../audit-log/audit-log.entity';
import { VerificationCodeService } from './services/verification-code.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RoleService } from './services/role.service';
import { VerificationCodePurpose } from './entities/verification-code.entity';
import { LoginDto, SendVerificationCodeDto, RefreshTokenDto, ChangePasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ValidationUtils } from '../common/utils/validation.utils';
import { CryptoService } from '../common/services/crypto.service';

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly roleService: RoleService,
    private readonly cryptoService: CryptoService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 用户注册
   */
  async register(createUserDto: CreateUserDto, request: any): Promise<LoginResponse> {
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);

    try {
      // 创建用户
      const user = await this.userService.create(createUserDto);

      // 记录成功的审计日志
      await this.auditLogRepository.save({
        userId: user.id,
        eventType: AuditEventType.REGISTER_SUCCESS,
        target: user.email || user.phone,
        ipAddress: clientIp,
        userAgent,
        success: true,
      });

      // 生成令牌
      return await this.generateTokens(user, request);
    } catch (error) {
      // 记录失败的审计日志
      await this.auditLogRepository.save({
        eventType: AuditEventType.REGISTER_FAILED,
        target: createUserDto.email || createUserDto.phone,
        ipAddress: clientIp,
        userAgent,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto, request: any): Promise<LoginResponse> {
    const { email, phone, password, verificationCode, deviceId } = loginDto;
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);

    // 验证邮箱或手机号至少有一个
    if (!ValidationUtils.hasEmailOrPhone(email, phone)) {
      throw new BadRequestException('Email or phone number is required');
    }

    // 查找用户
    const user = await this.userService.findByEmailOrPhone(email, phone);
    if (!user) {
      await this.logLoginFailure(email || phone || 'unknown', clientIp, userAgent, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // 检查用户是否激活
    if (!user.isActive) {
      await this.logLoginFailure(email || phone || 'unknown', clientIp, userAgent, 'Account disabled');
      throw new UnauthorizedException('Account is disabled');
    }

    try {
      // 密码登录
      if (password) {
        const isPasswordValid = await this.userService.validatePassword(user, password);
        if (!isPasswordValid) {
          await this.logLoginFailure(email || phone || 'unknown', clientIp, userAgent, 'Invalid password');
          throw new UnauthorizedException('Invalid credentials');
        }
      }
      // 验证码登录
      else if (verificationCode) {
        if (!phone) {
          throw new BadRequestException('Phone number is required for verification code login');
        }
        await this.verificationCodeService.verifyCode(
          phone,
          verificationCode,
          VerificationCodePurpose.LOGIN,
          request,
        );
      } else {
        throw new BadRequestException('Password or verification code is required');
      }

      // 记录成功的审计日志
      await this.auditLogRepository.save({
        userId: user.id,
        eventType: AuditEventType.LOGIN_SUCCESS,
        target: email || phone,
        ipAddress: clientIp,
        userAgent,
        deviceId,
        success: true,
        metadata: { loginMethod: password ? 'password' : 'verification_code' },
      });

      // 生成令牌
      return await this.generateTokens(user, request, deviceId);
    } catch (error) {
      await this.logLoginFailure(email || phone || 'unknown', clientIp, userAgent, error.message, user.id);
      throw error;
    }
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(sendCodeDto: SendVerificationCodeDto, request: any): Promise<void> {
    const { email, phone, purpose } = sendCodeDto;

    if (!ValidationUtils.hasEmailOrPhone(email, phone)) {
      throw new BadRequestException('Email or phone number is required');
    }

    const target = email || phone;
    if (!target) {
      throw new BadRequestException('Email or phone number is required');
    }
    const purposeEnum = purpose as VerificationCodePurpose;

    await this.verificationCodeService.sendVerificationCode(target, purposeEnum, request);
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, request: any): Promise<LoginResponse> {
    const { refreshToken, deviceId } = refreshTokenDto;

    const { userId, newToken } = await this.refreshTokenService.validateAndRotateToken(
      refreshToken,
      deviceId,
      request,
    );

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 获取用户角色
    const userRoles = await this.roleService.getUserRoleNames(user.id);
    console.log('userRoles', userRoles)

    // 生成新的访问令牌
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      username: user.username,
      roles: userRoles,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = 15 * 60; // 15分钟

    return {
      accessToken,
      refreshToken: newToken,
      user: this.excludePassword(user),
      expiresIn,
    };
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto, request: any): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await this.userService.validatePassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
      await this.auditLogRepository.save({
        userId,
        eventType: AuditEventType.PASSWORD_CHANGE,
        ipAddress: clientIp,
        userAgent,
        success: false,
        errorMessage: 'Invalid current password',
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    // 更新密码
    await this.userService.updatePassword(userId, newPassword);

    // 记录审计日志
    await this.auditLogRepository.save({
      userId,
      eventType: AuditEventType.PASSWORD_CHANGE,
      ipAddress: clientIp,
      userAgent,
      success: true,
    });

    // 撤销所有刷新令牌，强制重新登录
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * 重置密码
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto, request: any): Promise<void> {
    const { email, phone, verificationCode, newPassword } = resetPasswordDto;
    const clientIp = ValidationUtils.getClientIp(request);
    const userAgent = ValidationUtils.getUserAgent(request);

    if (!ValidationUtils.hasEmailOrPhone(email, phone)) {
      throw new BadRequestException('Email or phone number is required');
    }

    const target = email || phone;
    if (!target) {
      throw new BadRequestException('Email or phone number is required');
    }

    // 验证验证码
    await this.verificationCodeService.verifyCode(
      target,
      verificationCode,
      VerificationCodePurpose.RESET_PASSWORD,
      request,
    );

    // 查找用户
    const user = await this.userService.findByEmailOrPhone(email, phone);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // 更新密码
    await this.userService.updatePassword(user.id, newPassword);

    // 记录审计日志
    await this.auditLogRepository.save({
      userId: user.id,
      eventType: AuditEventType.PASSWORD_RESET,
      target,
      ipAddress: clientIp,
      userAgent,
      success: true,
    });

    // 撤销所有刷新令牌，强制重新登录
    await this.refreshTokenService.revokeAllUserTokens(user.id);
  }

  /**
   * 登出
   */
  async logout(userId: string, deviceId?: string): Promise<void> {
    if (deviceId) {
      await this.refreshTokenService.revokeDeviceTokens(userId, deviceId);
    } else {
      await this.refreshTokenService.revokeAllUserTokens(userId);
    }
  }

  /**
   * 验证JWT载荷
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(user: User, request?: any, deviceId?: string): Promise<LoginResponse> {
    // 获取用户角色
    const userRoles = await this.roleService.getUserRoleNames(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      username: user.username,
      roles: userRoles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
      deviceId,
      request,
    );

    const expiresIn = 15 * 60; // 15分钟

    return {
      accessToken,
      refreshToken,
      user: this.excludePassword(user),
      expiresIn,
    };
  }

  /**
   * 排除密码字段
   */
  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 记录登录失败的审计日志
   */
  private async logLoginFailure(
    target: string,
    ipAddress: string,
    userAgent: string,
    errorMessage: string,
    userId?: string,
  ): Promise<void> {
    await this.auditLogRepository.save({
      userId,
      eventType: AuditEventType.LOGIN_FAILED,
      target,
      ipAddress,
      userAgent,
      success: false,
      errorMessage,
    });
  }
}
