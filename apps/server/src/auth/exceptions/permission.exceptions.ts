import { ForbiddenException } from '@nestjs/common';

/**
 * 权限不足异常
 * 当用户没有访问特定资源所需的角色时抛出
 */
export class InsufficientPermissionException extends ForbiddenException {
  constructor(
    requiredRoles: string[],
    userRoles: string[],
    resource?: string,
  ) {
    const message = `Access denied. Required roles: ${requiredRoles.join(', ')}. User roles: ${userRoles.join(', ')}.${
      resource ? ` Resource: ${resource}` : ''
    }`;
    
    super({
      message,
      error: 'INSUFFICIENT_PERMISSION',
      details: {
        requiredRoles,
        userRoles,
        resource,
      },
    });
  }
}

/**
 * 角色未分配异常
 * 当用户没有任何角色时抛出
 */
export class NoRolesAssignedException extends ForbiddenException {
  constructor(userId: string) {
    super({
      message: 'User has no roles assigned. Please contact administrator.',
      error: 'NO_ROLES_ASSIGNED',
      details: {
        userId,
      },
    });
  }
}

/**
 * 无效角色异常
 * 当尝试分配不存在的角色时抛出
 */
export class InvalidRoleException extends ForbiddenException {
  constructor(roleName: string) {
    super({
      message: `Invalid role: ${roleName}`,
      error: 'INVALID_ROLE',
      details: {
        roleName,
      },
    });
  }
}
