/**
 * 布局配置
 */

// 侧边栏配置
export const sidebarConfig = {
  // 默认宽度
  width: 240,
  // 折叠后宽度
  collapsedWidth: 64,
  // 默认是否折叠
  defaultCollapsed: false,
};

// 顶部导航栏配置
export const headerConfig = {
  // 高度
  height: 64,
  // 是否固定
  fixed: true,
};

// 内容区域配置
export const contentConfig = {
  // 内边距
  padding: 24,
  // 是否显示返回顶部按钮
  showBackTop: true,
};

// 标签页配置
export const tabsConfig = {
  // 是否启用标签页
  enabled: false,
  // 是否缓存标签页
  cache: true,
  // 最大缓存数量
  maxCacheCount: 10,
};

// 布局模式
export enum LayoutMode {
  // 侧边栏模式
  SIDEBAR = 'sidebar',
  // 顶部模式
  TOP = 'top',
  // 混合模式
  MIX = 'mix',
}

// 主题配置
export const themeConfig = {
  // 布局模式
  mode: LayoutMode.SIDEBAR,
  // 主题色
  primaryColor: '#18a058',
  // 是否显示面包屑
  showBreadcrumb: false,
  // 是否显示标签页
  showTabs: false,
};
