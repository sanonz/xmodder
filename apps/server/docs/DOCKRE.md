# Docker 部署指南

本项目包含了完整的 Docker 和 Docker Compose 配置，支持 NestJS 应用和 PostgreSQL 数据库的部署。

## 文件说明

- `docker-compose.yml` - 生产环境配置
- `Dockerfile` - 生产环境镜像构建
- `.env.example` - 环境变量配置

## 快速开始

### 开发环境

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置（特别是数据库密码）

3. 启动开发环境：
```bash
docker-compose -f docker-compose.yml up -d
```

4. 查看日志：
```bash
docker-compose -f docker-compose.yml logs -f
```

### 生产环境

1. 构建并启动服务：
```bash
docker-compose up -d
```

2. 查看服务状态：
```bash
docker-compose ps
```

3. 查看日志：
```bash
docker-compose logs -f nestjs-app
```

## 服务说明

### NestJS 应用
- **端口**: 3000 (可通过 APP_PORT 环境变量修改)
- **健康检查**: 自动重启
- **日志**: Docker 日志输出

### PostgreSQL 数据库
- **端口**: 5432
- **默认数据库**: xmodder
- **默认用户**: postgres
- **数据持久化**: Docker 卷挂载
- **健康检查**: 包含数据库连接检查

### Redis (可选)
- **端口**: 6379
- **用途**: 缓存和会话存储
- **数据持久化**: AOF 持久化

## 常用命令

### 开发环境

```bash
# 启动所有服务
docker-compose -f docker-compose.yml up -d

# 重新构建并启动
docker-compose -f docker-compose.yml up --build -d

# 停止所有服务
docker-compose -f docker-compose.yml down

# 停止并删除数据卷
docker-compose -f docker-compose.yml down -v

# 查看实时日志
docker-compose -f docker-compose.yml logs -f nestjs

# 进入容器调试
docker exec -it xmodder-nestjs sh
```

### 生产环境

```bash
# 启动所有服务
docker-compose up -d

# 重新构建并启动
docker-compose up --build -d

# 停止所有服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f nestjs-app

# 更新应用（不停机）
docker-compose up -d --no-deps nestjs-app
```

### 数据库操作

```bash
# 连接到 PostgreSQL
docker exec -it xmodder-postgres psql -U postgres -d xmodder

# 备份数据库
docker exec xmodder-postgres pg_dump -U postgres xmodder > backup.sql

# 恢复数据库
docker exec -i xmodder-postgres psql -U postgres -d xmodder < backup.sql
```

## 故障排除

### 常见问题

1. **端口被占用**
   - 修改 `.env` 文件中的端口配置
   - 或停止占用端口的其他服务

2. **数据库连接失败**
   - 检查数据库服务是否正常启动
   - 验证环境变量配置
   - 查看数据库日志：`docker-compose logs postgres`

3. **应用启动失败**
   - 查看应用日志：`docker-compose logs nestjs-app`
   - 检查依赖是否正确安装
   - 验证环境变量配置

4. **数据持久化问题**
   - 确保 Docker 卷正确挂载
   - 检查文件系统权限

### 清理资源

```bash
# 停止并删除所有容器、网络
docker-compose down

# 删除未使用的镜像
docker image prune

# 删除未使用的卷
docker volume prune

# 完全清理（谨慎使用）
docker system prune -a
```

## 监控和日志

### 查看资源使用情况
```bash
docker stats
```

### 查看容器详细信息
```bash
docker inspect xmodder-nestjs
```

### 导出日志
```bash
docker-compose logs --no-color > app.log
```

## 安全注意事项

1. **修改默认密码**: 生产环境务必修改数据库默认密码
2. **环境变量管理**: 不要将 `.env` 文件提交到版本控制
3. **网络安全**: 生产环境建议配置防火墙规则
4. **定期更新**: 定期更新基础镜像和依赖包
5. **备份策略**: 建立定期数据备份机制
