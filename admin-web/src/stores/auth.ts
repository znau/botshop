import { defineStore } from 'pinia';
import { adminApi } from '@/api/admin';
import { setApiToken } from '@/api/client';
import type { AdminMenu, AdminUser } from '@/types/api';

const TOKEN_KEY = 'botshop_admin_token';

export const useAuthStore = defineStore('auth', {
	state: () => ({
		token: (localStorage.getItem(TOKEN_KEY) as string | null) ?? null,
		admin: null as AdminUser | null,
		menus: [] as AdminMenu[],
		permissions: [] as string[],
		profileLoaded: false,
	}),
	getters: {
		hasPermission: (state) => (code?: string) => {
			if (!code) return true;
			if (!state.permissions?.length) return false;
			return state.permissions.includes('*') || state.permissions.includes(code);
		},
		displayName: (state) => state.admin?.nickname || state.admin?.username || '管理员',
	},
	actions: {
		setToken(token: string | null) {
			this.token = token;
			setApiToken(token);
			if (token) {
				localStorage.setItem(TOKEN_KEY, token);
			} else {
				localStorage.removeItem(TOKEN_KEY);
			}
		},
		async login(payload: { username: string; password: string }) {
			const data = await adminApi.login(payload);
			this.setToken(data.token);
			this.admin = data.admin;
			await this.bootstrap();
		},
		async bootstrap() {
			if (!this.token) throw new Error('Missing token');
			setApiToken(this.token);
			const profile = await adminApi.profile();
			this.admin = profile.admin;
			this.menus = profile.menus || [];
			this.permissions = profile.permissions || [];
			this.profileLoaded = true;
		},
		logout() {
			this.setToken(null);
			this.admin = null;
			this.menus = [];
			this.permissions = [];
			this.profileLoaded = false;
		},
	},
});
