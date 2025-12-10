/**
 * 布局系统类型定义
 */

import type { Component } from 'vue';
import type { RouteLocationMatched } from 'vue-router';

/**
 * 菜单选项类型
 */
export interface LayoutMenuOption {
  /** 菜单唯一标识 */
  key: string;
  /** 菜单标题 */
  label: string | (() => any);
  /** 菜单图标 */
  icon?: () => any;
  /** 子菜单 */
  children?: LayoutMenuOption[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外数据 */
  extra?: any;
}

/**
 * 面包屑项类型
 */
export interface BreadcrumbItem {
  /** 标题 */
  title: string;
  /** 路径 */
  path: string;
  /** 是否可点击 */
  clickable?: boolean;
}

/**
 * 标签页项类型
 */
export interface TabItem {
  /** 唯一标识（通常是路由路径） */
  key: string;
  /** 标签标题 */
  label: string;
  /** 是否可关闭 */
  closable: boolean;
  /** 路由元信息 */
  meta?: any;
}

/**
 * 用户菜单选项类型
 */
export interface UserMenuOption {
  /** 菜单项标识 */
  key: string;
  /** 菜单标签 */
  label: string;
  /** 图标 */
  icon?: () => any;
  /** 菜单类型 */
  type?: 'default' | 'divider';
}

/**
 * 侧边栏配置类型
 */
export interface SidebarConfig {
  /** 默认宽度 */
  width: number;
  /** 折叠后宽度 */
  collapsedWidth: number;
  /** 默认是否折叠 */
  defaultCollapsed: boolean;
}

/**
 * 顶栏配置类型
 */
export interface HeaderConfig {
  /** 高度 */
  height: number;
  /** 是否固定 */
  fixed: boolean;
}

/**
 * 内容区域配置类型
 */
export interface ContentConfig {
  /** 内边距 */
  padding: number;
  /** 是否显示返回顶部按钮 */
  showBackTop: boolean;
}

/**
 * 标签页配置类型
 */
export interface TabsConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 是否缓存 */
  cache: boolean;
  /** 最大缓存数量 */
  maxCacheCount: number;
}

/**
 * 主题配置类型
 */
export interface ThemeConfig {
  /** 布局模式 */
  mode: 'sidebar' | 'top' | 'mix';
  /** 主题色 */
  primaryColor: string;
  /** 是否显示面包屑 */
  showBreadcrumb: boolean;
  /** 是否显示标签页 */
  showTabs: boolean;
}

/**
 * 布局状态类型
 */
export interface LayoutState {
  /** 侧边栏是否折叠 */
  collapsed: boolean;
  /** 当前激活的菜单 */
  activeMenu: string;
  /** 打开的标签页列表 */
  tabs: TabItem[];
  /** 当前激活的标签页 */
  activeTab: string;
}
