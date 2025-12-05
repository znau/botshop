<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const admin = computed(() => session.admin);
const router = useRouter();

const handleLogout = () => {
  session.logout();
  router.push('/login');
};
</script>

<template>
  <div class="header-user" v-if="admin">
    <div class="user-meta">
      <n-avatar :size="36" :src="admin.avatar">{{ admin.nickname.slice(0, 1).toUpperCase() }}</n-avatar>
      <div class="user-text">
        <span class="name">{{ admin.nickname }}</span>
        <small class="role">{{ admin.role.name }}</small>
      </div>
    </div>
    <n-button quaternary size="small" @click="handleLogout">退出登录</n-button>
  </div>
</template>

<style scoped>
.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-text {
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: 600;
}
.role {
  color: rgba(0, 0, 0, 0.45);
}
</style>
