<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();

const isActive = (name: string) => {
  return route.name === name;
};

const navItems = computed(() => [
  {
    name: 'Home',
    label: '首页',
    icon: 'home',
    path: '/',
  },
  {
    name: 'Catalog',
    label: '商城',
    icon: 'shop',
    path: '/catalog',
  },
  {
    name: 'Orders',
    label: '订单',
    icon: 'receipt',
    path: '/orders',
    requireAuth: true,
  },
  {
    name: 'Account',
    label: '我的',
    icon: 'person',
    path: '/account',
    requireAuth: true,
  },
]);
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
    <div class="flex items-center justify-around px-2 py-2">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[72px]"
        :class="isActive(item.name) 
          ? 'text-indigo-600' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
      >
        <!-- 图标 -->
        <div class="relative">
          <svg v-if="item.icon === 'home'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <svg v-else-if="item.icon === 'shop'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <svg v-else-if="item.icon === 'receipt'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <svg v-else-if="item.icon === 'person'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          
          <!-- 激活指示器 -->
          <div 
            v-if="isActive(item.name)" 
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"
          ></div>
        </div>
        
        <!-- 标签 -->
        <span 
          class="text-xs font-medium transition-all"
          :class="isActive(item.name) ? 'scale-105' : ''"
        >
          {{ item.label }}
        </span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
