# 🔐 用户认证系统 API

基于 NestJS 构建的完整用户认证体系，支持邮箱/手机号登录、JWT 令牌管理、验证码验证和全面的会话管理等功能。

## ✨ 功能特性

### 🚀 核心功能
- **多种登录方式**：支持邮箱+密码、手机号+密码、手机号+验证码登录
- **用户注册**：支持邮箱和手机号注册，字段验证
- **JWT 认证**：短期 Access Token (15分钟) + 长期 Refresh Token (7天)
- **令牌轮换**：自动刷新令牌，增强安全性
- **验证码系统**：支持登录、注册、重置密码等多种用途
- **会话管理**：支持多设备登录，可单独撤销会话

### 🔒 安全特性
- **密码哈希**：使用 Argon2id 算法，内存成本 64MB，时间成本 3
- **验证码安全**：哈希存储，支持过期时间和重试次数限制
- **数据标准化**：邮箱小写化去空格，手机号 E.164 格式
- **频率限制**：API 限流，验证码发送频率控制
- **审计日志**：完整的操作日志记录，支持安全分析

### 📊 数据管理
- **用户实体**：支持邮箱、手机号、用户名等多种标识
- **软删除**：数据安全删除，支持恢复
- **账号状态**：支持启用/禁用账号
- **验证状态**：邮箱和手机号独立验证状态

## 🏗️ 技术架构

### 技术栈
- **框架**：NestJS + TypeScript
- **数据库**：PostgreSQL + TypeORM
- **缓存**：Redis (用于验证码和限流)
- **认证**：Passport + JWT
- **验证**：class-validator + class-transformer
- **文档**：Swagger/OpenAPI
- **密码学**：Argon2id

### 项目结构
```
src/
├── auth/                 # 认证模块
├── user/                 # 用户模块
├── common/               # 通用模块
│   ├── services/         # 通用服务
│   └── utils/            # 工具函数
└── main.ts               # 应用入口
```

## 🚀 快速开始

### 环境配置
复制 `.env.example` 文件并配置：

```env
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

### 访问服务
- **API 根路径**：http://localhost:3000/api/v1
- **API 文档**：http://localhost:3000/api/docs

## 📚 API 文档

## API 路由设计

### 用户资源 (`/api/v1/users`)

```
POST   /api/v1/users              # 创建用户账户（注册）
GET    /api/v1/users              # 获取用户列表（管理员）
GET    /api/v1/users/:userId      # 获取指定用户（管理员）
PATCH  /api/v1/users/:userId      # 更新指定用户（管理员）
DELETE /api/v1/users/:userId      # 删除指定用户（管理员）

PATCH  /api/v1/users/:userId/activate      # 激活用户账户
PATCH  /api/v1/users/:userId/deactivate    # 停用用户账户
PATCH  /api/v1/users/:userId/verify-email  # 验证用户邮箱
PATCH  /api/v1/users/:userId/verify-phone  # 验证用户手机
```

### 当前用户资源 (`/api/v1/users/me`)

```
GET    /api/v1/users/me           # 获取当前用户信息
PATCH  /api/v1/users/me           # 更新当前用户信息
PATCH  /api/v1/users/me/password  # 更新当前用户密码
```

### 用户会话资源 (`/api/v1/users/me/sessions`)

```
GET    /api/v1/users/me/sessions              # 获取当前用户的所有会话
DELETE /api/v1/users/me/sessions/:sessionId   # 删除指定会话
DELETE /api/v1/users/me/sessions              # 删除所有会话
```

### 认证会话资源 (`/api/v1/auth/sessions`)

```
POST   /api/v1/auth/sessions      # 创建认证会话（登录）
PUT    /api/v1/auth/sessions      # 刷新认证会话
DELETE /api/v1/auth/sessions      # 销毁当前认证会话（登出）
```

### 验证码资源 (`/api/v1/verification-codes`)

```
POST   /api/v1/verification-codes # 创建并发送验证码
```

### 密码重置资源 (`/api/v1/password-reset`)

```
POST   /api/v1/password-reset     # 使用验证码重置密码
```

## API 示例

### 1. 用户注册
```http
POST /api/v1/users
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+8613800138000",
  "password": "StrongPassword123!",
  "username": "john_doe",
  "nickname": "John Doe"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "john_doe",
      "nickname": "John Doe",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "expiresIn": 900
  },
  "message": "User account created successfully"
}
```

### 2. 用户登录
```http
POST /api/v1/auth/sessions
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "deviceId": "mobile-app-123"
}
```

### 3. 获取用户信息
```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 发送验证码
```http
POST /api/v1/verification-codes
Content-Type: application/json

{
  "phone": "+8613800138000",
  "purpose": "login"
}
```

### 5. 刷新令牌
```http
PUT /api/v1/auth/sessions
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "mobile-app-123"
}
```

### 6. 获取用户会话
```http
GET /api/v1/users/me/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. 登出
```http
DELETE /api/v1/auth/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "deviceId": "mobile-app-123"
}
```

## 🧪 测试

### 认证测试
测试受保护的端点时，始终使用适当的 JWT 令牌并遵循会话生命周期（登录 → 使用令牌 → 刷新令牌 → 登出）。

### 单元测试
```bash
npm run test
```

### 端到端测试
```bash
npm run test:e2e
```

## 🔧 开发指南

### 添加新的验证码用途
1. 在 `VerificationCodePurpose` 枚举中添加新用途
2. 在业务逻辑中处理新用途的验证
3. 更新API文档

### 扩展用户字段
1. 修改 `User` 实体
2. 更新相关的 DTO
3. 添加数据库迁移
4. 更新业务逻辑

### 集成第三方登录
1. 安装相应的 Passport 策略
2. 创建新的策略文件
3. 在认证模块中注册策略
4. 添加相应的控制器端点

## 📋 待办事项

- [ ] 邮件服务集成（注册确认、密码重置）
- [ ] 短信服务集成（验证码发送）
- [ ] 社交登录（微信、QQ、GitHub等）
- [ ] 二次验证（TOTP）
- [ ] 设备指纹识别
- [ ] 地理位置安全检查
- [ ] 更细粒度的权限控制
- [ ] 账号合并功能
- [ ] 数据导出功能
