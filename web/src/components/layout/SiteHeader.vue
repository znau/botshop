<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { NButton, NDropdown, NAvatar } from 'naive-ui';
import { useSessionStore } from '@/stores/session';

const emit = defineEmits<{ (event: 'request-login'): void }>();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const navLinks = [
  { name: '首页', path: '/', exact: true },
  { name: '商品目录', path: '/catalog' },
  { name: '订单', path: '/orders', requiresAuth: true },
];

const dropdownOptions = computed(() => [
  { label: '我的订单', key: 'orders' },
  { label: '账户中心', key: 'account' },
  { label: '退出登录', key: 'logout' },
]);

const handleSelect = async (key: string) => {
  if (key === 'logout') {
    await session.logout();
    return;
  }
  if (key === 'orders') {
    router.push({ name: 'Orders' });
    return;
  }
  if (key === 'account') {
    router.push({ name: 'Account' });
  }
};

const isActive = (path: string, exact = false) => {
  if (exact) {
    return route.path === path;
  }
  return route.path.startsWith(path);
};
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold text-body">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft font-bold text-accent">
          B
        </span>
        BotShop
      </RouterLink>
      <nav class="hidden gap-6 text-sm font-medium md:flex">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="transition-colors"
          :class="isActive(link.path, link.exact) ? 'text-accent' : 'text-body/70 hover:text-body'"
        >
          {{ link.name }}
        </RouterLink>
      </nav>
      <div class="flex items-center gap-4">
        <template v-if="session.isAuthenticated">
          <NDropdown trigger="click" :options="dropdownOptions" @select="handleSelect">
            <NAvatar size="medium" :src="session.user?.avatar" :fallback-src="session.user?.avatar">
              {{ session.displayName[0] }}
            </NAvatar>
          </NDropdown>
        </template>
        <template v-else>
          <NButton type="primary" round @click="() => emit('request-login')">登录/注册</NButton>
        </template>
      </div>
    </div>
  </header>
</template>
