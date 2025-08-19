# 技术方案设计 - RBAC权限体系

## 架构概览

基于现有的NestJS + JWT认证架构，扩展实现RBAC权限控制系统。采用数据库存储角色关系，JWT缓存角色信息的混合架构，平衡性能与实时性。

## 技术栈

### 现有技术栈
- **框架**: NestJS + TypeScript
- **数据库**: PostgreSQL + TypeORM
- **认证**: Passport + JWT
- **缓存**: Redis (验证码、限流)
- **验证**: class-validator + class-transformer

### 新增技术组件
- **权限控制**: 自定义Guards + Decorators
- **元数据反射**: NestJS Reflector
- **多对多关系**: TypeORM Many-to-Many

## 数据库设计

### 1. 角色实体 (Role Entity)
```typescript
// src/auth/entities/role.entity.ts
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  name: string; // USER, ADMIN, MODERATOR 等

  @Column({ length: 200, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany(() => User, user => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. 用户-角色关联表
```sql
-- TypeORM 自动生成的中间表
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

### 3. 用户实体扩展
```typescript
// 在现有 User Entity 中添加
@ManyToMany(() => Role, role => role.users)
@JoinTable({
  name: 'user_roles',
  joinColumn: { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
})
roles: Role[];
```

## 权限控制架构

### 1. JWT载荷扩展
```typescript
// 扩展现有 JwtPayload 接口
export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  username: string;
  roles: string[]; // 新增角色信息
  iat?: number;
  exp?: number;
}
```

### 2. 角色守卫 (RolesGuard)
```mermaid
flowchart TD
    A[请求到达] --> B[JwtAuthGuard验证身份]
    B --> C{是否标记@Public?}
    C -->|是| D[跳过所有验证]
    C -->|否| E[RolesGuard执行]
    E --> F{是否标记@Roles?}
    F -->|否| G[只需身份认证]
    F -->|是| H[检查用户角色]
    H --> I{用户拥有所需角色?}
    I -->|是| J[允许访问]
    I -->|否| K[403 Forbidden]
    
    D --> L[执行控制器方法]
    G --> L
    J --> L
    K --> M[返回错误响应]
```

### 3. 装饰器设计
```typescript
// 角色装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 公共接口装饰器
export const Public = () => SetMetadata('isPublic', true);
```

## 模块组织架构

### 1. Auth模块扩展
```
src/auth/
├── entities/
│   ├── role.entity.ts           # 新增
│   ├── audit-log.entity.ts      # 现有
│   └── ...
├── guards/
│   ├── roles.guard.ts           # 新增
│   ├── jwt-auth.guard.ts        # 现有
│   └── ...
├── decorators/
│   ├── roles.decorator.ts       # 新增
│   ├── public.decorator.ts      # 完善现有
│   └── ...
├── services/
│   ├── role.service.ts          # 新增
│   └── ...
└── dto/
    ├── role.dto.ts              # 新增
    └── ...
```

### 2. 权限模块 (新增)
```
src/rbac/
├── rbac.module.ts
├── services/
│   ├── permission.service.ts
│   └── rbac.service.ts
├── guards/
│   └── permission.guard.ts
└── interfaces/
    └── rbac.interface.ts
```

## 核心服务设计

### 1. 角色服务 (RoleService)
```typescript
@Injectable()
export class RoleService {
  // 角色CRUD操作
  async createRole(createRoleDto: CreateRoleDto): Promise<Role>
  async findAllRoles(): Promise<Role[]>
  async findRoleByName(name: string): Promise<Role>
  
  // 用户角色管理
  async assignRolesToUser(userId: string, roleNames: string[]): Promise<void>
  async removeRolesFromUser(userId: string, roleNames: string[]): Promise<void>
  async getUserRoles(userId: string): Promise<Role[]>
  
  // 系统初始化
  async initializeDefaultRoles(): Promise<void>
}
```

### 2. 认证服务扩展 (AuthService)
```typescript
// 扩展现有方法
private async generateTokens(user: User): Promise<LoginTokens> {
  const roles = await this.roleService.getUserRoles(user.id);
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    roles: roles.map(role => role.name), // 包含角色信息
  };
  // ... 生成token逻辑
}
```

## 守卫执行流程

### 1. 组合守卫配置
```typescript
// app.module.ts 全局守卫配置
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
},
{
  provide: APP_GUARD,
  useClass: RolesGuard,
},
```

### 2. 执行顺序
1. **JwtAuthGuard**: 验证JWT令牌，提取用户信息
2. **RolesGuard**: 检查@Public装饰器，如果没有则验证@Roles要求

### 3. 角色验证逻辑
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. 检查是否为公共接口
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. 获取所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // 无角色要求，只需认证

    // 3. 验证用户角色
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

## API接口设计

### 1. 角色管理接口
```typescript
@Controller('admin/roles')
@Roles('ADMIN')
export class RoleController {
  @Get()
  async findAll(): Promise<IResponseBody<Role[]>>
  
  @Post()
  async create(@Body() createRoleDto: CreateRoleDto): Promise<IResponseBody<Role>>
  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto)
}
```

### 2. 用户角色管理接口
```typescript
@Controller('admin/users')
@Roles('ADMIN')
export class AdminUserController {
  @Post(':id/roles')
  async assignRoles(@Param('id') userId: string, @Body() { roles }: AssignRolesDto)
  
  @Delete(':id/roles')
  async removeRoles(@Param('id') userId: string, @Body() { roles }: RemoveRolesDto)
}
```

## 安全策略

### 1. 权限验证
- JWT中的角色信息用于快速验证
- 敏感操作时查询数据库确保实时性
- 角色变更后强制用户重新登录

### 2. 审计日志扩展
```typescript
// 新增权限相关审计事件
export enum AuditEventType {
  // ... 现有事件
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_DENIED = 'permission_denied',
}
```

### 3. 防护机制
- 防止权限提升攻击
- 角色分配操作需要管理员权限
- 系统角色不可删除或修改

## 性能优化

### 1. 缓存策略
- JWT中缓存用户角色，减少数据库查询
- Redis缓存角色权限映射关系
- 用户角色变更时清除相关缓存

### 2. 数据库优化
- 用户-角色关联表添加索引
- 角色查询使用联合索引
- 批量角色操作使用事务

## 测试策略

### 1. 单元测试
- RolesGuard的各种场景测试
- RoleService的CRUD操作测试
- 装饰器的元数据设置测试

### 2. 集成测试
- 不同角色用户的接口访问测试
- 权限边界测试
- 角色变更后的权限验证测试

### 3. E2E测试
- 完整的用户注册-角色分配-权限验证流程
- 管理员角色管理操作流程
- 异常场景的错误处理测试

## 部署和迁移

### 1. 数据库迁移
```sql
-- 创建角色表
-- 创建用户-角色关联表
-- 插入默认角色数据
-- 为现有用户分配默认角色
```

### 2. 向后兼容
- 现有API保持兼容
- 渐进式添加角色要求
- 默认为所有现有用户分配USER角色

## 监控和维护

### 1. 权限使用监控
- 各角色的API访问统计
- 权限拒绝事件监控
- 异常权限操作告警

### 2. 角色管理
- 定期审查用户角色分配
- 清理无效或过期的角色关系
- 角色权限变更的影响分析
