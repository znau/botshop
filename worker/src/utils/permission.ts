/**
 * 权限工具函数
 */

import { PERMISSION_DEPENDENCIES } from '../enum/adminPermission';

/**
 * 检查用户是否拥有指定权限
 * 支持通配符 * 和权限依赖
 */
export function hasPermission(userPermissions: string[], requiredPermission: string | string[]): boolean {
	// 如果没有权限要求，直接返回 true
	if (!requiredPermission || (Array.isArray(requiredPermission) && requiredPermission.length === 0)) {
		return true;
	}

	// 如果没有用户权限，返回 false
	if (!userPermissions || userPermissions.length === 0) {
		return false;
	}

	// 检查通配符权限（超级管理员）
	if (userPermissions.includes('*')) {
		return true;
	}

	// 处理单个权限
	if (typeof requiredPermission === 'string') {
		return checkSinglePermission(userPermissions, requiredPermission);
	}

	// 处理权限数组（需要满足其中任意一个）
	return requiredPermission.some((perm) => checkSinglePermission(userPermissions, perm));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) {
		return true;
	}

	if (!userPermissions || userPermissions.length === 0) {
		return false;
	}

	// 通配符权限
	if (userPermissions.includes('*')) {
		return true;
	}

	return requiredPermissions.every((perm) => checkSinglePermission(userPermissions, perm));
}

/**
 * 检查单个权限（包含依赖关系）
 */
function checkSinglePermission(userPermissions: string[], requiredPermission: string): boolean {
	// 直接匹配
	if (userPermissions.includes(requiredPermission)) {
		return true;
	}

	// 检查是否有包含该权限的父权限（如 manage 权限）
	const [resource] = requiredPermission.split(':');
	const managePermission = `${resource}:manage`;

	if (userPermissions.includes(managePermission)) {
		return true;
	}

	return false;
}

/**
 * 展开权限（包含依赖权限）
 * 例如: ['products:manage'] => ['products:manage', 'products:read', 'products:create', 'products:update', 'products:delete', ...]
 */
export function expandPermissions(permissions: string[]): string[] {
	const expanded = new Set<string>();

	for (const permission of permissions) {
		// 添加权限本身
		expanded.add(permission);

		// 如果是通配符，直接返回
		if (permission === '*') {
			return ['*'];
		}

		// 添加依赖权限
		const dependencies = PERMISSION_DEPENDENCIES[permission];
		if (dependencies) {
			dependencies.forEach((dep) => expanded.add(dep));
		}
	}

	return Array.from(expanded);
}

/**
 * 合并权限（去除冗余）
 * 如果有 manage 权限，移除该资源下的其他权限
 */
export function mergePermissions(permissions: string[]): string[] {
	// 如果包含通配符，只返回通配符
	if (permissions.includes('*')) {
		return ['*'];
	}

	const result = new Set<string>();
	const managePermissions = new Set<string>();

	// 先找出所有的 manage 权限
	for (const permission of permissions) {
		if (permission.endsWith(':manage')) {
			managePermissions.add(permission);
			result.add(permission);
		}
	}

	// 添加非冗余权限
	for (const permission of permissions) {
		if (permission.endsWith(':manage')) {
			continue; // 已经添加过了
		}

		const [resource] = permission.split(':');
		const managePermission = `${resource}:manage`;

		// 如果没有对应的 manage 权限，则添加
		if (!managePermissions.has(managePermission)) {
			result.add(permission);
		}
	}

	return Array.from(result);
}

/**
 * 解析权限代码
 */
export function parsePermission(permissionCode: string): { resource: string; action: string } | null {
	if (!permissionCode || permissionCode === '*') {
		return null;
	}

	const parts = permissionCode.split(':');
	if (parts.length !== 2) {
		return null;
	}

	return {
		resource: parts[0],
		action: parts[1],
	};
}

/**
 * 构建权限代码
 */
export function buildPermission(resource: string, action: string): string {
	return `${resource}:${action}`;
}

/**
 * 获取资源的所有权限
 */
export function getResourcePermissions(permissions: string[], resource: string): string[] {
	return permissions.filter((perm) => {
		if (perm === '*') return true;
		const parsed = parsePermission(perm);
		return parsed?.resource === resource;
	});
}

/**
 * 权限排序（按资源和操作优先级）
 */
export function sortPermissions(permissions: string[]): string[] {
	const actionPriority: Record<string, number> = {
		manage: 0,
		create: 1,
		read: 2,
		update: 3,
		delete: 4,
		view: 5,
		export: 6,
		import: 7,
	};

	return [...permissions].sort((a, b) => {
		if (a === '*') return -1;
		if (b === '*') return 1;

		const parsedA = parsePermission(a);
		const parsedB = parsePermission(b);

		if (!parsedA || !parsedB) return 0;

		// 先按资源排序
		if (parsedA.resource !== parsedB.resource) {
			return parsedA.resource.localeCompare(parsedB.resource);
		}

		// 再按操作优先级排序
		const priorityA = actionPriority[parsedA.action] ?? 99;
		const priorityB = actionPriority[parsedB.action] ?? 99;

		return priorityA - priorityB;
	});
}
