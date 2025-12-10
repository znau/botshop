/**
 * 权限相关的类型定义和枚举
 * 权限数据从后端 API 动态获取，这里只保留类型定义
 */

/**
 * 权限项
 */
export interface PermissionItem {
	code: string;
	name: string;
	description?: string;
}

/**
 * 权限分组
 */
export interface PermissionGroup {
	name: string;
	label: string;
	permissions: PermissionItem[];
}

/**
 * 菜单类型枚举
 */
export enum MenuType {
	DIRECTORY = 'directory', // 目录
	MENU = 'menu',           // 菜单
	BUTTON = 'button',       // 按钮
	IFRAME = 'iframe',       // 内嵌页面
	LINK = 'link',           // 外链
}

export const MENU_TYPE_OPTIONS = [
	{ label: '目录', value: MenuType.DIRECTORY },
	{ label: '菜单', value: MenuType.MENU },
	{ label: '按钮', value: MenuType.BUTTON },
	{ label: '内嵌页面', value: MenuType.IFRAME },
	{ label: '外链', value: MenuType.LINK },
];


