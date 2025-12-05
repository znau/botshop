import { defineStore } from 'pinia';
import { shopApi } from '@/api/shop';
import { setAuthToken } from '@/api/client';
import type {
  UserProfile,
  OrdersResponseItem,
  ProfileResponse,
  LoginPayload,
  RegisterPayload,
} from '@/types/api';

const pickMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后再试';
};

const TOKEN_STORAGE_KEY = 'botshop_token';

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('token storage read failed', error);
    return null;
  }
};

const initialToken = readStoredToken();
if (initialToken) {
  setAuthToken(initialToken);
}

const isUnauthorized = (error: unknown) => Boolean((error as { response?: { status?: number } })?.response?.status === 401);

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as UserProfile | null,
    status: 'idle' as 'idle' | 'loading' | 'authenticated',
    lastError: '',
    ordersCache: [] as OrdersResponseItem[],
    token: initialToken as string | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    displayName: (state) => state.user?.nickname ?? state.user?.username ?? '游客',
  },
  actions: {
    setToken(token: string | null) {
      this.token = token;
      setAuthToken(token);
      if (typeof window !== 'undefined') {
        try {
          if (token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        } catch (error) {
          console.warn('token storage write failed', error);
        }
      }
    },
    async bootstrap() {
      if (this.status !== 'idle') return;
      if (!this.token) return;
      await this.fetchProfile();
    },
    async login(payload: LoginPayload) {
      this.status = 'loading';
      this.lastError = '';
      try {
        const data = await shopApi.login(payload);
        this.user = data.user;
        this.setToken(data.token);
        this.status = 'authenticated';
      } catch (error) {
        this.lastError = pickMessage(error);
        this.status = this.user ? 'authenticated' : 'idle';
        throw error;
      }
    },
    async register(payload: RegisterPayload) {
      this.status = 'loading';
      this.lastError = '';
      try {
        const data = await shopApi.register(payload);
        this.user = data.user;
        this.setToken(data.token);
        this.status = 'authenticated';
      } catch (error) {
        this.lastError = pickMessage(error);
        this.status = this.user ? 'authenticated' : 'idle';
        throw error;
      }
    },
    async loginWithTelegram(initData: string) {
      if (!initData) {
        throw new Error('Telegram 环境未就绪');
      }
      this.status = 'loading';
      this.lastError = '';
      try {
        const data = await shopApi.loginWithTelegram(initData);
        this.user = data.user;
        this.setToken(data.token);
        this.status = 'authenticated';
      } catch (error) {
        this.lastError = pickMessage(error);
        this.status = this.user ? 'authenticated' : 'idle';
        throw error;
      }
    },
    async fetchProfile() {
      if (!this.token) {
        this.user = null;
        this.ordersCache = [];
        this.status = 'idle';
        return;
      }
      this.status = 'loading';
      try {
        const data: ProfileResponse = await shopApi.getProfile();
        this.user = data.user;
        this.ordersCache = data.orders;
        this.status = this.user ? 'authenticated' : 'idle';
      } catch (error) {
        console.warn('profile fetch failed', error);
        this.user = null;
        this.ordersCache = [];
        if (isUnauthorized(error)) {
          this.setToken(null);
        }
        this.status = 'idle';
      }
    },
    async fetchOrders(force = false) {
      if (!this.token) {
        throw new Error('请先登录');
      }
      if (!force && this.ordersCache.length) {
        return this.ordersCache;
      }
      try {
        const data = await shopApi.getOrders();
        this.ordersCache = data.orders;
        return this.ordersCache;
      } catch (error) {
        this.lastError = pickMessage(error);
        if (isUnauthorized(error)) {
          this.setToken(null);
          this.user = null;
        }
        throw error;
      }
    },
    async logout() {
      try {
        await shopApi.logout();
      } finally {
        this.setToken(null);
        this.user = null;
        this.status = 'idle';
        this.ordersCache = [];
      }
    },
  },
});
