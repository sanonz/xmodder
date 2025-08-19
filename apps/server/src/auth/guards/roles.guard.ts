import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators';
import type { UserWithRoles } from '../strategies/jwt.strategy';
import { InsufficientPermissionException, NoRolesAssignedException } from '../exceptions/permission.exceptions';
import { AuditLogService } from '../services/audit-log.service';
import { Request } from 'express';

/**
 * 角色权限守卫
 * 
 * 执行逻辑：
 * 1. 检查是否为公共接口（@Public装饰器），如果是则跳过验证
 * 2. 检查是否设置了角色要求（@Roles装饰器），如果没有则只需身份认证
 * 3. 验证用户是否拥有所需的角色权限
 * 
 * 注意：此守卫应该在JwtAuthGuard之后执行，确保用户已经通过身份认证
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(AuditLogService) private auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 检查是否为公共接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // 公共接口，跳过所有验证
    }

    // 2. 获取所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // 无角色要求，只需通过身份认证即可
    }

    // 3. 获取用户信息（由JwtAuthGuard注入）
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserWithRoles;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 4. 验证用户角色
    return await this.validateUserRoles(user, requiredRoles, request);
  }

  /**
   * 验证用户是否拥有所需角色
   * @param user 用户对象
   * @param requiredRoles 所需角色列表
   * @param request 请求对象
   * @returns 是否有权限
   */
  private async validateUserRoles(user: UserWithRoles, requiredRoles: string[], request: Request): Promise<boolean> {
    // 从JWT载荷中获取用户角色（性能优化）
    const userRoles = user.roles || [];

    if (!Array.isArray(userRoles) || userRoles.length === 0) {
      // 记录审计日志
      await this.auditLogService.logPermissionDenied(
        user.id,
        requiredRoles,
        [],
        request.path,
        request,
      );
      throw new NoRolesAssignedException(user.id);
    }

    // 检查用户是否拥有任一所需角色
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role.toUpperCase())
    );

    if (!hasRequiredRole) {
      // 记录权限拒绝审计日志
      await this.auditLogService.logPermissionDenied(
        user.id,
        requiredRoles,
        userRoles,
        request.path,
        request,
      );
      throw new InsufficientPermissionException(requiredRoles, userRoles, request.path);
    }

    // 记录权限授予审计日志
    await this.auditLogService.logAccessGranted(
      user.id,
      userRoles,
      request.path,
      request,
    );

    return true;
  }
}
