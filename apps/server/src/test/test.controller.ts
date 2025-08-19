import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, Public } from '../auth/decorators';
import { SystemRole } from '../auth/services/role.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserWithRoles } from '../auth/strategies/jwt.strategy';
import type { IResponseBody } from '../types/response';

@ApiTags('Test RBAC')
@Controller('test')
export class TestController {
  
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public endpoint - no authentication required' })
  getPublicData(): IResponseBody<string> {
    return {
      success: true,
      data: 'This is public data, accessible without authentication',
    };
  }

  @Get('protected')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected endpoint - authentication required, any role' })
  getProtectedData(@CurrentUser() user: UserWithRoles): IResponseBody<any> {
    return {
      success: true,
      data: {
        message: 'This data requires authentication',
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
      },
    };
  }

  @Roles(SystemRole.ADMIN)
  @Get('admin-only')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin role required endpoint' })
  getAdminData(@CurrentUser() user: UserWithRoles): IResponseBody<string> {
    return {
      success: true,
      data: `Hello ${user.username}, you have ADMIN role access!`,
    };
  }

  @Roles(SystemRole.ADMIN)
  @Get('user-or-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User or Admin role required endpoint' })
  getUserOrAdminData(@CurrentUser() user: UserWithRoles): IResponseBody<string> {
    return {
      success: true,
      data: `Hello ${user.username}, you have either USER or ADMIN role access! Your roles: ${user.roles.join(', ')}`,
    };
  }

  @Roles(SystemRole.ADMIN)
  @Delete('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin only - delete something' })
  deleteResource(@Param('id') id: string, @CurrentUser() user: UserWithRoles): IResponseBody<string> {
    return {
      success: true,
      data: `Admin ${user.username} deleted resource ${id}`,
    };
  }
}
