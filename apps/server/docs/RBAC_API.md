# RBAC API 文档

## 概述

本文档描述了基于角色的访问控制 (RBAC) 系统的 API 端点。系统支持用户-角色多对多关系，提供完整的权限管理功能。

## 认证

所有管理接口都需要 Bearer Token 认证，且要求具有 `ADMIN` 角色权限。

```
Authorization: Bearer <jwt_token>
```

## 角色管理 API

### 1. 获取所有角色

**GET** `/admin/roles`

获取系统中的所有角色列表。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "USER",
      "description": "普通用户角色，可以访问前台接口",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-2", 
      "name": "ADMIN",
      "description": "管理员角色，拥有所有权限",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. 获取激活角色

**GET** `/admin/roles/active`

获取所有激活状态的角色。

### 3. 获取角色统计

**GET** `/admin/roles/statistics`

获取角色使用统计信息。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalRoles": 3,
    "activeRoles": 3,
    "inactiveRoles": 0,
    "roleUsage": [
      {
        "roleName": "USER",
        "userCount": 150
      },
      {
        "roleName": "ADMIN", 
        "userCount": 2
      }
    ]
  }
}
```

### 4. 获取单个角色

**GET** `/admin/roles/:id`

通过 ID 获取特定角色的详细信息。

### 5. 创建角色

**POST** `/admin/roles`

创建新的角色。

**请求体：**
```json
{
  "name": "MODERATOR",
  "description": "版主角色，负责内容审核",
  "isActive": true
}
```

### 6. 更新角色

**PUT** `/admin/roles/:id`

更新现有角色信息。

**请求体：**
```json
{
  "name": "MODERATOR",
  "description": "更新后的版主角色描述",
  "isActive": true
}
```

### 7. 删除角色

**DELETE** `/admin/roles/:id`

删除指定角色。系统角色（USER、ADMIN）受保护，无法删除。

## 用户角色管理 API

### 1. 获取用户角色

**GET** `/admin/users/:userId/roles`

获取指定用户的所有角色。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "USER",
      "description": "普通用户角色，可以访问前台接口",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. 分配角色给用户

**POST** `/admin/users/:userId/roles`

为用户分配新的角色。

**请求体：**
```json
{
  "roles": ["MODERATOR", "EDITOR"]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "Roles assigned successfully",
  "data": {
    "userId": "user-uuid",
    "assignedRoles": ["MODERATOR"],
    "currentRoles": ["USER", "MODERATOR"]
  }
}
```

### 3. 移除用户角色

**DELETE** `/admin/users/:userId/roles`

从用户移除指定角色。

**请求体：**
```json
{
  "roles": ["MODERATOR"]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "Roles removed successfully", 
  "data": {
    "userId": "user-uuid",
    "removedRoles": ["MODERATOR"],
    "currentRoles": ["USER"]
  }
}
```

### 4. 批量更新用户角色

**POST** `/admin/users/:userId/roles/batch`

同时分配和移除用户角色。

**请求体：**
```json
{
  "assignRoles": ["MODERATOR", "EDITOR"],
  "removeRoles": ["GUEST"]
}
```

### 5. 获取所有用户及其角色

**GET** `/admin/users`

获取系统中所有用户及其角色信息。

## 审计日志 API

### 1. 获取审计日志

**GET** `/admin/audit-logs`

获取系统审计日志，支持分页和过滤。

**查询参数：**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `eventType`: 事件类型过滤
- `userId`: 用户ID过滤
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应示例：**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "eventType": "PERMISSION_GRANTED",
        "userId": "user-uuid",
        "details": {
          "action": "access",
          "resource": "/admin/roles",
          "userRoles": ["ADMIN"]
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 2. 获取审计日志统计

**GET** `/admin/audit-logs/statistics`

获取审计日志的统计信息。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalLogs": 1000,
    "eventTypeCounts": {
      "PERMISSION_GRANTED": 800,
      "PERMISSION_DENIED": 150,
      "ROLE_ASSIGNED": 30,
      "ROLE_REMOVED": 20
    },
    "recentActivity": {
      "last24Hours": 120,
      "last7Days": 450
    }
  }
}
```

## 错误响应

### 权限不足错误

**状态码：** 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "Insufficient permission to access this resource",
    "context": {
      "requiredRoles": ["ADMIN"],
      "userRoles": ["USER"],
      "resource": "/admin/roles"
    }
  }
}
```

### 用户无角色错误

**状态码：** 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "NO_ROLES_ASSIGNED",
    "message": "User has no roles assigned",
    "context": {
      "userId": "user-uuid",
      "action": "access_admin_panel"
    }
  }
}
```

### 系统角色保护错误

**状态码：** 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_ROLE_PROTECTED",
    "message": "Cannot modify system role",
    "context": {
      "roleName": "ADMIN",
      "operation": "delete"
    }
  }
}
```

## 权限装饰器

### @Roles 装饰器

在控制器方法上使用 `@Roles` 装饰器来指定所需角色：

```typescript
import { Roles } from '../auth/decorators';

@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @Roles('ADMIN', 'MODERATOR')
  getDashboard() {
    // 只有 ADMIN 或 MODERATOR 角色可以访问
  }
}
```

### @Public 装饰器

使用 `@Public` 装饰器标记公开接口，跳过认证和授权：

```typescript
import { Public } from '../auth/decorators';

@Controller('public')
export class PublicController {
  @Get('info')
  @Public()
  getPublicInfo() {
    // 无需认证即可访问
  }
}
```

## 安全考虑

1. **JWT 缓存角色**：用户角色信息缓存在 JWT 中，避免每次请求都查询数据库
2. **系统角色保护**：USER 和 ADMIN 角色受到特殊保护，无法删除或重命名
3. **审计日志**：所有权限相关操作都会被记录在审计日志中
4. **最小权限原则**：用户只能访问其角色允许的资源
5. **角色验证**：分配角色前会验证角色是否存在且处于激活状态

## 系统角色

系统预定义了两个基础角色：

- **USER**：普通用户角色，新注册用户默认角色
- **ADMIN**：管理员角色，拥有所有管理权限

这些角色受到系统保护，无法删除或重命名。
