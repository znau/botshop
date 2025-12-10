/**
 * 布局相关的组合式 API
 */

import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TabItem, LayoutState } from './types';

const STORAGE_KEY = 'botshop-layout-state';

/**
 * 使用布局状态
 */
export function useLayout() {
  const route = useRoute();
  const router = useRouter();

  // 侧边栏折叠状态
  const collapsed = ref(false);

  // 当前激活的菜单
  const activeMenu = computed(() => route.path);

  // 切换侧边栏
  const toggleSidebar = () => {
    collapsed.value = !collapsed.value;
  };

  // 设置侧边栏折叠状态
  const setCollapsed = (value: boolean) => {
    collapsed.value = value;
  };

  return {
    collapsed,
    activeMenu,
    toggleSidebar,
    setCollapsed,
  };
}

/**
 * 使用标签页管理
 */
export function useTabs() {
  const route = useRoute();
  const router = useRouter();

  // 标签页列表
  const tabs = ref<TabItem[]>([
    {
      key: '/dashboard',
      label: '控制台',
      closable: false,
    },
  ]);

  // 当前激活的标签页
  const activeTab = computed(() => route.path);

  // 添加标签页
  const addTab = (tab: TabItem) => {
    const exists = tabs.value.find((t) => t.key === tab.key);
    if (!exists) {
      tabs.value.push(tab);
    }
  };

  // 删除标签页
  const removeTab = (key: string) => {
    const index = tabs.value.findIndex((t) => t.key === key);
    if (index === -1) return;

    tabs.value.splice(index, 1);

    // 如果关闭的是当前标签页，跳转到上一个或下一个
    if (key === activeTab.value) {
      const nextTab = tabs.value[index] || tabs.value[index - 1];
      if (nextTab) {
        router.push(nextTab.key);
      }
    }
  };

  // 关闭其他标签页
  const closeOtherTabs = (key: string) => {
    tabs.value = tabs.value.filter((t) => !t.closable || t.key === key);
  };

  // 关闭所有标签页
  const closeAllTabs = () => {
    tabs.value = tabs.value.filter((t) => !t.closable);
    router.push('/dashboard');
  };

  // 监听路由变化，自动添加标签页
  watch(
    () => route.path,
    (path) => {
      const title = (route.meta?.title as string) || route.name?.toString() || path;
      addTab({
        key: path,
        label: title,
        closable: true,
        meta: route.meta,
      });
    },
    { immediate: true }
  );

  return {
    tabs,
    activeTab,
    addTab,
    removeTab,
    closeOtherTabs,
    closeAllTabs,
  };
}

/**
 * 使用全屏功能
 */
export function useFullscreen() {
  const isFullscreen = ref(false);

  // 切换全屏
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        isFullscreen.value = true;
      } else {
        await document.exitFullscreen();
        isFullscreen.value = false;
      }
    } catch (error) {
      console.error('全屏切换失败:', error);
      throw error;
    }
  };

  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  // 监听全屏变化事件
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }

  return {
    isFullscreen,
    toggleFullscreen,
  };
}

/**
 * 持久化布局状态
 */
export function useLayoutPersist() {
  // 保存状态到本地存储
  const saveState = (state: Partial<LayoutState>) => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      const currentState = savedState ? JSON.parse(savedState) : {};
      const newState = { ...currentState, ...state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('保存布局状态失败:', error);
    }
  };

  // 从本地存储加载状态
  const loadState = (): Partial<LayoutState> | null => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error('加载布局状态失败:', error);
      return null;
    }
  };

  // 清除保存的状态
  const clearState = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('清除布局状态失败:', error);
    }
  };

  return {
    saveState,
    loadState,
    clearState,
  };
}

/**
 * 使用面包屑导航
 */
export function useBreadcrumb() {
  const route = useRoute();

  // 生成面包屑数据
  const breadcrumbs = computed(() => {
    const matched = route.matched.filter((item) => item.meta?.title || item.name);
    return matched.map((item, index) => ({
      title: (item.meta?.title as string) || (item.name as string) || '',
      path: item.path,
      clickable: index < matched.length - 1,
    }));
  });

  return {
    breadcrumbs,
  };
}
