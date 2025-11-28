## Botshop

Cloudflare Worker powered Telegram 数字商品店铺，支持商品浏览、下单支付、自动发货和后台管理。主干使用 [Hono](https://github.com/honojs/hono) + [chanfana](https://github.com/cloudflare/chanfana) 构建 API，通过 Cloudflare D1 保存分类、商品、库存、订单以及用户数据，并借助 KV + R2 启用后台登录和商品媒体上传。

### 功能概览

- **Telegram Bot**：命令与 inline 按钮浏览商品、创建订单、推送支付链接、展示最近订单。
- **多币种支付抽象**：可对接第三方商户 API，使用 HMAC 校验的支付回调。
- **自动发货**：支付成功后自动扣减库存池中的兑换码，并推送履约信息至 Telegram。
- **Web 管理后台 + REST API**：`/admin` 前端面板 + cookie 会话 REST，管理分类、商品、库存、订单、用户，并支持 R2 图片上传。
- **开放目录**：`/api/store/catalog` 输出可复用的前台目录 JSON，便于多端复用。

### 系统组件

- `src/index.ts`：入口，注册 OpenAPI、后台路由、Telegram 及支付 webhook。
- `src/services/*`：封装 D1 DAO、订单、支付、库存、媒体、管理员认证等逻辑。
- `src/bot/telegramBot.ts`：Telegram 机器人核心对话与 inline 交互。
- `src/routes/admin.ts`：后台 REST API，包含分类/商品/订单/用户/库存，以及 R2 上传接口。
- `src/ui/admin/`：拆分的后台布局、脚本与功能页面模板，方便扩展或替换成独立静态资源。
- `wrangler.jsonc`：Cloudflare Worker、D1、KV、R2 绑定及变量配置。

## 环境要求

| 绑定/变量 | 类型 | 用途 |
| --- | --- | --- |
| `BOTSHOP_DB` | D1 | 业务主库（分类、商品、库存、订单、用户） |
| `BOTSHOP_KV` | KV | 保存后台账号（键：`admin:<username>`） |
| `BOTSHOP_BUCKET` | R2 | 商品图片/宣传素材存储桶 |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot API token |
| `TELEGRAM_SECRET_TOKEN` | Secret | Telegram Webhook header 校验值 |
| `JWT_ADMIN_SECRET` | Secret | 后台登录会话 HMAC key（建议 32+ 字符） |
| `PAYMENT_WEBHOOK_SECRET` | Secret | 支付回调 HMAC key |
| `PAYMENT_API_KEY` | Secret（可选） | 外部支付接口 token |
| `PAYMENT_GATEWAY_URL` | Var（可选） | 自定义下单接口 URL |
| `BASE_URL` | Var（可选） | Worker 对外访问域，部分链接会使用 |
| `MEDIA_PUBLIC_BASE` | Var（可选） | R2 对外访问域；为空时使用 `/media/*` 路由 |

> `wrangler.jsonc` 内的 D1/KV/R2 ID 为占位值，请替换为你在 Cloudflare 控制台或 CLI 创建的真实 ID。

## 初始化步骤

1. **安装依赖并登录 Cloudflare**

	```cmd
	npm install
	wrangler login
	```

2. **创建 D1、KV、R2 绑定**

	```cmd
	wrangler d1 create botshop
	wrangler kv:namespace create botshop
	wrangler r2 bucket create botshop
	# 将输出的 database_id / namespace id / bucket 名填入 wrangler.jsonc
	```

3. **执行迁移并写入密钥**

	```cmd
	wrangler d1 migrations apply botshop --local --remote
	wrangler secret put TELEGRAM_BOT_TOKEN
	wrangler secret put TELEGRAM_SECRET_TOKEN
	wrangler secret put PAYMENT_WEBHOOK_SECRET
	wrangler secret put JWT_ADMIN_SECRET
	# 可选：
	wrangler secret put PAYMENT_API_KEY
	```

4. **初始化后台账号（生成 JSON 后写入 KV）**

	```cmd
	node scripts/seedAdmin.mjs --username admin --password "YourStrongPass" > admin.json
	wrangler kv:key put --binding=BOTSHOP_KV admin:admin --path=admin.json  // ???
	# 使用 --preview 可将账号写入本地 KV，便于 wrangler dev 调试
	```

5. **运行或部署 Worker**

	```cmd
	wrangler dev
	# 或
	wrangler deploy
	```

6. **配置 Telegram Webhook**：`https://api.telegram.org/bot<token>/setWebhook`，`url` 指向 `https://<worker>/api/telegram/webhook`，`secret_token` 设置为 `TELEGRAM_SECRET_TOKEN`。

## 管理后台（Web + API）

- 访问 `https://<worker>/admin` 打开零依赖前端面板，可视化管理分类、商品、库存、订单与用户，并包含 R2 图片上传入口。
- 页面按功能拆分：`/admin/categories`、`/admin/products`、`/admin/orders`、`/admin/users` 分别处理对应职能，方便后续扩展模版。
- 会话接口：`POST /api/admin/auth/login`、`POST /api/admin/auth/logout`、`GET /api/admin/auth/session`。
- 登录成功后 Worker 通过 `admin_session` cookie 维护凭证；所有 `/api/admin/*` 请求均依赖该 cookie，无需额外 Header。
- 媒体上传：`POST /api/admin/media/upload`（`multipart/form-data`，字段 `file`），返回 `asset.url` 可直接写入 `mediaUrl`。

命令行访问示例（借助 cookie 保存会话）：

```cmd
# 登录并保存 cookie
curl -c admin.cookie -X POST https://<worker>/api/admin/auth/login \
	-H "Content-Type: application/json" \
	-d '{"username":"admin","password":"YourStrongPass"}'

# 创建分类
curl -b admin.cookie -X POST https://<worker>/api/admin/categories \
	-H "Content-Type: application/json" \
	-d '{"name":"卡密","emoji":"🎟","sortOrder":0,"isActive":true}'

# 上传媒体
curl -b admin.cookie -X POST https://<worker>/api/admin/media/upload \
	-F "file=@./banner.png"
```

## Telegram Bot 指南

- `/start`：欢迎信息 + 操作提示。
- `/catalog`：按分类发送 inline 按钮。
- `/buy <slug>` 或点击按钮：选择币种后生成订单与支付链接。
- `/orders`：最近 5 笔订单状态。

支付回调命中 `/api/payments/webhook` 后会触发自动扣码并通过 Telegram 推送兑换信息；如库存不足会通知用户并将订单状态标记为 `awaiting_stock`。

## OpenAPI & 调试

- Swagger UI 暴露在 `/`，目前包含 `GET /api/store/catalog` 与 `GET /api/health`。
- 更多业务接口可直接使用 REST/JSON（Hono 路由）。

本地调试：

```cmd
npm run cf-typegen   # 可选，更新 worker-configuration.d.ts
wrangler dev
```

> `wrangler dev --remote` 时需确保 Cloudflare 账户中已创建 D1，并在 `wrangler.jsonc` 中写入真实 `database_id`。
