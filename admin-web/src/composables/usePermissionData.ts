import { ref } from 'vue';
import { fetchPermissions } from '@/api/admin';
import type { PermissionGroup } from '@/constants/permissions';

// 全局缓存权限数据
let cachedPermissionGroups: PermissionGroup[] | null = null;
const permissionGroups = ref<PermissionGroup[]>([]);
const loading = ref(false);
const error = ref<Error | null>(null);

/**
 * 权限数据组合函数
 * 从后端动态加载权限分组数据（用于角色管理等需要展示所有权限的场景）
 */
export function usePermissionData() {
	/**
	 * 加载权限数据
	 */
	const loadPermissions = async (force = false) => {
		// 如果已缓存且不强制刷新，直接返回
		if (cachedPermissionGroups && !force) {
			permissionGroups.value = cachedPermissionGroups;
			return;
		}

		loading.value = true;
		error.value = null;

		try {
			const response = await fetchPermissions();
			
			cachedPermissionGroups = response.groups;
			permissionGroups.value = cachedPermissionGroups;
		} catch (err) {
			error.value = err instanceof Error ? err : new Error('加载权限数据失败');
			console.error('Failed to load permissions:', err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 获取所有权限代码（扁平化）
	 */
	const getAllPermissionCodes = (): string[] => {
		return permissionGroups.value.flatMap(group => 
			group.permissions.map(p => p.code)
		);
	};

	/**
	 * 根据权限代码查找权限信息
	 */
	const getPermissionByCode = (code: string) => {
		for (const group of permissionGroups.value) {
			const permission = group.permissions.find(p => p.code === code);
			if (permission) {
				return { ...permission, group: group.label };
			}
		}
		return null;
	};

	/**
	 * 清除缓存
	 */
	const clearCache = () => {
		cachedPermissionGroups = null;
		permissionGroups.value = [];
	};

	return {
		permissionGroups,
		loading,
		error,
		loadPermissions,
		getAllPermissionCodes,
		getPermissionByCode,
		clearCache,
	};
}
