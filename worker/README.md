# BotShop Worker 服务端

Cloudflare Worker 驱动的虚拟商品商城后端服务，使用 [Hono](https://github.com/honojs/hono) 框架构建 RESTful API，支持 Telegram Bot 和 Web 前端访问。

## 功能特性

### 核心功能
- **RESTful API**：为用户商城和管理后台提供完整的 API 接口
- **Telegram Bot 集成**：支持通过 Telegram Bot 浏览商品、下单和查询订单
- **用户认证**：基于 JWT 的用户和管理员认证系统
- **权限管理**：RBAC 权限控制，支持角色和菜单管理
- **订单管理**：完整的订单流程，支持多种订单状态
- **库存管理**：自动发货、库存扣减和补充
- **文件上传**：基于 R2 的图片和文件存储
- **缓存支持**：使用 KV 实现高效缓存

### 技术架构
- **运行时**：Cloudflare Workers
- **Web 框架**：Hono
- **数据库**：Cloudflare D1 (SQLite)
- **ORM**：Drizzle ORM
- **对象存储**：Cloudflare R2
- **缓存**：Cloudflare KV
- **国际化**：i18next

## 项目结构

```
worker/
├── src/
│   ├── index.ts              # Worker 入口，路由分发
│   ├── types.ts              # TypeScript 类型定义
│   ├── routes/               # API 路由
│   │   ├── index.ts          # 路由汇总
│   │   ├── hono.ts           # Hono 应用配置
│   │   ├── api/
│   │   │   ├── admin.ts      # 管理后台 API
│   │   │   ├── shop.ts       # 用户商城 API
│   │   │   └── telegram.ts   # Telegram Bot API
│   │   └── middleware/
│   │       ├── adminAuth.ts  # 管理员认证中间件
│   │       └── userAuth.ts   # 用户认证中间件
│   ├── services/             # 业务逻辑层
│   │   ├── adminAuthService.ts
│   │   ├── adminMenuService.ts
│   │   ├── adminRoleService.ts
│   │   ├── categoryService.ts
│   │   ├── orderService.ts
│   │   ├── productService.ts
│   │   ├── shopAuthService.ts
│   │   ├── telegramService.ts
│   │   └── userService.ts
│   ├── db/                   # 数据库相关
│   │   ├── index.ts          # 数据库连接
│   │   └── schema.ts         # Drizzle Schema 定义
│   ├── enum/                 # 枚举定义
│   │   ├── adminPermission.ts
│   │   ├── apiCodes.ts
│   │   ├── cacheKey.ts
│   │   └── user.ts
│   ├── constants/            # 常量定义
│   │   ├── adminMenus.ts     # 默认菜单配置
│   │   └── apiCodes.ts       # API 响应码
│   ├── i18n/                 # 国际化
│   │   ├── i18n.ts
│   │   ├── en.ts
│   │   └── zh.ts
│   ├── utils/                # 工具函数
│   │   ├── bizError.ts       # 业务异常
│   │   ├── cache.ts          # 缓存工具
│   │   ├── common.ts         # 通用工具
│   │   ├── jwt.ts            # JWT 工具
│   │   ├── result.ts         # 统一响应格式
│   │   └── telegramBot.ts    # Telegram Bot 工具
│   └── public/               # 静态资源（自动生成）
│       ├── index.html        # 用户端入口
│       ├── assets/           # 用户端资源
│       └── admin/            # 管理后台
│           ├── index.html    # 管理后台入口
│           └── assets/       # 管理后台资源
├── migrations/               # 数据库迁移
│   ├── 0001_init.sql
│   └── 0002_admin.sql
├── scripts/                  # 构建脚本
│   └── sync-web-dist.mjs     # 同步前端资源
├── package.json
├── wrangler.jsonc            # Cloudflare Worker 配置
└── README.md

```

## 环境要求

### Cloudflare 资源绑定

| 绑定名称 | 类型 | 用途 | 必需 |
| --- | --- | --- | --- |
| `BOTSHOP_DB` | D1 Database | 业务主数据库（用户、商品、订单等） | ✅ |
| `BOTSHOP_KV` | KV Namespace | 缓存存储（会话、临时数据等） | ✅ |
| `BOTSHOP_BUCKET` | R2 Bucket | 商品图片和媒体文件存储 | ✅ |
| `ASSETS` | Assets | 前端静态资源（自动配置） | ✅ |

### 环境变量

在 `wrangler.jsonc` 的 `vars` 中配置：

| 变量名 | 说明 | 必需 | 示例 |
| --- | --- | --- | --- |
| `BASE_URL` | 用户商城域名 | ✅ | `https://www.your-domain.com` |
| `ADMIN_URL` | 管理后台域名 | ✅ | `https://admin.your-domain.com` |
| `MEDIA_PUBLIC_BASE` | R2 媒体公开访问域名 | ✅ | `https://static.your-domain.com` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | ✅ | `123456:ABC-DEF...` |
| `TELEGRAM_SECRET_TOKEN` | Telegram Webhook 密钥 | ✅ | 自定义随机字符串 |
| `JWT_ADMIN_SECRET` | 管理员 JWT 密钥 | ✅ | 32+ 字符随机字符串 |
| `JWT_USER_SECRET` | 用户 JWT 密钥 | ✅ | 32+ 字符随机字符串 |
| `PAYMENT_WEBHOOK_SECRET` | 支付回调验证密钥 | ⭕ | 自定义随机字符串 |
| `PAYMENT_GATEWAY_URL` | 支付网关 URL | ⭕ | `https://pay.example.com` |
| `PAYMENT_API_KEY` | 支付 API 密钥 | ⭕ | 由支付网关提供 |

> **注意**：敏感信息建议使用 `wrangler secret` 命令设置，而非直接写在配置文件中。

### 前置要求

- Node.js 18+
- npm 或 pnpm
- Cloudflare 账户
- Wrangler CLI

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 Cloudflare 资源

**创建 D1 数据库**：
```bash
npx wrangler d1 create botshop
```
将返回的 `database_id` 更新到 `wrangler.jsonc` 的 `d1_databases` 配置中。

**创建 KV 命名空间**：
```bash
npx wrangler kv:namespace create BOTSHOP_KV
```
将返回的 `id` 更新到 `wrangler.jsonc` 的 `kv_namespaces` 配置中。

**创建 R2 存储桶**：
```bash
npx wrangler r2 bucket create botshop
```
将 `botshop` 更新到 `wrangler.jsonc` 的 `r2_buckets` 配置中。

### 4. 执行数据库迁移

**本地开发数据库**（使用 `--local`）：
```bash
npx wrangler d1 migrations apply botshop --local
```

**生产数据库**（使用 `--remote`）：
```bash
npx wrangler d1 migrations apply botshop --remote
```

### 5. 配置环境变量

编辑 `wrangler.jsonc`，更新 `vars` 部分：
```jsonc
{
  "vars": {
    "BASE_URL": "https://www.your-domain.com",
    "ADMIN_URL": "https://admin.your-domain.com",
    "MEDIA_PUBLIC_BASE": "https://static.your-domain.com",
    "TELEGRAM_BOT_TOKEN": "your-bot-token",
    "TELEGRAM_SECRET_TOKEN": "your-secret-token",
    "JWT_ADMIN_SECRET": "your-admin-secret",
    "JWT_USER_SECRET": "your-user-secret"
  }
}
```

**设置敏感信息（推荐使用 Secret）**：
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put JWT_ADMIN_SECRET
npx wrangler secret put JWT_USER_SECRET
npx wrangler secret put PAYMENT_WEBHOOK_SECRET
```

### 6. 构建前端资源

```bash
# 构建用户端
npm run build:shop

# 构建管理后台
npm run build:admin

# 或构建所有前端
npm run build:web

# 同步静态资源到 public 目录
npm run sync:assets
```

### 7. 本地开发

```bash
npm run dev
```

访问：
- API: http://localhost:8787/api
- 用户端: http://localhost:8787
- 管理后台: http://localhost:8787/admin

### 8. 部署到 Cloudflare

```bash
npm run deploy
```

或从项目根目录一键部署：
```bash
npm run deploy
```

## API 接口

### 用户商城 API (`/api/shop/*`)

| 端点 | 方法 | 说明 | 认证 |
| --- | --- | --- | --- |
| `/api/shop/auth/register` | POST | 用户注册 | ❌ |
| `/api/shop/auth/login` | POST | 用户登录 | ❌ |
| `/api/shop/auth/profile` | GET | 获取用户信息 | ✅ |
| `/api/shop/catalog/categories` | GET | 获取分类列表 | ❌ |
| `/api/shop/catalog/products` | GET | 获取商品列表 | ❌ |
| `/api/shop/catalog/products/:id` | GET | 获取商品详情 | ❌ |
| `/api/shop/orders` | GET | 获取订单列表 | ✅ |
| `/api/shop/orders` | POST | 创建订单 | ✅ |
| `/api/shop/orders/:id` | GET | 获取订单详情 | ✅ |

### 管理后台 API (`/api/admin/*`)

| 端点 | 方法 | 说明 | 权限 |
| --- | --- | --- | --- |
| `/api/admin/auth/login` | POST | 管理员登录 | ❌ |
| `/api/admin/auth/logout` | POST | 管理员登出 | ✅ |
| `/api/admin/auth/profile` | GET | 获取管理员信息 | ✅ |
| `/api/admin/dashboard` | GET | 获取仪表盘数据 | `dashboard:view` |
| `/api/admin/categories` | GET/POST/PUT/DELETE | 分类管理 | `categories:*` |
| `/api/admin/products` | GET/POST/PUT/DELETE | 商品管理 | `products:*` |
| `/api/admin/orders` | GET/PUT | 订单管理 | `orders:*` |
| `/api/admin/users` | GET/PUT | 用户管理 | `users:*` |
| `/api/admin/menus` | GET/POST/PUT/DELETE | 菜单管理 | `menus:*` |
| `/api/admin/roles` | GET/POST/PUT/DELETE | 角色管理 | `roles:*` |
| `/api/admin/accounts` | GET/POST/PUT/DELETE | 管理员账号管理 | `accounts:*` |
| `/api/admin/media/upload` | POST | 上传媒体文件 | ✅ |

### Telegram Bot API (`/api/telegram/*`)

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/telegram/webhook` | POST | Telegram Bot Webhook |
| `/api/telegram/set-webhook` | GET | 设置 Telegram Webhook |

## Telegram Bot 使用

### 设置 Webhook

部署后访问以下 URL 设置 Webhook：
```
https://your-worker-domain.com/api/telegram/set-webhook
```

或手动设置：
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-worker-domain.com/api/telegram/webhook",
    "secret_token": "your-secret-token"
  }'
```

### Bot 命令

- `/start` - 开始使用，显示欢迎信息
- `/catalog` - 浏览商品分类
- `/orders` - 查看我的订单
- `/help` - 帮助信息

## 数据库管理

### 查看迁移状态

```bash
# 本地
npx wrangler d1 migrations list botshop --local

# 远程
npx wrangler d1 migrations list botshop --remote
```

### 创建新迁移

```bash
npx wrangler d1 migrations create botshop <migration-name>
```

### 执行 SQL 查询

```bash
# 本地
npx wrangler d1 execute botshop --local --command "SELECT * FROM users LIMIT 5"

# 远程
npx wrangler d1 execute botshop --remote --command "SELECT * FROM users LIMIT 5"
```

### 导出/导入数据

```bash
# 导出
npx wrangler d1 export botshop --remote --output backup.sql

# 导入（需要先创建迁移文件）
npx wrangler d1 execute botshop --remote --file backup.sql
```

## 媒体文件管理

### R2 存储结构

```
botshop/ (R2 Bucket)
├── products/          # 商品图片
│   └── {uuid}.{ext}
├── categories/        # 分类图标
│   └── {uuid}.{ext}
└── temp/             # 临时文件
```

### 上传文件

通过管理后台 API：
```bash
curl -X POST "https://admin.your-domain.com/api/admin/media/upload" \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@image.jpg"
```

返回：
```json
{
  "ok": true,
  "data": {
    "url": "https://static.your-domain.com/products/xxxxx.jpg",
    "key": "products/xxxxx.jpg"
  }
}
```

## 开发

### 项目脚本

```bash
npm run dev              # 启动本地开发服务器
npm run deploy           # 部署到 Cloudflare
npm run cf-typegen       # 生成 TypeScript 类型
npm run build:shop       # 构建用户端前端
npm run build:admin      # 构建管理后台前端
npm run build:web        # 构建所有前端
npm run sync:assets      # 同步前端资源到 public
npm run build:assets     # 构建并同步前端资源
```

### 本地开发提示

1. **使用本地数据库**：`wrangler dev` 默认使用本地 D1 数据库，需要先运行 `wrangler d1 migrations apply botshop --local`

2. **前端开发**：前端项目（web 和 admin-web）有独立的开发服务器，支持热更新：
   ```bash
   # 用户端
   cd ../web && npm run dev
   
   # 管理后台
   cd ../admin-web && npm run dev
   ```

3. **API 调试**：访问 http://localhost:8787/api 查看 API 端点

4. **查看日志**：使用 `wrangler tail` 实时查看生产环境日志：
   ```bash
   npx wrangler tail
   ```

### 代码结构说明

**路由层** (`src/routes/`)
- 负责 HTTP 请求处理和响应
- 参数验证
- 调用 Service 层

**服务层** (`src/services/`)
- 业务逻辑实现
- 数据库操作
- 外部 API 调用

**数据库层** (`src/db/`)
- Drizzle ORM Schema 定义
- 数据库连接管理

**工具层** (`src/utils/`)
- 通用工具函数
- JWT 处理
- 缓存管理
- 错误处理

## 部署

### 子域名配置

推荐使用子域名分离用户端和管理后台：

1. **DNS 配置**（在 Cloudflare Dashboard）：
   - `www.your-domain.com` → Worker
   - `admin.your-domain.com` → Worker

2. **Worker 路由**（自动识别）：
   - `admin.your-domain.com/*` → 管理后台
   - `www.your-domain.com/*` → 用户商城

### 部署检查清单

- [ ] D1 数据库已创建并迁移
- [ ] KV 命名空间已创建
- [ ] R2 存储桶已创建
- [ ] 环境变量已配置
- [ ] Secrets 已设置
- [ ] 前端资源已构建并同步
- [ ] Telegram Webhook 已设置
- [ ] DNS 记录已配置
- [ ] Worker 路由已配置

### 生产环境建议

1. **安全性**
   - 使用 Cloudflare Access 保护管理后台
   - 启用 WAF 规则
   - 配置 Rate Limiting
   - 定期更新 JWT 密钥

2. **性能优化**
   - 启用 Cloudflare 缓存
   - 使用 R2 自定义域名
   - 配置合适的 Cache-Control 头

3. **监控**
   - 启用 Cloudflare Analytics
   - 配置告警规则
   - 定期查看日志

## 故障排查

### 常见问题

**1. 数据库连接失败**
```bash
# 检查 D1 绑定
npx wrangler d1 list

# 检查迁移状态
npx wrangler d1 migrations list botshop --remote
```

**2. 静态资源 404**
```bash
# 确保已同步前端资源
npm run sync:assets

# 检查 public 目录
ls -R public/
```

**3. Telegram Bot 无响应**
```bash
# 检查 Webhook 状态
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# 重新设置 Webhook
curl "https://your-worker-domain.com/api/telegram/set-webhook"
```

**4. 管理后台无法登录**
- 检查 JWT_ADMIN_SECRET 是否正确设置
- 确认管理员账号已创建
- 查看浏览器控制台错误信息

### 日志查看

```bash
# 实时日志
npx wrangler tail

# 过滤错误
npx wrangler tail --status error

# 查看特定时间段
npx wrangler tail --since 1h
```

## 相关文档

- [项目总览](../README.md)
- [部署文档](../DEPLOYMENT.md)
- [快速开始](../GETTING_STARTED.md)
- [用户端文档](../web/README.md)
- [管理后台文档](../admin-web/README.md)

## 技术栈

- **运行时**: Cloudflare Workers
- **Web 框架**: Hono
- **数据库**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **对象存储**: Cloudflare R2
- **缓存**: Cloudflare KV
- **国际化**: i18next
- **Bot SDK**: Telegram Bot API

## 许可证

[LICENSE](../LICENSE)
