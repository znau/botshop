import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';

const normalizeAdminBasePath = (value?: string) => {
  const fallback = '/admin';
  if (!value) return fallback;
  let normalized = value.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized === '/' ? fallback : normalized;
};

interface AdminPluginOptions {
  adminHtmlPath: string;
  adminBasePath: string;
  adminBaseDir: string;
}

const createAdminEntryPlugin = (options: AdminPluginOptions): Plugin => {
  let resolvedConfig: ResolvedConfig | null = null;

  const matchesRequest = (pathname: string) => {
    if (options.adminBasePath === '/') {
      return pathname === '/';
    }
    if (!pathname.startsWith(options.adminBasePath)) {
      return false;
    }
    const nextChar = pathname.slice(options.adminBasePath.length, options.adminBasePath.length + 1);
    return !nextChar || nextChar === '/' || nextChar === '?';
  };

  return {
    name: 'botshop-admin-entry',
    configResolved(config) {
      resolvedConfig = config;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0] ?? '/';
        if (!matchesRequest(pathname)) {
          return next();
        }
        try {
          const template = await fsPromises.readFile(options.adminHtmlPath, 'utf-8');
          const html = await server.transformIndexHtml(pathname, template);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (error) {
          server.config.logger.error(`[botshop-admin-entry] ${(error as Error).message}`);
          next(error as Error);
        }
      });
    },
    closeBundle: {
      order: 'post',
      async handler() {
        if (!resolvedConfig) return;
        if (!options.adminBaseDir || options.adminBaseDir === 'admin') {
          return;
        }
        const outDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir);
        const currentAdminDir = path.join(outDir, 'admin');
        if (!fs.existsSync(currentAdminDir)) {
          return;
        }
        const targetDir = path.join(outDir, options.adminBaseDir);
        await fsPromises.rm(targetDir, { recursive: true, force: true });
        await fsPromises.mkdir(path.dirname(targetDir), { recursive: true });
        await fsPromises.rename(currentAdminDir, targetDir);
      },
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adminBasePath = normalizeAdminBasePath(env.ADMIN_BASE_PATH ?? env.VITE_ADMIN_BASE_PATH);
  const adminBaseDir = adminBasePath.replace(/^\//, '') || 'admin';
  const adminHtmlPath = path.resolve(__dirname, 'admin/index.html');

  return {
    plugins: [vue(), createAdminEntryPlugin({ adminHtmlPath, adminBasePath, adminBaseDir })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shop': path.resolve(__dirname, 'src/apps/shop'),
        '@admin': path.resolve(__dirname, 'src/apps/admin'),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        input: {
          shop: path.resolve(__dirname, 'index.html'),
          admin: adminHtmlPath,
        },
      },
    },
  };
});
