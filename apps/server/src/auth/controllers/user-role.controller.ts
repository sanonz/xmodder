import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Req,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../decorators';
import { SystemRole, RoleService } from '../services/role.service';
import { UserService } from '../../user/user.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AssignRolesDto, RemoveRolesDto } from '../dto/role.dto';
import type { UserWithRoles } from '../strategies/jwt.strategy';
import type { IResponseBody } from '../../types/response';
import type { Role } from '../entities/role.entity';

@ApiTags('Admin - User Role Management')
@Controller('admin/users')
@Roles(SystemRole.ADMIN)
@ApiBearerAuth()
export class UserRoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
  ) {}

  @Get(':userId/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-1',
            name: 'ADMIN',
            description: '管理员角色，可以访问管理后台接口',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserRoles(@Param('userId') userId: string): Promise<IResponseBody<Role[]>> {
    const roles = await this.roleService.getUserRoles(userId);
    return {
      success: true,
      data: roles,
    };
  }

  @Post(':userId/roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Roles assigned successfully',
    schema: {
      example: {
        success: true,
        message: 'Roles assigned successfully',
        data: {
          userId: 'user-uuid',
          assignedRoles: ['MODERATOR'],
          currentRoles: ['ADMIN', 'MODERATOR']
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User or role not found',
  })
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() assignRolesDto: AssignRolesDto,
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<IResponseBody<any>> {
    // 检查用户是否存在
    const targetUser = await this.userService.findById(userId);
    if (!targetUser) {
      throw new Error(`User with ID '${userId}' not found`);
    }

    // 获取分配前的角色
    const currentRoles = await this.roleService.getUserRoleNames(userId);
    
    // 分配角色
    await this.roleService.assignRolesToUser(
      userId, 
      assignRolesDto.roles, 
      user.id, 
      request
    );

    // 获取分配后的角色
    const updatedRoles = await this.roleService.getUserRoleNames(userId);

    return {
      success: true,
      message: 'Roles assigned successfully',
      data: {
        userId,
        assignedRoles: assignRolesDto.roles,
        currentRoles: updatedRoles,
      },
    };
  }

  @Delete(':userId/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove roles from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Roles removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Roles removed successfully',
        data: {
          userId: 'user-uuid',
          removedRoles: ['MODERATOR'],
          currentRoles: ['ADMIN']
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove all roles from user',
  })
  async removeRolesFromUser(
    @Param('userId') userId: string,
    @Body() removeRolesDto: RemoveRolesDto,
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<IResponseBody<any>> {
    // 检查用户是否存在
    const targetUser = await this.userService.findById(userId);
    if (!targetUser) {
      throw new Error(`User with ID '${userId}' not found`);
    }

    // 获取移除前的角色
    const currentRoles = await this.roleService.getUserRoleNames(userId);
    
    // 移除角色
    await this.roleService.removeRolesFromUser(
      userId, 
      removeRolesDto.roles, 
      user.id, 
      request
    );

    // 获取移除后的角色
    const updatedRoles = await this.roleService.getUserRoleNames(userId);

    return {
      success: true,
      message: 'Roles removed successfully',
      data: {
        userId,
        removedRoles: removeRolesDto.roles,
        currentRoles: updatedRoles,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with their roles' })
  @ApiResponse({
    status: 200,
    description: 'Users with roles retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'user-uuid-1',
            username: 'john_doe',
            email: 'john@example.com',
            isActive: true,
            roles: [
              {
                id: 'role-uuid-1',
                name: 'ADMIN',
                description: '管理员角色'
              }
            ]
          }
        ]
      }
    }
  })
  async getAllUsersWithRoles(): Promise<IResponseBody<any[]>> {
    // 暂时返回占位数据，后续实现完整功能
    return {
      success: true,
      data: [],
      message: 'This endpoint will be implemented after UserService enhancement'
    };
  }

  @Post(':userId/roles/batch')
  @ApiOperation({ summary: 'Batch assign/remove roles for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Roles updated successfully',
  })
  async batchUpdateUserRoles(
    @Param('userId') userId: string,
    @Body() batchRolesDto: { assignRoles?: string[]; removeRoles?: string[] },
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<IResponseBody<any>> {
    // 检查用户是否存在
    const targetUser = await this.userService.findById(userId);
    if (!targetUser) {
      throw new Error(`User with ID '${userId}' not found`);
    }

    const operations: string[] = [];

    // 移除角色（先执行移除操作）
    if (batchRolesDto.removeRoles && batchRolesDto.removeRoles.length > 0) {
      await this.roleService.removeRolesFromUser(
        userId, 
        batchRolesDto.removeRoles, 
        user.id, 
        request
      );
      operations.push(`Removed roles: ${batchRolesDto.removeRoles.join(', ')}`);
    }

    // 分配角色
    if (batchRolesDto.assignRoles && batchRolesDto.assignRoles.length > 0) {
      await this.roleService.assignRolesToUser(
        userId, 
        batchRolesDto.assignRoles, 
        user.id, 
        request
      );
      operations.push(`Assigned roles: ${batchRolesDto.assignRoles.join(', ')}`);
    }

    // 获取最终的角色列表
    const finalRoles = await this.roleService.getUserRoleNames(userId);

    return {
      success: true,
      message: 'Roles updated successfully',
      data: {
        userId,
        operations,
        currentRoles: finalRoles,
      },
    };
  }
}
