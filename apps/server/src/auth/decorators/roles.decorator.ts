import { SetMetadata } from '@nestjs/common';

/**
 * 角色权限装饰器
 * 用于标记接口所需的角色权限
 * 
 * @param roles - 允许访问该接口的角色列表
 * 
 * @example
 * ```typescript
 * // 只允许管理员访问
 * @Roles('ADMIN')
 * @Get('admin/users')
 * async getUsers() {}
 * 
 * // 允许多个角色访问
 * @Roles('ADMIN', 'MODERATOR)
 * @Get('profile')
 * async getProfile() {}
 * 
 * // 使用枚举
 * @Roles(SystemRole.ADMIN)
 * @Delete('admin/users/:id')
 * async deleteUser() {}
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * 用于检查角色要求的元数据键
 */
export const ROLES_KEY = 'roles';
