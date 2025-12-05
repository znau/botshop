import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';

import {
  adminLogin,
  adminRegister,
  fetchAdminProfile,
} from '@/api/admin';
import { setAuthToken } from '@/api/client';
import type { AdminMenuNode, AdminProfileResponse, AdminUser } from '@/types/api';

const TOKEN_KEY = 'botshop:admin-token';

const findFirstMenuPath = (menus: AdminMenuNode[]): string | null => {
  for (const menu of menus) {
    if (menu.children?.length) {
      const childPath = findFirstMenuPath(menu.children);
      if (childPath) {
        return childPath;
      }
    }
    if (menu.path) {
      return menu.path;
    }
  }
  return null;
};

export const useSessionStore = defineStore('admin-session', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const admin = ref<AdminUser | null>(null);
  const menus = ref<AdminMenuNode[]>([]);
  const permissions = ref<string[]>([]);
  const initializing = ref(false);
  const initialized = ref(false);
  const loading = ref(false);
  const profileError = ref<string | null>(null);

  if (token.value) {
    setAuthToken(token.value);
  }

  async function bootstrap() {
    if (initialized.value || initializing.value) {
      return;
    }
    initializing.value = true;
    if (token.value) {
      try {
        await fetchProfile();
      } catch (error) {
        console.error(error);
        logout();
      }
    }
    initialized.value = true;
    initializing.value = false;
  }

  async function login(payload: { username: string; password: string }) {
    loading.value = true;
    try {
      const data = await adminLogin(payload);
      applySession(data);
      // 立即获取完整的 profile（包含 menus 和 permissions）
      await fetchProfile();
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: { username: string; password: string; nickname?: string }) {
    loading.value = true;
    try {
      const data = await adminRegister(payload);
      applySession(data);
      // 立即获取完整的 profile（包含 menus 和 permissions）
      await fetchProfile();
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProfile() {
    profileError.value = null;
    const data = await fetchAdminProfile();
    setProfile(data);
    return data;
  }

  function applySession(data: { token: string; admin: AdminProfileResponse['admin']; menus?: AdminMenuNode[]; permissions?: string[] }) {
    token.value = data.token;
    localStorage.setItem(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    if (data.menus && data.permissions) {
      menus.value = data.menus;
      permissions.value = data.permissions;
    }
    admin.value = data.admin;
  }

  function setProfile(data: AdminProfileResponse) {
    admin.value = data.admin;
    menus.value = data.menus;
    permissions.value = data.permissions;
  }

  function logout() {
    token.value = null;
    admin.value = null;
    menus.value = [];
    permissions.value = [];
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
  }

  const isAuthenticated = computed(() => Boolean(token.value));
  const defaultRoute = computed(() => findFirstMenuPath(menus.value));

  return {
    token,
    admin,
    menus,
    permissions,
    loading,
    initialized,
    isAuthenticated,
    defaultRoute,
    bootstrap,
    login,
    register,
    fetchProfile,
    logout,
  };
});
