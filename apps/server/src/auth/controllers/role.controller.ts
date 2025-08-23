import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Req,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../decorators';
import { SystemRole, RoleService } from '../services/role.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';
import type { UserWithRoles } from '../strategies/jwt.strategy';
import type { IResponseBody, IResponseWithPagination } from '../../types/response';
import type { Role } from '../entities/role.entity';
import { PaginationService } from '../../common/services/pagination.service';
import { SortableQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin - Role Management')
@Controller('admin/roles')
@Roles(SystemRole.ADMIN)
@ApiBearerAuth()
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
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
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1
        }
      }
    }
  })
  async getAllRoles(
    @Query() queryDto: SortableQueryDto,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<IResponseWithPagination<Role[]>> {
    const options = this.paginationService.createOptionsFromDto(queryDto);

    const result = await this.paginationService.paginate(
      this.roleService.getRoleRepository(),
      options,
      (queryBuilder) => {
        // 添加搜索条件
        if (search) {
          queryBuilder.where(
            '(role.name LIKE :search OR role.description LIKE :search)',
            { search: `%${search}%` }
          );
        }

        // 添加状态筛选
        if (isActive !== undefined) {
          const activeStatus = isActive === 'true';
          const whereClause = search ? 'andWhere' : 'where';
          queryBuilder[whereClause]('role.isActive = :isActive', { isActive: activeStatus });
        }

        return queryBuilder;
      }
    );

    return this.paginationService.buildPaginationResponse(result, '角色列表查询成功');
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active roles only' })
  @ApiResponse({
    status: 200,
    description: 'Active roles retrieved successfully',
  })
  async getActiveRoles(): Promise<IResponseBody<Role[]>> {
    const roles = await this.roleService.findActiveRoles();
    return {
      success: true,
      data: roles,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get role statistics' })
  @ApiResponse({
    status: 200,
    description: 'Role statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            role: {
              id: 'uuid-1',
              name: 'ADMIN',
              description: '管理员角色，可以访问管理后台接口',
              isActive: true
            },
            userCount: 5
          }
        ]
      }
    }
  })
  async getRoleStatistics(): Promise<IResponseBody<Array<{ role: Role; userCount: number }>>> {
    const statistics = await this.roleService.getRoleStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async getRoleById(@Param('id') id: string): Promise<IResponseBody<Role>> {
    const role = await this.roleService.findRoleById(id);
    return {
      success: true,
      data: role,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-3',
          name: 'MODERATOR',
          description: '版主角色，负责内容审核',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        message: 'Role created successfully'
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Role with the same name already exists',
  })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<IResponseBody<Role>> {
    const role = await this.roleService.createRole(createRoleDto);

    // 记录审计日志
    const auditLogService = (this.roleService as any).auditLogService;
    if (auditLogService) {
      await auditLogService.logRoleCreated(user.id, role.name, createRoleDto, request);
    }

    return {
      success: true,
      data: role,
      message: 'Role created successfully',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Role with the same name already exists',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<IResponseBody<Role>> {
    // 获取更新前的角色信息
    const oldRole = await this.roleService.findRoleById(id);
    const updatedRole = await this.roleService.updateRole(id, updateRoleDto);

    // 记录审计日志
    const auditLogService = (this.roleService as any).auditLogService;
    if (auditLogService) {
      await auditLogService.logRoleUpdated(
        user.id, 
        updatedRole.name, 
        { 
          before: { name: oldRole.name, description: oldRole.description, isActive: oldRole.isActive },
          after: updateRoleDto 
        }, 
        request
      );
    }

    return {
      success: true,
      data: updatedRole,
      message: 'Role updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: 204,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role or role with assigned users',
  })
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: UserWithRoles,
    @Req() request: Request,
  ): Promise<void> {
    // 获取删除前的角色信息
    const role = await this.roleService.findRoleById(id);
    await this.roleService.deleteRole(id);
    
    // 记录审计日志
    const auditLogService = (this.roleService as any).auditLogService;
    if (auditLogService) {
      await auditLogService.logRoleDeleted(user.id, role.name, request);
    }
  }
}
