import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // 可以是 email 或 phone
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(request: any, username: string, password: string): Promise<User> {
    // 从请求体中获取完整的登录信息
    const { email, phone, verificationCode, deviceId } = request.body;
    
    try {
      const loginResult = await this.authService.login(
        { email, phone, password, verificationCode, deviceId },
        request,
      );
      return loginResult.user as User;
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
