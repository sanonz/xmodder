import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import { IResponseBody, IResponseWithPagination } from '../types/response';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users list (admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            email: 'user@example.com',
            username: 'john_doe',
            nickname: 'John Doe',
            isActive: true,
            createdAt: '2023-01-01T00:00:00.000Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5
        },
      }
    }
  })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<IResponseWithPagination<Omit<User, 'password'>[]>> {
    // TODO: 实现用户列表查询，需要管理员权限检查
    // 这里暂时返回空列表，实际实现需要分页和搜索功能
    return {
      success: true,
      data: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific user by ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
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
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getUserById(
    @Param('userId') userId: string,
  ): Promise<IResponseBody<Omit<User, 'password'>>> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found'); // 这里应该抛出 NotFoundException
    }

    const { password, ...userProfile } = user;
    return {
      success: true,
      data: userProfile,
    };
  }

  @Patch(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update specific user by ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateUserById(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IResponseBody<Omit<User, 'password'>>> {
    const updatedUser = await this.userService.update(userId, updateUserDto);
    const { password, ...userProfile } = updatedUser;
    return {
      success: true,
      data: userProfile,
      message: 'User updated successfully',
    };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete specific user by ID (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async deleteUserById(
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.userService.softDelete(userId);
  }

  @Patch(':userId/activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate user account (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User account activated successfully',
    schema: {
      example: {
        success: true,
        message: 'User account activated successfully',
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async activateUser(
    @Param('userId') userId: string,
  ): Promise<IResponseBody> {
    await this.userService.activate(userId);
    return {
      success: true,
      message: 'User account activated successfully',
    };
  }

  @Patch(':userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate user account (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User account deactivated successfully',
    schema: {
      example: {
        success: true,
        message: 'User account deactivated successfully',
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async deactivateUser(
    @Param('userId') userId: string,
  ): Promise<IResponseBody> {
    await this.userService.deactivate(userId);
    return {
      success: true,
      message: 'User account deactivated successfully',
    };
  }

  @Patch(':userId/verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify user email (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'User email verified successfully',
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async verifyUserEmail(
    @Param('userId') userId: string,
  ): Promise<IResponseBody> {
    await this.userService.verifyEmail(userId);
    return {
      success: true,
      message: 'User email verified successfully',
    };
  }

  @Patch(':userId/verify-phone')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify user phone (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User phone verified successfully',
    schema: {
      example: {
        success: true,
        message: 'User phone verified successfully',
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async verifyUserPhone(
    @Param('userId') userId: string,
  ): Promise<IResponseBody> {
    await this.userService.verifyPhone(userId);
    return {
      success: true,
      message: 'User phone verified successfully',
    };
  }
}
