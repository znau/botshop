import type { App, Directive, DirectiveBinding } from 'vue';
import { useSessionStore } from '@/stores/session';

/**
 * 权限指令的值类型
 */
type PermissionValue = string | string[] | { value: string | string[]; mode?: 'any' | 'all' };

/**
 * 检查权限
 */
function checkPermission(userPermissions: string[], required: string | string[], mode: 'any' | 'all' = 'any'): boolean {
	if (!required || (Array.isArray(required) && required.length === 0)) {
		return true;
	}

	if (!userPermissions || userPermissions.length === 0) {
		return false;
	}

	// 超级管理员
	if (userPermissions.includes('*')) {
		return true;
	}

	const requiredList = Array.isArray(required) ? required : [required];

	if (mode === 'all') {
		// 需要满足所有权限
		return requiredList.every(perm => hasPermission(userPermissions, perm));
	} else {
		// 满足任意一个权限即可
		return requiredList.some(perm => hasPermission(userPermissions, perm));
	}
}

/**
 * 检查单个权限（支持 manage 继承）
 */
function hasPermission(userPermissions: string[], permission: string): boolean {
	// 直接匹配
	if (userPermissions.includes(permission)) {
		return true;
	}

	// 检查 manage 权限
	const [resource] = permission.split(':');
	const managePermission = `${resource}:manage`;

	if (userPermissions.includes(managePermission)) {
		return true;
	}

	return false;
}

/**
 * 权限指令
 * 
 * 用法：
 * 1. 单个权限: v-permission="'products:create'"
 * 2. 多个权限（满足任意）: v-permission="['products:create', 'products:update']"
 * 3. 多个权限（满足所有）: v-permission="{ value: ['products:read', 'categories:read'], mode: 'all' }"
 * 
 * 如果没有权限，元素会被移除
 */
const permissionDirective: Directive<HTMLElement, PermissionValue> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
		const sessionStore = useSessionStore();
		const userPermissions = sessionStore.user?.permissions ?? [];

		let required: string | string[];
		let mode: 'any' | 'all' = 'any';

		// 解析指令值
		if (typeof binding.value === 'object' && !Array.isArray(binding.value) && binding.value !== null) {
			required = binding.value.value;
			mode = binding.value.mode ?? 'any';
		} else {
			required = binding.value;
		}

		// 检查权限
		const hasRequiredPermission = checkPermission(userPermissions, required, mode);

		// 如果没有权限，移除元素
		if (!hasRequiredPermission) {
			el.parentNode?.removeChild(el);
		}
	},
};

/**
 * 权限指令（显示/隐藏模式）
 * 
 * 用法同 v-permission，但是没有权限时元素会被隐藏（display: none）而不是移除
 */
const permissionShowDirective: Directive<HTMLElement, PermissionValue> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
		updateVisibility(el, binding);
	},
	updated(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
		updateVisibility(el, binding);
	},
};

function updateVisibility(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
	const sessionStore = useSessionStore();
	const userPermissions = sessionStore.user?.permissions ?? [];

	let required: string | string[];
	let mode: 'any' | 'all' = 'any';

	if (typeof binding.value === 'object' && !Array.isArray(binding.value) && binding.value !== null) {
		required = binding.value.value;
		mode = binding.value.mode ?? 'any';
	} else {
		required = binding.value;
	}

	const hasRequiredPermission = checkPermission(userPermissions, required, mode);

	if (hasRequiredPermission) {
		el.style.display = '';
	} else {
		el.style.display = 'none';
	}
}

/**
 * 禁用指令
 * 
 * 用法同 v-permission，但是没有权限时元素会被禁用（添加 disabled 属性）
 */
const permissionDisableDirective: Directive<HTMLElement, PermissionValue> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
		updateDisabledState(el, binding);
	},
	updated(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
		updateDisabledState(el, binding);
	},
};

function updateDisabledState(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
	const sessionStore = useSessionStore();
	const userPermissions = sessionStore.user?.permissions ?? [];

	let required: string | string[];
	let mode: 'any' | 'all' = 'any';

	if (typeof binding.value === 'object' && !Array.isArray(binding.value) && binding.value !== null) {
		required = binding.value.value;
		mode = binding.value.mode ?? 'any';
	} else {
		required = binding.value;
	}

	const hasRequiredPermission = checkPermission(userPermissions, required, mode);

	if (hasRequiredPermission) {
		el.removeAttribute('disabled');
		el.classList.remove('is-disabled');
	} else {
		el.setAttribute('disabled', 'disabled');
		el.classList.add('is-disabled');
	}
}

/**
 * 注册所有权限指令
 */
export function setupPermissionDirectives(app: App) {
	app.directive('permission', permissionDirective);
	app.directive('permission-show', permissionShowDirective);
	app.directive('permission-disable', permissionDisableDirective);
}

export { permissionDirective, permissionShowDirective, permissionDisableDirective };
