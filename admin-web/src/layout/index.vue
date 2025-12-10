<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import LayoutHeader from './components/LayoutHeader.vue';
import LayoutSidebar from './components/LayoutSidebar.vue';
import LayoutContent from './components/LayoutContent.vue';
import LayoutTabs from './components/LayoutTabs.vue';

const session = useSessionStore();
const route = useRoute();

// 侧边栏折叠状态
const collapsed = ref(false);

// 当前激活的菜单项
const activeKey = computed(() => route.path);

// 用户信息
const admin = computed(() => session.admin);

// 菜单数据
const menus = computed(() => session.menus);

// 切换侧边栏
const toggleSidebar = () => {
  collapsed.value = !collapsed.value;
};
</script>

<template>
  <n-layout has-sider class="layout-container">
    <!-- 左侧边栏 -->
    <LayoutSidebar
      :collapsed="collapsed"
      :menus="menus"
      :active-key="activeKey"
      @update:collapsed="collapsed = $event"
    />
    
    <!-- 右侧主体区域 -->
    <n-layout class="layout-main">
      <!-- 顶部导航栏 -->
      <LayoutHeader
        :collapsed="collapsed"
        :admin="admin"
        @toggle-sidebar="toggleSidebar"
      />
      
      <!-- 标签页 -->
      <LayoutTabs />
      
      <!-- 内容区域 -->
      <LayoutContent>
        <RouterView v-slot="{ Component, route }">
          <keep-alive :include="[]">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </RouterView>
      </LayoutContent>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
  background-color: #f5f6fb;
}

.layout-main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
