# 仓库结构

本项目为 monorepo 仓库，主要分为 `packages` 和 `apps` 两大部分：

## apps

存放各个独立的应用程序：

- `apps/web`：前端 Web 应用，基于 Next.js。
- `apps/pc`：基于 Electron 的桌面端应用。
- `apps/server`：后端服务，基于 NestJS。

## packages

存放可复用的包和工具：

- `packages/ui`：通用 UI 组件库，供各应用复用。
- `packages/eslint-config`：统一的 ESLint 配置。
- `packages/typescript-config`：统一的 TypeScript 配置。

各子项目均有独立的 `README.md` 及配置文件，具体使用和开发请参考对应目录下的文档。

# shadcn/ui 使用说明

本模板用于使用 shadcn/ui 创建一个单体仓库（monorepo）。

## 使用方法

```bash
pnpm dlx shadcn@latest init
```

## 添加组件

要向应用中添加组件，在 `web` 应用的根目录下运行以下命令：

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

这会将 UI 组件放在 `packages/ui/src/components` 目录下。

## Tailwind

你的 `tailwind.config.ts` 和 `globals.css` 已经配置好，可以直接使用 `ui` 包中的组件。

## 使用组件

要在你的应用中使用这些组件，只需从 `ui` 包中导入即可。

```tsx
import { Button } from "@workspace/ui/components/button";
```
