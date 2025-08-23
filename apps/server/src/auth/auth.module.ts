import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditLogController } from '../audit-log/audit-log.controller';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { VerificationCodeService } from './services/verification-code.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RoleService } from './services/role.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { VerificationCode } from './entities/verification-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { Role } from './entities/role.entity';
import { User } from '../user/entities/user.entity';
import { CryptoService } from '../common/services/crypto.service';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    CommonModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    TypeOrmModule.forFeature([VerificationCode, RefreshToken, AuditLog, Role, User]),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 10000, // maximum number of items in cache
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
  ],
  controllers: [AuthController, AuditLogController, RoleController, UserRoleController],
  providers: [
    AuthService,
    VerificationCodeService,
    RefreshTokenService,
    RoleService,
    AuditLogService,
    LocalStrategy,
    JwtStrategy,
    CryptoService,
  ],
  exports: [AuthService, RoleService, AuditLogService, JwtModule],
})
export class AuthModule {}
