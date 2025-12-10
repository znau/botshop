<script setup lang="ts">
import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';
import type { MenuOption } from 'naive-ui';
import { NIcon } from 'naive-ui';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  UserOutlined,
  SettingOutlined,
  FolderOutlined,
} from '@vicons/antd';
import type { AdminMenuNode } from '@/types/api';

interface Props {
  collapsed: boolean;
  menus: AdminMenuNode[];
  activeKey?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:collapsed': [value: boolean];
}>();

// 图标映射
const iconMap: Record<string, any> = {
  dashboard: DashboardOutlined,
  catalog: ShoppingOutlined,
  categories: AppstoreOutlined,
  products: ShoppingOutlined,
  orders: OrderedListOutlined,
  users: UserOutlined,
  system: SettingOutlined,
  default: FolderOutlined,
};

// 渲染图标
function renderIcon(iconName?: string) {
  const IconComponent = iconName && iconMap[iconName] ? iconMap[iconName] : iconMap.default;
  return () => h(NIcon, null, { default: () => h(IconComponent) });
}

// 构建菜单选项
function buildMenuOptions(nodes: AdminMenuNode[]): MenuOption[] {
  return nodes.map((node) => {
    const option: MenuOption = {
      key: node.path || node.id,
      label:
        node.path
          ? () =>
              h(
                RouterLink,
                {
                  to: node.path,
                },
                { default: () => node.title }
              )
          : node.title,
      icon: renderIcon(node.icon),
    };

    if (node.children && node.children.length > 0) {
      option.children = buildMenuOptions(node.children);
    }

    return option;
  });
}

// 菜单选项
const menuOptions = computed(() => buildMenuOptions(props.menus));

// 处理折叠状态变化
const handleCollapse = (value: boolean) => {
  emit('update:collapsed', value);
};
</script>

<template>
  <n-layout-sider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="240"
    :collapsed="collapsed"
    show-trigger
    :native-scrollbar="false"
    @collapse="handleCollapse(true)"
    @expand="handleCollapse(false)"
  >
    <!-- Logo区域 -->
    <div class="sidebar-header" :class="{ collapsed }">
      <div class="logo-wrapper">
        <div class="logo-icon">🤖</div>
        <transition name="logo-text">
          <div v-if="!collapsed" class="logo-text">
            <span class="logo-title">Botshop</span>
            <span class="logo-subtitle">Admin</span>
          </div>
        </transition>
      </div>
    </div>

    <!-- 菜单 -->
    <n-menu
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :options="menuOptions"
      :value="activeKey"
      :indent="24"
      accordion
    />
  </n-layout-sider>
</template>

<style scoped>
.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.sidebar-header.collapsed {
  justify-content: center;
  padding: 0 12px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.logo-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: #18a058;
}

.logo-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1;
  margin-top: 2px;
}

/* Logo文本动画 */
.logo-text-enter-active,
.logo-text-leave-active {
  transition: all 0.3s ease;
}

.logo-text-enter-from,
.logo-text-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
