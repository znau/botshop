# BotShop Web Apps

Mono-repo Vue 3 workspace that now serves both the public shop and the admin console (powered by [`vue-bag-admin`](https://github.com/hangjob/vue-bag-admin)) from a single Vite build. The shop mirrors the Telegram bot experience while the admin keeps parity with the worker database schema.

## Tech stack

- **Vue 3 + TypeScript + Vite** for the SPA shell.
- **Pinia** stores for catalog and session state (see `src/apps/shop/stores`).
- **Vue Router** with guards for `/orders` and `/account` (requires authenticated session, `src/apps/shop/router`).
- **Naive UI + Tailwind CSS** for adaptive UI components compatible with Telegram WebApp WebView.
- **Axios** client preconfigured for `/api/shop` with a thin `unwrap` helper that respects the worker's `result.ok/fail` envelope (`src/apps/shop/api`).

## Available scripts

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server on http://localhost:5173
npm run build     # produce production bundle inside dist/
npm run preview   # preview the production build locally
```

## Project layout

```
src/
└─ apps/
	├─ shop/        # End-user storefront (migrated existing code)
	│  ├─ api/
	│  ├─ assets/
	│  ├─ components/
	│  ├─ router/
	│  ├─ stores/
	│  ├─ types/
	│  └─ views/
	└─ admin/       # Vue-Bag-Admin entrypoint (npm package)
```

- All alias imports for the storefront use `@shop/*`.
- A new alias `@admin/*` is reserved for future admin-specific extensions.
- Shared environment typings live in `src/env.d.ts`, and custom package shims are under `src/types/`.

## Multi-page Vite build

- `index.html` → `/` mounts the `apps/shop` entry.
- `admin/index.html` → `/admin` (default) mounts the `vue-bag-admin` bundle.
- Set `VITE_ADMIN_BASE_PATH=/dashboard` (or any path prefix) to expose the admin UI at a custom route – both `npm run dev` and `npm run build` honor the override and the build output folder is renamed automatically.

## Local development

- Copy `.env.example` to `.env.local` (or create the file) and set `VITE_ADMIN_BASE_PATH` if you need a non-default admin slug.
- `npm run dev` serves both apps from the same Vite instance; visit `/admin` (or your custom base path) to load the admin UI.
- When tweaking the admin UI, edit `src/apps/admin/main.ts` and extend the returned `app` from `vue-bag-admin` if you need extra plugins or global styles.
- The worker expects the same admin base path when proxying static assets – keep the value in sync with `worker/src/routes/index.ts` and the SQL-driven configuration referenced in `worker/migrations/0001_init.sql`.

## Backend contract

The storefront relies on the Cloudflare Worker routes under `/api/shop/*` (`worker/src/routes/api/shop.ts`). Those endpoints provide catalog data, issue session cookies (password or Telegram WebApp login), expose profile/ordering APIs, and create instant-fulfillment orders that reuse the existing Telegram bot services.

## Deployment

- `npm run build` writes both pages to `web/dist` (shop at `index.html`, admin under the configured base directory).
- Wrangler's `build.command` (configured at the workspace root) will invoke the build so the generated assets can be copied into `worker/public` and deployed with the Worker.
- The Worker keeps serving the API plus the compiled assets via the `ASSETS` binding defined in `wrangler.jsonc`.
