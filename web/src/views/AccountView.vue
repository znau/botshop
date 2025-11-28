<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NButton, NCard } from 'naive-ui';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const router = useRouter();

const requestLogin = () => {
  router.push({ name: 'Home', query: { login: '1', redirect: router.currentRoute.value.fullPath } });
};

const handleLogout = async () => {
  await session.logout();
  router.push('/');
};
</script>

<template>
  <div class="mx-auto max-w-xl">
    <NCard v-if="session.isAuthenticated" title="账户资料" class="rounded-3xl">
      <div class="flex items-center gap-4">
        <img :src="session.user?.avatar" alt="avatar" class="h-16 w-16 rounded-2xl object-cover" />
        <div>
          <p class="text-lg font-semibold">{{ session.user?.nickname }}</p>
          <p class="text-sm text-body/60">@{{ session.user?.username }}</p>
        </div>
      </div>
      <div class="mt-6 flex gap-4">
        <NButton block secondary @click="() => router.push({ name: 'Orders' })">查看订单</NButton>
        <NButton block type="error" ghost @click="handleLogout">退出登录</NButton>
      </div>
    </NCard>
    <NCard v-else class="rounded-3xl text-center">
      <p class="text-lg font-semibold text-body">尚未登录</p>
      <p class="mt-2 text-sm text-body/60">使用 Telegram 或账号密码登录以同步订单。</p>
      <NButton class="mt-4" type="primary" @click="requestLogin">立即登录</NButton>
    </NCard>
  </div>
</template>
