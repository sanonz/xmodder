import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { User } from '../../user/entities/user.entity';

/**
 * 扩展的用户接口，用于守卫验证
 * 包含从JWT中提取的角色信息
 */
export interface UserWithRoles extends Omit<User, 'roles'> {
  roles: string[]; // JWT中的角色名称数组
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<UserWithRoles> {
    try {
      const user = await this.authService.validateJwtPayload(payload);
      // 将JWT中的角色信息附加到用户对象上，用于守卫验证
      const { roles: _, ...userWithoutRoles } = user;
      return {
        ...userWithoutRoles,
        roles: payload.roles || [],
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
