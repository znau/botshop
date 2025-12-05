# BotShop 路由部署策略

## 域名规划

### 方案一：子域名分离（推荐）✅

- **用户商城**: `https://shop.your-domain.com` 或 `https://www.your-domain.com`
- **管理后台**: `https://admin.your-domain.com`

**优点**:
- 清晰的域名分离，安全性更高
- 可以为管理后台设置额外的安全策略（如 IP 白名单）
- SEO 友好，用户端和管理端完全独立
- 便于设置不同的缓存策略

**配置步骤**:

1. **Cloudflare DNS 设置**:
   ```
   A/AAAA    www     -> Worker (代理橙色云朵)
   A/AAAA    admin   -> Worker (代理橙色云朵)
   ```

2. **Worker 路由规则** (wrangler.jsonc):
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

3. **Worker 代码路由逻辑** (见下文实现)

### 方案二：路径分离

- **用户商城**: `https://www.your-domain.com/`
- **管理后台**: `https://www.your-domain.com/admin`

**优点**:
- 只需一个域名
- 配置简单

**缺点**:
- 管理后台与用户端在同一域名下，隔离性较差
- 需要处理静态资源路径问题

## 实现细节

### Worker 路由处理

在 `worker/src/index.ts` 中添加域名判断逻辑：

```typescript
// 判断是否为管理后台请求
function isAdminRequest(request: Request): boolean {
  const url = new URL(request.url);
  
  // 方案一：子域名判断
  if (url.hostname.startsWith('admin.')) {
    return true;
  }
  
  // 方案二（备用）：路径判断
  if (url.pathname.startsWith('/admin')) {
    return true;
  }
  
  return false;
}
```

### 静态资源处理

```typescript
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const isAdmin = isAdminRequest(request);
    
    // API 请求
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    
    // 静态资源请求
    if (isAdmin) {
      // 管理后台静态资源
      const assetPath = url.pathname.replace(/^\/admin/, '') || '/index.html';
      return env.ASSETS.fetch(new Request(`${url.origin}/admin${assetPath}`));
    } else {
      // 用户端静态资源
      return env.ASSETS.fetch(request);
    }
  }
}
```

### 环境变量配置

在 `wrangler.jsonc` 中添加：

```jsonc
{
  "vars": {
    "BASE_URL": "https://www.your-domain.com",
    "ADMIN_URL": "https://admin.your-domain.com"
  }
}
```

## 部署步骤

### 1. 本地开发

```bash
# 启动用户端开发服务器 (端口 5173)
npm run dev:shop

# 启动管理后台开发服务器 (端口 5174)
npm run dev:admin

# 启动 Worker 开发服务器 (端口 8787)
npm run dev:worker
```

### 2. 构建

```bash
# 从项目根目录构建所有
npm run build:all

# 或分别构建
npm run build:shop
npm run build:admin
```

### 3. 同步静态资源到 Worker

```bash
cd worker
npm run sync:assets
```

### 4. 部署到 Cloudflare

```bash
cd worker
npm run deploy
```

## 目录结构（部署后）

```
worker/public/
├── index.html              # 用户商城入口
├── assets/                 # 用户商城资源
│   ├── shop-*.js
│   └── shop-*.css
├── admin/                  # 管理后台（独立目录）
│   ├── index.html          # 管理后台入口
│   └── assets/             # 管理后台资源
│       ├── admin-*.js
│       └── admin-*.css
└── .gitkeep
```

## 安全建议

对于管理后台（admin 子域名），建议在 Cloudflare 设置：

1. **WAF 规则**: 限制访问来源 IP
2. **Rate Limiting**: 防止暴力破解
3. **Access Policy**: 启用 Cloudflare Access 进行额外认证
4. **HTTPS Only**: 强制 HTTPS 访问

## 开发环境代理

开发时，前端项目的 vite.config.ts 已配置 API 代理：

```typescript
// web/vite.config.ts 和 admin-web/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8787',  // Worker 本地开发地址
      changeOrigin: true,
    },
  },
}
```
