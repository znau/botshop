# BotShop Web Storefront

Responsive Vue 3 storefront that mirrors the Telegram bot experience and runs on desktop, mobile browsers, and Telegram Mini Apps.

## Tech stack

- **Vue 3 + TypeScript + Vite** for the SPA shell.
- **Pinia** stores for catalog and session state (shared `pinia` instance in `src/stores`).
- **Vue Router** with guards for `/orders` and `/account` (requires authenticated session).
- **Naive UI + Tailwind CSS** for adaptive UI components compatible with Telegram WebApp WebView.
- **Axios** client preconfigured for `/api/shop` with a thin `unwrap` helper that respects the worker's `result.ok/fail` envelope.

## Available scripts

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server on http://localhost:5173
npm run build     # produce production bundle inside dist/
npm run preview   # preview the production build locally
```

## Key directories

```
src/
├─ api/            # Axios client + typed shop API helpers
├─ assets/         # Tailwind entry + global styles
├─ components/     # Layout, auth modal, catalog widgets
├─ router/         # Route definitions + auth guard
├─ stores/         # Pinia stores + shared pinia instance
├─ types/          # Shared API/Telegram typings
└─ views/          # Page-level views (Home, Catalog, Product, Orders, Account)
```

## Backend contract

The storefront relies on the Cloudflare Worker routes under `/api/shop/*` (`worker/src/routes/api/shop.ts`). Those endpoints provide catalog data, issue session cookies (password or Telegram WebApp login), expose profile/ordering APIs, and create instant-fulfillment orders that reuse the existing Telegram bot services.

## Deployment

- `npm run build` writes the static bundle to `web/dist`.
- Wrangler's `build.command` (configured at the workspace root) will invoke the storefront build so the generated assets can be copied into `worker/public` and deployed with the Worker.
- The Worker continues to serve both the API and the compiled storefront via the `ASSETS` binding defined in `wrangler.jsonc`.
