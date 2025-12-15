# BotShop Admin

基于 Vite + Vue 3 + TypeScript + Ant Design Vue 的后台管理前端，覆盖 Cloudflare Worker 服务端的 `/api/admin` 接口。

## 特性
- 登录凭证保存在本地，自动附带 Bearer Token
- 动态加载管理员资料、菜单与权限
- 仪表盘、分类、商品、订单、用户、菜单、角色、管理员等核心页面
- Ant Design Vue 组件库、NProgress 路由进度、Iconify 图标

## 开发
```bash
cd admin-web
npm install
npm run dev
```
默认端口 4174，可通过 `VITE_API_BASE` 指向后端地址（默认 `/api`）。

## 构建
```bash
npm run build
```
产物输出到 `dist/`，可由 Worker 侧脚本同步到发布目录。

## 环境变量
复制 `.env.example` 到 `.env.local` 并按需调整：
- `VITE_API_BASE`：后端接口地址，默认 `/api`
- `VITE_APP_NAME`：页面标题前缀

## 对接约定
- 所有接口返回 `{ code, message, data }`，`code === 0` 视为成功
- 401/403 时会重定向到登录页
- 菜单和权限由 `/api/admin/profile` 下发并用于侧边栏与权限校验
