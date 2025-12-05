<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from '@/stores/session';
import SidebarMenu from './SidebarMenu.vue';
import HeaderUserMenu from './HeaderUserMenu.vue';

const collapsed = ref(false);
const session = useSessionStore();
const menus = computed(() => session.menus);
const router = useRouter();

const handleMenuSelect = (path: string) => {
  if (path) {
    router.push(path);
  }
};
</script>

<template>
  <n-layout has-sider class="admin-layout full-height-layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sidebar-logo">Botshop Admin</div>
      <SidebarMenu :menus="menus" :collapsed="collapsed" @select="handleMenuSelect" />
    </n-layout-sider>
    <n-layout>
      <n-layout-header class="admin-header" bordered>
        <div />
        <HeaderUserMenu />
      </n-layout-header>
      <n-layout-content class="admin-content">
        <RouterView />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
