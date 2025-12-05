# BotShop

基于 Cloudflare Worker 的全栈虚拟商品商城，支持 Telegram Bot 和 H5 页面访问。

> **📢 重要提示**: 本项目已完成重构，用户端和管理后台已分离为独立项目。
> 
> - **首次使用**: 请查看 [快速开始指南](./GETTING_STARTED.md)
> - **部署配置**: 详细的部署说明请参考 [部署文档](./DEPLOYMENT.md)

## 项目结构

```
botshop/
├── web/                    # 用户端商城（Vue 3 + Vite）
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── admin-web/              # 管理后台（Vue 3 + Vite）
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── worker/                 # Cloudflare Worker 服务端
│   ├── src/
│   ├── public/            # 编译后的前端静态资源
│   ├── migrations/        # 数据库迁移
│   ├── scripts/           # 构建脚本
│   ├── package.json
│   └── wrangler.jsonc     # Cloudflare Worker 配置
│
├── package.json           # 根目录工作区脚本
├── DEPLOYMENT.md          # 部署文档
└── README.md              # 本文件
```

## 技术栈

### 前端
- **用户端**: Vue 3 + TypeScript + Vite + Naive UI + Tailwind CSS
- **管理端**: Vue 3 + TypeScript + Vite + Naive UI + Tailwind CSS
- **状态管理**: Pinia
- **路由**: Vue Router

### 后端
- **运行时**: Cloudflare Workers
- **框架**: Hono
- **数据库**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **存储**: Cloudflare KV + R2
- **API**: RESTful API

## 快速开始

### 1. 安装依赖

```bash
# 安装所有项目的依赖
npm run install:all

# 或分别安装
npm install --prefix web
npm install --prefix admin-web
npm install --prefix worker
```

### 2. 本地开发

```bash
# 启动用户端开发服务器 (http://localhost:5173)
npm run dev:shop

# 启动管理后台开发服务器 (http://localhost:5174)
npm run dev:admin

# 启动 Worker 开发服务器 (http://localhost:8787)
npm run dev:worker
```

### 3. 构建

```bash
# 构建所有前端项目
npm run build:all

# 或分别构建
npm run build:shop    # 构建用户端
npm run build:admin   # 构建管理后台
```

### 4. 部署

```bash
# 构建并部署到 Cloudflare
npm run deploy
```

## 域名配置

### 推荐方案：子域名分离

- **用户商城**: `https://www.your-domain.com` 或 `https://shop.your-domain.com`
- **管理后台**: `https://admin.your-domain.com`

详细配置请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### Cloudflare DNS 设置

在 Cloudflare Dashboard 中添加 DNS 记录：

```
类型   名称    目标           代理状态
A      www     192.0.2.1     已代理（橙色云朵）
A      admin   192.0.2.1     已代理（橙色云朵）
```

### Worker 路由

在 `wrangler.jsonc` 中配置或在 Cloudflare Dashboard 中设置路由：

```
www.your-domain.com/*   -> botshop worker
admin.your-domain.com/* -> botshop worker
```

## 项目特性

### 用户端功能
- ✅ 商品浏览和分类
- ✅ 用户注册和登录
- ✅ 购物车和订单管理
- ✅ Telegram WebApp 集成
- ✅ 响应式设计

### 管理后台功能
- ✅ 商品管理（CRUD）
- ✅ 分类管理
- ✅ 订单管理
- ✅ 用户管理
- ✅ 权限管理（RBAC）
- ✅ 菜单配置
- ✅ 数据统计

### 后端功能
- ✅ RESTful API
- ✅ JWT 认证
- ✅ 权限控制
- ✅ Telegram Bot 集成
- ✅ 文件上传 (R2)
- ✅ 缓存 (KV)
- ✅ 国际化支持

## 环境变量

在 `worker/wrangler.jsonc` 中配置：

```jsonc
{
  "vars": {
    "BASE_URL": "https://www.your-domain.com",
    "ADMIN_URL": "https://admin.your-domain.com",
    "TELEGRAM_BOT_TOKEN": "your-bot-token",
    "JWT_ADMIN_SECRET": "your-admin-secret",
    "JWT_USER_SECRET": "your-user-secret"
  }
}
```

敏感信息请使用 Cloudflare Secrets:

```bash
cd worker
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put JWT_ADMIN_SECRET
wrangler secret put JWT_USER_SECRET
```

## 数据库迁移

```bash
cd worker

# 创建迁移
npx wrangler d1 migrations create botshop <migration-name>

# 应用迁移（本地）
npx wrangler d1 migrations apply botshop --local

# 应用迁移（远程）
npx wrangler d1 migrations apply botshop --remote
```

## 开发命令

### 根目录（推荐）

```bash
npm run install:all    # 安装所有依赖
npm run dev:shop       # 启动用户端开发
npm run dev:admin      # 启动管理后台开发
npm run dev:worker     # 启动 Worker 开发
npm run build:shop     # 构建用户端
npm run build:admin    # 构建管理后台
npm run build:all      # 构建所有前端
npm run deploy         # 构建并部署
```

### Worker 目录

```bash
cd worker
npm run dev            # 启动开发服务器
npm run build:shop     # 构建用户端
npm run build:admin    # 构建管理后台
npm run build:web      # 构建所有前端
npm run sync:assets    # 同步前端资源到 public
npm run build:assets   # 构建并同步
npm run deploy         # 部署到 Cloudflare
```

## 目录说明

### web/ (用户端商城)
- `src/api/` - API 客户端
- `src/components/` - Vue 组件
- `src/router/` - 路由配置
- `src/stores/` - Pinia 状态管理
- `src/views/` - 页面组件
- `src/types/` - TypeScript 类型定义

### admin-web/ (管理后台)
- `src/api/` - API 客户端
- `src/components/` - Vue 组件
- `src/router/` - 路由配置
- `src/stores/` - Pinia 状态管理
- `src/views/` - 页面组件
- `src/types/` - TypeScript 类型定义
- `src/constants/` - 常量定义

### worker/ (服务端)
- `src/routes/` - API 路由
- `src/services/` - 业务逻辑
- `src/db/` - 数据库 Schema
- `src/utils/` - 工具函数
- `src/enum/` - 枚举定义
- `src/i18n/` - 国际化
- `migrations/` - 数据库迁移
- `public/` - 静态资源（自动生成）

## 许可证

[LICENSE](./LICENSE)

## 文档

- [部署文档](./DEPLOYMENT.md) - 详细的部署配置说明
- [用户端 README](./web/README.md)
- [管理后台 README](./admin-web/README.md)
- [Worker README](./worker/README.md)
