# 快速开始指南

## 一、完整安装

### 1. 克隆项目
```bash
git clone <repository-url>
cd botshop
```

### 2. 安装所有依赖
```bash
npm run install:all
```

或者分别安装：
```bash
npm install --prefix web
npm install --prefix admin-web
npm install --prefix worker
```

## 二、本地开发

### 同时启动所有服务（推荐）

在三个终端窗口中分别运行：

**终端 1 - Worker 服务**:
```bash
npm run dev:worker
# 或
cd worker && npm run dev
```
访问: http://localhost:8787

**终端 2 - 用户端商城**:
```bash
npm run dev:shop
# 或
cd web && npm run dev
```
访问: http://localhost:5173

**终端 3 - 管理后台**:
```bash
npm run dev:admin
# 或
cd admin-web && npm run dev
```
访问: http://localhost:5174

### 单独开发某一端

**只开发用户端**:
```bash
cd web
npm run dev
# Worker 需要在后台运行以提供 API
```

**只开发管理后台**:
```bash
cd admin-web
npm run dev
# Worker 需要在后台运行以提供 API
```

## 三、构建和部署

### 构建所有前端项目

从项目根目录：
```bash
npm run build:all
```

或分别构建：
```bash
npm run build:shop    # 构建用户端
npm run build:admin   # 构建管理后台
```

### 同步静态资源到 Worker

```bash
cd worker
npm run sync:assets
```

这会将构建好的文件复制到 `worker/public/`:
```
worker/public/
├── index.html              # 用户端
├── assets/shop-*.{js,css}
├── admin/
│   ├── index.html          # 管理后台
│   └── assets/admin-*.{js,css}
```

### 部署到 Cloudflare

```bash
# 从根目录一键构建并部署
npm run deploy

# 或手动分步骤
npm run build:all
cd worker
npm run sync:assets
npm run deploy
```

## 四、数据库设置

### 创建 D1 数据库

```bash
cd worker
npx wrangler d1 create botshop
```

记录返回的 `database_id`，更新到 `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [{
    "binding": "BOTSHOP_DB",
    "database_name": "botshop",
    "database_id": "your-database-id-here"
  }]
}
```

### 运行数据库迁移

**本地测试**:
```bash
cd worker
npx wrangler d1 migrations apply botshop --local
```

**生产环境**:
```bash
npx wrangler d1 migrations apply botshop --remote
```

## 五、环境变量配置

### Worker 环境变量

编辑 `worker/wrangler.jsonc`:
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

### 敏感信息使用 Secret

```bash
cd worker
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put JWT_ADMIN_SECRET
wrangler secret put JWT_USER_SECRET
wrangler secret put PAYMENT_API_KEY
```

## 六、域名配置

### Cloudflare DNS 设置

在 Cloudflare Dashboard 添加 DNS 记录：

| 类型 | 名称  | 内容      | 代理状态 |
|------|-------|-----------|----------|
| A    | www   | 192.0.2.1 | 已代理   |
| A    | admin | 192.0.2.1 | 已代理   |

### Worker 路由配置

在 Cloudflare Dashboard 的 Worker 路由设置中添加：

```
www.your-domain.com/*   -> botshop
admin.your-domain.com/* -> botshop
```

或在 `wrangler.jsonc` 中配置：
```jsonc
{
  "routes": [
    { "pattern": "www.your-domain.com/*", "zone_name": "your-domain.com" },
    { "pattern": "admin.your-domain.com/*", "zone_name": "your-domain.com" }
  ]
}
```

## 七、常用命令速查

### 根目录命令
```bash
npm run install:all    # 安装所有依赖
npm run dev:shop       # 启动用户端开发服务器
npm run dev:admin      # 启动管理后台开发服务器
npm run dev:worker     # 启动 Worker 开发服务器
npm run build:shop     # 构建用户端
npm run build:admin    # 构建管理后台
npm run build:all      # 构建所有前端
npm run deploy         # 构建并部署
```

### Worker 命令
```bash
cd worker
npm run dev            # 开发模式
npm run build:web      # 构建所有前端
npm run sync:assets    # 同步静态资源
npm run build:assets   # 构建并同步
npm run deploy         # 部署到 Cloudflare
npm run cf-typegen     # 生成 TypeScript 类型
```

### 前端命令
```bash
cd web  # 或 cd admin-web
npm run dev            # 开发模式
npm run build          # 生产构建
npm run preview        # 预览构建结果
```

## 八、开发流程示例

### 场景 1: 修改用户端页面

1. 启动服务:
   ```bash
   # 终端 1
   cd worker && npm run dev
   
   # 终端 2
   cd web && npm run dev
   ```

2. 访问 http://localhost:5173 进行开发

3. 完成后构建:
   ```bash
   cd web && npm run build
   ```

### 场景 2: 修改管理后台

1. 启动服务:
   ```bash
   # 终端 1
   cd worker && npm run dev
   
   # 终端 2
   cd admin-web && npm run dev
   ```

2. 访问 http://localhost:5174 进行开发

3. 完成后构建:
   ```bash
   cd admin-web && npm run build
   ```

### 场景 3: 修改 API 接口

1. 启动 Worker 开发:
   ```bash
   cd worker && npm run dev
   ```

2. 修改 `worker/src/routes/` 或 `worker/src/services/` 中的代码

3. Worker 会自动重载

4. 测试完成后部署:
   ```bash
   npm run deploy
   ```

### 场景 4: 完整开发环境

同时开发前后端：

```bash
# 终端 1: Worker
cd worker && npm run dev

# 终端 2: 用户端
cd web && npm run dev

# 终端 3: 管理后台
cd admin-web && npm run dev
```

- 用户端: http://localhost:5173
- 管理后台: http://localhost:5174
- Worker API: http://localhost:8787

所有前端的 API 请求会自动代理到 Worker。

## 九、故障排查

### 构建失败

```bash
# 清理 node_modules 重新安装
rm -rf node_modules web/node_modules admin-web/node_modules worker/node_modules
npm run install:all
```

### 前端无法访问 API

检查：
1. Worker 是否在运行 (http://localhost:8787)
2. vite.config.ts 中的 proxy 配置
3. 浏览器控制台的网络请求

### Worker 部署失败

```bash
# 检查 wrangler 配置
cd worker
npx wrangler whoami
npx wrangler deploy --dry-run
```

### 数据库错误

```bash
# 检查迁移状态
cd worker
npx wrangler d1 migrations list botshop --remote
```

## 十、下一步

- 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解详细部署配置
- 阅读 [MIGRATION.md](./MIGRATION.md) 了解项目重构细节
- 查看各子项目的 README:
  - [web/README.md](./web/README.md)
  - [admin-web/README.md](./admin-web/README.md)
  - [worker/README.md](./worker/README.md)
