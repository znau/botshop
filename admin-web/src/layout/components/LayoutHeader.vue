<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, useDialog, useMessage } from 'naive-ui';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BellOutlined,
  SearchOutlined,
} from '@vicons/antd';
import { useSessionStore } from '@/stores/session';
import type { AdminInfo } from '@/types/api';
import MenuSearch from './MenuSearch.vue';

interface Props {
  collapsed: boolean;
  admin: AdminInfo | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'toggleSidebar': [];
}>();

const router = useRouter();
const session = useSessionStore();
const dialog = useDialog();
const message = useMessage();

// 菜单搜索显示状态
const showMenuSearch = ref(false);

// 是否全屏
const isFullscreen = computed(() => !!document.fullscreenElement);

// 用户下拉菜单选项
const userOptions = computed(() => [
  {
    label: '个人设置',
    key: 'profile',
    icon: renderIcon('user'),
  },
  {
    type: 'divider',
    key: 'divider',
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon('logout'),
  },
]);

// 渲染图标
function renderIcon(icon: string) {
  const icons: Record<string, any> = {
    user: () => h('span', '👤'),
    logout: () => h('span', '🚪'),
  };
  return icons[icon] || (() => null);
}

// 刷新页面
const handleRefresh = () => {
  location.reload();
};

// 切换全屏
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    message.error('全屏切换失败');
  }
};

// 用户菜单选择
const handleUserMenuSelect = (key: string) => {
  if (key === 'logout') {
    handleLogout();
  } else if (key === 'profile') {
    message.info('个人设置功能开发中');
  }
};

// 退出登录
const handleLogout = () => {
  dialog.warning({
    title: '退出登录',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      session.logout();
      router.push('/login');
      message.success('已退出登录');
    },
  });
};
</script>

<template>
  <n-layout-header bordered class="layout-header">
    <div class="header-left">
      <!-- 折叠按钮 -->
      <n-button
        quaternary
        circle
        class="trigger-btn"
        @click="emit('toggleSidebar')"
      >
        <template #icon>
          <n-icon :component="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined" />
        </template>
      </n-button>

      <!-- 面包屑导航可以在这里添加 -->
    </div>

    <div class="header-right">
      <!-- 搜索菜单 -->
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button quaternary circle @click="showMenuSearch = true">
            <template #icon>
              <n-icon :component="SearchOutlined" />
            </template>
          </n-button>
        </template>
        <div style="display: flex; align-items: center; gap: 4px;">
          搜索菜单
          <kbd style="margin-left: 4px; padding: 2px 6px; background: rgba(255,255,255,0.2); border-radius: 3px; font-size: 11px;">Ctrl+K</kbd>
        </div>
      </n-tooltip>

      <!-- 刷新 -->
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button quaternary circle @click="handleRefresh">
            <template #icon>
              <n-icon :component="ReloadOutlined" />
            </template>
          </n-button>
        </template>
        刷新页面
      </n-tooltip>

      <!-- 通知 -->
      <n-badge :value="0" :max="99">
        <n-button quaternary circle>
          <template #icon>
            <n-icon :component="BellOutlined" />
          </template>
        </n-button>
      </n-badge>

      <!-- 全屏 -->
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button quaternary circle @click="toggleFullscreen">
            <template #icon>
              <n-icon :component="isFullscreen ? FullscreenExitOutlined : FullscreenOutlined" />
            </template>
          </n-button>
        </template>
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </n-tooltip>

      <!-- 分割线 -->
      <n-divider vertical />

      <!-- 用户信息 -->
      <n-dropdown
        v-if="admin"
        :options="userOptions"
        @select="handleUserMenuSelect"
      >
        <div class="user-info">
          <n-avatar
            round
            :size="36"
            :src="admin.avatar"
          >
            {{ admin.nickname.slice(0, 1).toUpperCase() }}
          </n-avatar>
          <div class="user-meta">
            <span class="user-name">{{ admin.nickname }}</span>
            <span class="user-role">{{ admin.role?.name || '管理员' }}</span>
          </div>
        </div>
      </n-dropdown>
    </div>

    <!-- 菜单搜索对话框 -->
    <MenuSearch v-model:show="showMenuSearch" />
  </n-layout-header>
</template>

<style scoped>
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 20px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trigger-btn {
  font-size: 18px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  color: #1f2d3d;
}

.user-role {
  font-size: 12px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.45);
}
</style>
