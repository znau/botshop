export const AdminPermission = {
	DASHBOARD_VIEW: 'dashboard:view',
	CATEGORIES_READ: 'categories:read',
	CATEGORIES_WRITE: 'categories:write',
	PRODUCTS_READ: 'products:read',
	PRODUCTS_WRITE: 'products:write',
	ORDERS_READ: 'orders:read',
	ORDERS_UPDATE: 'orders:update',
	USERS_READ: 'users:read',
	USERS_UPDATE: 'users:update',
	MENUS_MANAGE: 'menus:manage',
	ROLES_MANAGE: 'roles:manage',
	ADMINS_MANAGE: 'admins:manage',
} as const;

export const ADMIN_PERMISSIONS = Object.values(AdminPermission);
export type AdminPermissionCode = (typeof ADMIN_PERMISSIONS)[number];
