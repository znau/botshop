# BotShop 管理后台

## 开发

```bash
npm install
npm run dev
```

访问 http://localhost:5174

## 构建

```bash
npm run build
```

构建输出在 `dist` 目录

## 部署

管理后台将部署到子域名 `admin.your-domain.com`，通过 Cloudflare Worker 的路由规则进行区分。
