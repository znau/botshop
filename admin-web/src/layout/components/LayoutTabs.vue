<script setup lang="ts">
import { computed, watch, ref, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import { ReloadOutlined, CloseOutlined } from '@vicons/antd';

interface Tab {
  key: string;
  label: string;
  closable: boolean;
}

const router = useRouter();
const route = useRoute();

// 标签页列表（从 localStorage 恢复或使用默认值）
const tabs = ref<Tab[]>(loadTabsFromStorage() || [
  {
    key: '/dashboard',
    label: '控制台',
    closable: false,
  },
]);

// 当前激活的标签页
const activeTab = computed(() => route.path);

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuTab = ref<string>('');

// 从 localStorage 加载标签页
function loadTabsFromStorage(): Tab[] | null {
  try {
    const saved = localStorage.getItem('admin-tabs');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// 保存标签页到 localStorage
function saveTabsToStorage() {
  try {
    localStorage.setItem('admin-tabs', JSON.stringify(tabs.value));
  } catch (e) {
    console.error('保存标签页失败:', e);
  }
}

// 监听路由变化，添加标签页
watch(
  () => route.path,
  (newPath) => {
    // 排除重定向路由和隐藏路由
    if (newPath.startsWith('/redirect') || route.meta?.hidden) {
      return;
    }
    
    if (!tabs.value.find((tab) => tab.key === newPath)) {
      const title = (route.meta?.title as string) || route.name?.toString() || getPageTitle(newPath);
      tabs.value.push({
        key: newPath,
        label: title,
        closable: true,
      });
      saveTabsToStorage();
    }
  },
  { immediate: true }
);

// 获取页面标题
function getPageTitle(path: string): string {
  const pathMap: Record<string, string> = {
    '/dashboard': '控制台',
    '/catalog/categories': '分类管理',
    '/catalog/products': '产品管理',
    '/orders': '订单管理',
    '/users': '用户管理',
    '/system/menus': '菜单管理',
    '/system/roles': '角色管理',
    '/system/admins': '管理员',
  };
  return pathMap[path] || '未命名页面';
}

// 切换标签页
const handleTabChange = (value: string) => {
  router.push(value);
};

// 关闭标签页
const handleTabClose = (key: string) => {
  const index = tabs.value.findIndex((tab) => tab.key === key);
  if (index === -1) return;

  tabs.value.splice(index, 1);

  // 如果关闭的是当前标签页，跳转到上一个或下一个
  if (key === activeTab.value) {
    const nextTab = tabs.value[index] || tabs.value[index - 1];
    if (nextTab) {
      router.push(nextTab.key);
    }
  }
  
  saveTabsToStorage();
};

// 刷新标签页
const handleRefreshTab = (key: string) => {
  if (key === activeTab.value) {
    // 强制刷新当前路由
    router.replace({ path: '/redirect' + key });
  }
};

// 右键菜单
const handleContextMenu = (e: MouseEvent, key: string) => {
  e.preventDefault();
  contextMenuTab.value = key;
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
  contextMenuVisible.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false;
};

// 关闭其他标签页
const handleCloseOthers = () => {
  tabs.value = tabs.value.filter((tab) => !tab.closable || tab.key === contextMenuTab.value);
  closeContextMenu();
  saveTabsToStorage();
};

// 关闭左侧标签页
const handleCloseLeft = () => {
  const index = tabs.value.findIndex((tab) => tab.key === contextMenuTab.value);
  tabs.value = tabs.value.filter((tab, i) => !tab.closable || i >= index);
  closeContextMenu();
  saveTabsToStorage();
};

// 关闭右侧标签页
const handleCloseRight = () => {
  const index = tabs.value.findIndex((tab) => tab.key === contextMenuTab.value);
  tabs.value = tabs.value.filter((tab, i) => !tab.closable || i <= index);
  closeContextMenu();
  saveTabsToStorage();
};

// 关闭所有标签页
const handleCloseAll = () => {
  tabs.value = tabs.value.filter((tab) => !tab.closable);
  router.push('/dashboard');
  closeContextMenu();
  saveTabsToStorage();
};

// 右键菜单选项
const contextMenuOptions = computed(() => {
  const currentIndex = tabs.value.findIndex((tab) => tab.key === contextMenuTab.value);
  const currentTab = tabs.value[currentIndex];
  
  return [
    {
      label: '刷新',
      key: 'refresh',
      icon: () => h(NIcon, null, { default: () => h(ReloadOutlined) }),
    },
    {
      label: '关闭',
      key: 'close',
      disabled: !currentTab?.closable,
      icon: () => h(NIcon, null, { default: () => h(CloseOutlined) }),
    },
    {
      type: 'divider',
      key: 'divider1',
    },
    {
      label: '关闭其他',
      key: 'close-others',
      disabled: tabs.value.filter(t => t.closable && t.key !== contextMenuTab.value).length === 0,
    },
    {
      label: '关闭左侧',
      key: 'close-left',
      disabled: currentIndex === 0 || tabs.value.slice(0, currentIndex).every(t => !t.closable),
    },
    {
      label: '关闭右侧',
      key: 'close-right',
      disabled: currentIndex === tabs.value.length - 1 || tabs.value.slice(currentIndex + 1).every(t => !t.closable),
    },
    {
      type: 'divider',
      key: 'divider2',
    },
    {
      label: '关闭所有',
      key: 'close-all',
      disabled: tabs.value.filter(t => t.closable).length === 0,
    },
  ];
});

// 处理右键菜单选择
const handleContextMenuSelect = (key: string) => {
  switch (key) {
    case 'refresh':
      handleRefreshTab(contextMenuTab.value);
      break;
    case 'close':
      handleTabClose(contextMenuTab.value);
      break;
    case 'close-others':
      handleCloseOthers();
      break;
    case 'close-left':
      handleCloseLeft();
      break;
    case 'close-right':
      handleCloseRight();
      break;
    case 'close-all':
      handleCloseAll();
      break;
  }
  closeContextMenu();
};

// 点击其他地方关闭菜单
if (typeof window !== 'undefined') {
  window.addEventListener('click', closeContextMenu);
}
</script>

<template>
  <div class="layout-tabs">
    <n-tabs
      type="card"
      :value="activeTab"
      closable
      @update:value="handleTabChange"
      @close="handleTabClose"
    >
      <n-tab
        v-for="tab in tabs"
        :key="tab.key"
        :name="tab.key"
        :closable="tab.closable"
        @contextmenu="handleContextMenu($event, tab.key)"
      >
        {{ tab.label }}
      </n-tab>
    </n-tabs>

    <!-- 右键菜单 -->
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="contextMenuVisible"
      :on-clickoutside="closeContextMenu"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<style scoped>
.layout-tabs {
  background-color: #fff;
  padding: 6px 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.layout-tabs :deep(.n-tabs) {
  height: 40px;
}

.layout-tabs :deep(.n-tabs-tab) {
  padding: 6px 12px;
  font-size: 13px;
  user-select: none;
}

.layout-tabs :deep(.n-tabs-tab:hover) {
  color: #18a058;
}

.layout-tabs :deep(.n-tabs-tab--active) {
  font-weight: 600;
}
</style>
