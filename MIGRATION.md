# 项目重构迁移指南

## 重构说明

本次重构将原来混合在一起的用户端和管理后台分离成了两个独立的项目：

- `web/` - 用户端商城
- `admin-web/` - 管理后台

## 主要变更

### 1. 目录结构变更

**之前**:
```
web/
├── src/
│   └── apps/
│       ├── shop/      # 用户端
│       └── admin/     # 管理后台
├── admin/index.html
└── index.html
```

**之后**:
```
web/                    # 纯用户端
├── src/
│   ├── api/
│   ├── components/
│   ├── router/
│   ├── stores/
│   └── views/
└── index.html

admin-web/             # 独立管理后台
├── src/
│   ├── api/
│   ├── components/
│   ├── router/
│   ├── stores/
│   └── views/
└── index.html
```

### 2. 导入路径变更

#### web/ (用户端)

**之前**: 使用 `@shop/` 别名
```typescript
import { useSessionStore } from '@shop/stores/session';
import ProductCard from '@shop/components/catalog/ProductCard.vue';
```

**之后**: 使用 `@/` 别名（代码已在 `src/apps/shop` 下，现在直接在 `src` 下）
```typescript
import { useSessionStore } from '@/stores/session';
import ProductCard from '@/components/catalog/ProductCard.vue';
```

**注意**: 用户端的 shop 目录下的代码已经使用相对路径，迁移时需要将 `src/apps/shop/*` 的内容移动到 `src/` 根目录。

#### admin-web/ (管理后台)

**之前**: 使用 `@admin/` 别名
```typescript
import { useSessionStore } from '@admin/stores/session';
import AdminLayout from '@admin/components/layout/AdminLayout.vue';
```

**之后**: 使用 `@/` 别名（已自动替换）
```typescript
import { useSessionStore } from '@/stores/session';
import AdminLayout from '@/components/layout/AdminLayout.vue';
```

### 3. 配置文件变更

#### vite.config.ts

**web/vite.config.ts** - 简化为单应用配置：
```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // ...
});
```

**admin-web/vite.config.ts** - 新建独立配置：
```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,  // 不同端口
  },
  // ...
});
```

#### package.json

**web/package.json**:
- 项目名从 `botshop-web` 改为 `botshop-shop`
- 移除了管理后台相关配置

**admin-web/package.json**:
- 新项目 `botshop-admin`
- 端口设置为 5174

### 4. Worker 构建脚本变更

**worker/package.json**:

```json
{
  "scripts": {
    "build:shop": "npm --prefix ../web run build",
    "build:admin": "npm --prefix ../admin-web run build",
    "build:web": "npm run build:shop && npm run build:admin",
    "sync:assets": "node ./scripts/sync-web-dist.mjs",
    "build:assets": "npm run build:web && npm run sync:assets"
  }
}
```

**worker/scripts/sync-web-dist.mjs** - 更新为同时处理两个前端：

```javascript
// 复制用户端到 public 根目录
await cp(shopDist, workerPublic, { recursive: true });

// 复制管理后台到 public/admin 目录
await cp(adminDist, adminPublic, { recursive: true });
```

### 5. Worker 路由变更

**worker/src/index.ts** - 新增子域名路由支持：

```typescript
function isAdminRequest(request: Request): boolean {
  const url = new URL(request.url);
  // 支持子域名: admin.your-domain.com
  if (url.hostname.startsWith('admin.')) {
    return true;
  }
  // 支持路径: /admin/*
  if (url.pathname.startsWith('/admin')) {
    return true;
  }
  return false;
}
```

## 迁移步骤

### 必须操作

1. **移动用户端代码**

需要手动将 `web/src/apps/shop/` 下的所有内容移动到 `web/src/` 根目录：

```bash
# Windows PowerShell
Move-Item -Path "web\src\apps\shop\*" -Destination "web\src\" -Force
Remove-Item -Path "web\src\apps" -Recurse
```

或者手动在文件管理器中：
- 将 `web/src/apps/shop/` 下的所有文件和文件夹移到 `web/src/`
- 删除 `web/src/apps/` 目录
- 删除 `web/admin/` 目录

2. **安装依赖**

```bash
# 安装管理后台依赖
npm install --prefix admin-web

# 重新安装其他项目（如果需要）
npm install --prefix web
npm install --prefix worker
```

3. **测试开发环境**

```bash
# 测试用户端
npm run dev --prefix web

# 测试管理后台
npm run dev --prefix admin-web

# 测试 Worker
npm run dev --prefix worker
```

4. **构建测试**

```bash
# 构建所有前端
npm run build:all

# 同步到 worker
cd worker
npm run sync:assets

# 检查 worker/public 目录结构
```

预期结构：
```
worker/public/
├── index.html              # 用户端入口
├── assets/
│   ├── shop-*.js
│   └── shop-*.css
└── admin/                  # 管理后台
    ├── index.html
    └── assets/
        ├── admin-*.js
        └── admin-*.css
```

### 可选操作

1. **配置子域名**

在 Cloudflare DNS 中添加：
- `admin.your-domain.com` CNAME/A 记录

在 `worker/wrangler.jsonc` 中配置路由：
```jsonc
{
  "routes": [
    {
      "pattern": "www.your-domain.com/*",
      "zone_name": "your-domain.com"
    },
    {
      "pattern": "admin.your-domain.com/*",
      "zone_name": "your-domain.com"
    }
  ]
}
```

2. **更新环境变量**

在 `worker/wrangler.jsonc` 中添加 `ADMIN_URL`：
```jsonc
{
  "vars": {
    "BASE_URL": "https://www.your-domain.com",
    "ADMIN_URL": "https://admin.your-domain.com"
  }
}
```

## 验证清单

- [ ] `web/src/` 下直接包含 `App.vue`, `main.ts` 等文件（不在 `apps/shop` 下）
- [ ] `admin-web/` 项目可以正常运行（`npm run dev`）
- [ ] `web/` 用户端可以正常运行（`npm run dev`）
- [ ] 构建命令正常工作（`npm run build:all`）
- [ ] `worker/public/` 包含正确的目录结构
- [ ] Worker 本地开发可以访问两个前端（`npm run dev:worker`）
- [ ] 部署后两个域名都能正常访问

## 常见问题

### Q: 用户端导入路径报错

**A**: 确保已将 `web/src/apps/shop/*` 的内容移动到 `web/src/` 根目录。

### Q: 管理后台 404

**A**: 检查：
1. `worker/public/admin/` 目录是否存在
2. Worker 路由逻辑是否正确
3. 子域名 DNS 是否配置

### Q: 开发时 API 请求失败

**A**: 确保：
1. Worker 在 8787 端口运行
2. Vite 配置了正确的 proxy
3. CORS 配置正确

### Q: 构建后样式丢失

**A**: 检查：
1. Tailwind CSS 配置是否正确
2. PostCSS 配置是否存在
3. 构建输出的 assets 目录结构

## 回滚方案

如果遇到问题需要回滚，可以：

1. 使用 Git 回退到重构前的提交
2. 或者参考原来的 `web/vite.config.ts` 配置恢复多入口构建

## 技术支持

遇到问题可以：
1. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 部署文档
2. 检查 Cloudflare Worker 日志
3. 查看浏览器开发者工具的网络请求
