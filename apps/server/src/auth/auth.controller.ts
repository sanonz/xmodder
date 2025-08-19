import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import {
  LoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../user/entities/user.entity';
import { IResponseBody } from '../types/response';

@ApiTags('Users & Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  // ==================== 用户资源管理 ====================

  @Public()
  @Post('users')
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User account created successfully',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            username: 'john_doe',
            nickname: 'John Doe',
            createdAt: '2023-01-01T00:00:00.000Z'
          },
          expiresIn: 900
        },
        message: 'User account created successfully',
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request,
  ): Promise<IResponseBody<LoginResponse>> {
    const result = await this.authService.register(createUserDto, request);
    return {
      success: true,
      data: result,
      message: 'User account created successfully',
    };
  }

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          email: 'user@example.com',
          phone: '+8613800138000',
          username: 'john_doe',
          nickname: 'John Doe',
          avatar: 'https://example.com/avatar.jpg',
          emailVerified: true,
          phoneVerified: true,
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
      }
    }
  })
  async getCurrentUser(@CurrentUser() user: User): Promise<IResponseBody<Omit<User, 'password'>>> {
    const { password, ...userProfile } = user;
    return {
      success: true,
      data: userProfile,
    };
  }

  @Patch('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully'
  })
  async updateCurrentUser(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IResponseBody<Omit<User, 'password'>>> {
    const updatedUser = await this.userService.update(user.id, updateUserDto);
    const { password, ...userProfile } = updatedUser;
    return {
      success: true,
      data: userProfile,
      message: 'User profile updated successfully',
    };
  }

  // ==================== 认证会话管理 ====================

    @Public()
  @Post('auth/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 201,
    description: 'Authentication session created successfully',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            username: 'john_doe'
          },
          expiresIn: 900
        },
        message: 'Authentication session created successfully',
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiBody({ type: LoginDto })
  async createSession(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<IResponseBody<LoginResponse>> {
    const result = await this.authService.login(loginDto, request);
    return {
      success: true,
      data: result,
      message: 'Authentication session created successfully',
    };
  }

  @Public()
  @Put('auth/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh authentication session' })
  @ApiResponse({
    status: 200,
    description: 'Authentication session refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  async refreshSession(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<IResponseBody<LoginResponse>> {
    const result = await this.authService.refreshToken(refreshTokenDto, request);
    return {
      success: true,
      data: result,
      message: 'Authentication session refreshed successfully',
    };
  }

  @Delete('auth/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Destroy current authentication session (logout)' })
  @ApiResponse({ status: 204, description: 'Authentication session destroyed successfully' })
  async destroyCurrentSession(
    @CurrentUser() user: User,
    @Body() body?: { deviceId?: string },
  ): Promise<void> {
    await this.authService.logout(user.id, body?.deviceId);
  }

  @Get('users/me/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'session-uuid',
            deviceId: 'device-123',
            userAgent: 'Mozilla/5.0...',
            ipAddress: '192.168.1.1',
            lastUsedAt: '2023-01-01T00:00:00.000Z',
            createdAt: '2023-01-01T00:00:00.000Z'
          }
        ],
      }
    }
  })
  async getCurrentUserSessions(@CurrentUser() user: User): Promise<IResponseBody<RefreshToken[]>> {
    const sessions = await this.refreshTokenService.getUserActiveSessions(user.id);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete('users/me/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Destroy specific user session' })
  @ApiResponse({ status: 204, description: 'Session destroyed successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async destroyUserSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.refreshTokenService.revokeToken(sessionId);
  }

  @Delete('users/me/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Destroy all user sessions' })
  @ApiResponse({ status: 204, description: 'All sessions destroyed successfully' })
  async destroyAllUserSessions(@CurrentUser() user: User): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(user.id);
  }

  // ==================== 验证码资源管理 ====================

  @Public()
  @Post('verification-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send verification code' })
  @ApiResponse({
    status: 201,
    description: 'Verification code created and sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Verification code sent successfully',
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid target or purpose' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async createVerificationCode(
    @Body() sendCodeDto: SendVerificationCodeDto,
    @Req() request: Request,
  ): Promise<IResponseBody> {
    await this.authService.sendVerificationCode(sendCodeDto, request);
    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  // ==================== 密码资源管理 ====================

  @Patch('users/me/password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user password' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Password updated successfully',
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid current password' })
  async updateCurrentUserPassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<IResponseBody> {
    await this.authService.changePassword(user.id, changePasswordDto, request);
    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password with verification code' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid verification code or data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<IResponseBody> {
    await this.authService.resetPassword(resetPasswordDto, request);
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
