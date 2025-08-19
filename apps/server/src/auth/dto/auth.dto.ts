import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @ValidateIf((o) => !o.phone || o.email)
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+8613800138000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  @ValidateIf((o) => !o.email || o.phone)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Password (required for password login)',
    example: 'StrongPassword123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @ValidateIf((o) => !o.verificationCode)
  password?: string;

  @ApiPropertyOptional({
    description: 'Verification code (required for code login)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  @ValidateIf((o) => !o.password)
  verificationCode?: string;

  @ApiPropertyOptional({
    description: 'Device identifier for session management',
    example: 'device_uuid_123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SendVerificationCodeDto {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @ValidateIf((o) => !o.phone || o.email)
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+8613800138000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  @ValidateIf((o) => !o.email || o.phone)
  phone?: string;

  @ApiProperty({
    description: 'Purpose of verification code',
    enum: ['login', 'register', 'reset_password', 'change_email', 'change_phone'],
    example: 'login',
  })
  @IsString()
  purpose: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;

  @ApiPropertyOptional({
    description: 'Device identifier',
    example: 'device_uuid_123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewPassword123!',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @ValidateIf((o) => !o.phone || o.email)
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+8613800138000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  @ValidateIf((o) => !o.email || o.phone)
  phone?: string;

  @ApiProperty({
    description: 'Verification code',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  verificationCode: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewPassword123!',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
