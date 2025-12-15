import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
    server: {
        port: 5174,
        proxy: {
			'/api': {
				target: 'http://localhost:8787',
				changeOrigin: true,
			},
        },
    },
	plugins: [
		vue(),
		AutoImport({
			imports: ['vue', 'vue-router', 'pinia'],
			dts: 'src/auto-imports.d.ts',
			resolvers: [AntDesignVueResolver({ importStyle: false })],
		}),
		Components({
			dts: 'src/components.d.ts',
			resolvers: [AntDesignVueResolver({ importStyle: false })],
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	css: {
		preprocessorOptions: {
			less: {
				javascriptEnabled: true,
			},
		},
	},
});
