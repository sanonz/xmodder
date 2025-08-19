import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

/**
 * RESTful API 路由配置
 * 
 * 路由结构:
 * - /api/v1/users                 # 用户资源
 * - /api/v1/users/me              # 当前用户资源
 * - /api/v1/users/me/sessions     # 当前用户会话资源
 * - /api/v1/auth/sessions         # 认证会话资源
 * - /api/v1/verification-codes    # 验证码资源
 * - /api/v1/password-reset        # 密码重置资源
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          {
            path: 'auth',
            module: AuthModule,
          },
          {
            path: 'users',
            module: UserModule,
          },
        ],
      },
    ]),
  ],
})
export class ApiModule {}
