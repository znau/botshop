import { computed } from 'vue';
import { useSessionStore } from '@/stores/session';

/**
 * 权限检查组合函数
 * 用于检查当前登录用户是否拥有指定权限（用于权限控制、按钮显示/隐藏等）
 */
export function usePermission() {
	const sessionStore = useSessionStore();

	/**
	 * 用户权限列表
	 */
	const permissions = computed(() => sessionStore.user?.permissions ?? []);

	/**
	 * 是否是超级管理员（拥有通配符权限）
	 */
	const isSuperAdmin = computed(() => permissions.value.includes('*'));

	/**
	 * 检查是否拥有指定权限（满足任意一个即可）
	 */
	const hasPermission = (permission: string | string[]): boolean => {
		if (!permission || (Array.isArray(permission) && permission.length === 0)) {
			return true;
		}

		const userPerms = permissions.value;
		if (!userPerms || userPerms.length === 0) {
			return false;
		}

		// 超级管理员
		if (userPerms.includes('*')) {
			return true;
		}

		const required = Array.isArray(permission) ? permission : [permission];
		return required.some(perm => checkSinglePermission(userPerms, perm));
	};

	/**
	 * 检查是否拥有所有指定权限
	 */
	const hasAllPermissions = (perms: string[]): boolean => {
		if (!perms || perms.length === 0) {
			return true;
		}

		const userPerms = permissions.value;
		if (!userPerms || userPerms.length === 0) {
			return false;
		}

		// 超级管理员
		if (userPerms.includes('*')) {
			return true;
		}

		return perms.every(perm => checkSinglePermission(userPerms, perm));
	};

	/**
	 * 检查单个权限（包含 manage 权限的继承）
	 */
	const checkSinglePermission = (userPerms: string[], requiredPerm: string): boolean => {
		// 直接匹配
		if (userPerms.includes(requiredPerm)) {
			return true;
		}

		// 检查是否有 manage 权限（manage 包含该资源的所有权限）
		const [resource] = requiredPerm.split(':');
		const managePermission = `${resource}:manage`;

		if (userPerms.includes(managePermission)) {
			return true;
		}

		return false;
	};

	/**
	 * 获取指定资源的所有权限
	 */
	const getResourcePermissions = (resource: string): string[] => {
		return permissions.value.filter(perm => {
			if (perm === '*') return true;
			const [res] = perm.split(':');
			return res === resource;
		});
	};

	/**
	 * 检查是否拥有指定资源的管理权限
	 */
	const hasResourceManage = (resource: string): boolean => {
		return hasPermission(`${resource}:manage`);
	};

	return {
		permissions,
		isSuperAdmin,
		hasPermission,
		hasAllPermissions,
		getResourcePermissions,
		hasResourceManage,
	};
}
