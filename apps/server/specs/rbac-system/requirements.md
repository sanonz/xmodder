# 需求文档 - RBAC权限体系

## 介绍
为XModder游戏修改器服务实现基于角色的访问控制（RBAC）权限体系，在现有JWT认证基础上增加细粒度的权限控制，支持多种用户类型的分层权限管理，确保系统安全性和可维护性。

## 需求

### 需求 1 - 角色定义和管理
**用户故事：** 作为系统管理员，我需要定义和管理系统中的用户角色，以便对不同类型的用户进行权限分层。

#### 验收标准
1. When 系统初始化时，the system shall 预定义USER（普通用户）和ADMIN（管理员）两种基础角色。
2. When 定义新角色时，the system shall 支持为角色设置名称、描述和权限标识。
3. When 查询角色列表时，the system shall 返回所有可用角色及其详细信息。
4. When 用户被分配角色时，the system shall 支持用户拥有多个角色的场景。

### 需求 2 - 用户实体角色集成
**用户故事：** 作为系统架构师，我需要在现有用户实体中集成角色信息，以便用户可以拥有一个或多个角色。

#### 验收标准
1. When 用户注册时，the system shall 自动为用户分配USER角色作为默认角色。
2. When 管理员修改用户角色时，the system shall 支持为用户分配多个角色。
3. When 查询用户信息时，the system shall 包含用户的所有角色信息。
4. When 用户被删除时，the system shall 同时清理用户的角色关联关系。

### 需求 3 - JWT令牌角色集成
**用户故事：** 作为开发人员，我需要在JWT令牌中包含用户角色信息，以便在每次请求时快速进行权限验证，避免频繁查询数据库。

#### 验收标准
1. When 用户登录成功时，the system shall 在JWT载荷中包含用户的所有角色信息。
2. When JWT令牌被解析时，the system shall 能够提取用户的角色信息用于权限验证。
3. When 用户角色发生变化时，the system shall 在下次登录时更新JWT中的角色信息。
4. When JWT令牌过期刷新时，the system shall 重新获取用户最新的角色信息。

### 需求 4 - 角色守卫实现
**用户故事：** 作为API开发者，我需要一个角色守卫来自动验证用户是否有权访问特定接口，以便实现细粒度的权限控制。

#### 验收标准
1. When 请求到达需要角色验证的端点时，the system shall 自动检查用户的角色权限。
2. When 用户拥有所需角色中的任一角色时，the system shall 允许访问该接口。
3. When 用户不具备所需角色时，the system shall 返回403 Forbidden错误。
4. When 接口未标记角色要求时，the system shall 跳过角色验证（仅进行身份认证）。

### 需求 5 - 角色装饰器
**用户故事：** 作为API开发者，我需要一个简洁的装饰器来标记接口所需的角色，以便快速配置接口权限。

#### 验收标准
1. When 在控制器方法上使用@Roles装饰器时，the system shall 记录该接口所需的角色信息。
2. When 指定单个角色时，the system shall 支持@Roles('ADMIN')语法。
3. When 指定多个角色时，the system shall 支持@Roles('ADMIN', 'MODERATOR')语法。
4. When 装饰器参数为空时，the system shall 跳过角色验证。

### 需求 6 - 公共接口支持
**用户故事：** 作为API开发者，我需要能够标记某些接口为公共接口，以便这些接口无需任何认证和鉴权即可访问。

#### 验收标准
1. When 在控制器方法上使用@Public装饰器时，the system shall 跳过所有认证和权限验证。
2. When 公共接口被访问时，the system shall 直接执行业务逻辑而不进行用户身份检查。
3. When 公共接口和@Roles装饰器同时存在时，the system shall 优先处理@Public装饰器。
4. When 登录、注册等接口被标记为公共时，the system shall 正常提供服务。

### 需求 7 - 权限异常处理
**用户故事：** 作为前端开发者，我需要当用户权限不足时收到标准化的错误响应，以便向用户展示恰当的错误信息。

#### 验收标准
1. When 用户未登录访问需要认证的接口时，the system shall 返回401 Unauthorized错误。
2. When 用户已登录但角色权限不足时，the system shall 返回403 Forbidden错误。
3. When 权限验证失败时，the system shall 返回符合IResponseBody格式的错误响应。
4. When 发生权限异常时，the system shall 记录详细的审计日志。

### 需求 8 - 角色权限审计
**用户故事：** 作为安全管理员，我需要完整的权限操作审计日志，以便追踪和分析系统的权限使用情况。

#### 验收标准
1. When 用户角色发生变更时，the system shall 记录角色变更的审计日志。
2. When 权限验证失败时，the system shall 记录失败原因和相关上下文信息。
3. When 查询审计日志时，the system shall 支持按用户、角色、时间等维度进行筛选。
4. When 生成审计报告时，the system shall 包含权限使用统计和异常行为分析。

### 需求 9 - 管理员接口
**用户故事：** 作为系统管理员，我需要管理用户角色的REST API接口，以便对系统用户进行权限管理。

#### 验收标准
1. When 管理员查询用户列表时，the system shall 返回包含角色信息的用户数据。
2. When 管理员修改用户角色时，the system shall 支持批量添加或移除用户角色。
3. When 管理员查询角色统计时，the system shall 返回各角色的用户数量统计。
4. When 管理员操作用户角色时，the system shall 验证操作者具有ADMIN角色权限。

### 需求 10 - 测试覆盖
**用户故事：** 作为质量保证工程师，我需要完整的测试用例来验证RBAC系统的各项功能，以便确保系统的稳定性和安全性。

#### 验收标准
1. When 运行单元测试时，the system shall 覆盖角色守卫、装饰器和服务的所有分支逻辑。
2. When 运行E2E测试时，the system shall 验证不同角色用户访问不同接口的完整流程。
3. When 测试权限边界时，the system shall 验证权限提升攻击的防护能力。
4. When 测试并发场景时，the system shall 确保角色验证的线程安全性。
