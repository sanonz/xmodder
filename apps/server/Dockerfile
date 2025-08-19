# 使用 Node.js 18 Alpine 基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml（如果存在）
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建阶段
FROM base AS build

# 构建应用
RUN pnpm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装 dumb-init 用于信号处理
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package.json ./

# 仅安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "dist/main.js"]
