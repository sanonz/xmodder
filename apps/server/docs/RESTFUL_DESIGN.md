# 🚀 RESTful API 设计规范

## API 设计原则

### 1. 资源导向设计
- 使用名词而不是动词来表示资源
- 资源应该是可数名词的复数形式
- 使用嵌套资源表示层次关系

### 2. HTTP 方法语义
- `GET`: 获取资源
- `POST`: 创建资源
- `PUT`: 完整替换资源
- `PATCH`: 部分更新资源
- `DELETE`: 删除资源

### 3. 状态码规范
- `200 OK`: 成功
- `201 Created`: 创建成功
- `204 No Content`: 删除成功
- `400 Bad Request`: 请求错误
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `409 Conflict`: 资源冲突
- `429 Too Many Requests`: 频率限制
- `500 Internal Server Error`: 服务器错误


## 响应格式标准

### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功消息"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [
    // 数据数组
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": ["error message"]
    }
  }
}
```

### 响应 TypeScript 定义文件
- `src/types/response.ts`

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
  "message": "User account created successfully",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## RESTful 设计优势

1. **直观易懂**: 资源路径清晰表达了操作对象
2. **标准化**: 遵循HTTP协议语义，易于理解和使用
3. **可扩展**: 资源嵌套结构便于功能扩展
4. **缓存友好**: GET请求可以被有效缓存
5. **无状态**: 每个请求都包含完整的操作信息
6. **统一接口**: 使用标准HTTP方法，降低学习成本
