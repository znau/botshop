/**
 * 权限模块定义
 * 使用模块化设计，每个模块包含资源和操作
 */

// 权限操作类型
export const PermissionAction = {
	VIEW: 'view',       // 查看
	READ: 'read',       // 读取列表
	CREATE: 'create',   // 创建
	UPDATE: 'update',   // 更新
	DELETE: 'delete',   // 删除
	MANAGE: 'manage',   // 完全管理（包含所有操作）
	EXPORT: 'export',   // 导出
	IMPORT: 'import',   // 导入
} as const;

// 权限资源模块
export const PermissionResource = {
	DASHBOARD: 'dashboard',
	CATEGORIES: 'categories',
	PRODUCTS: 'products',
	ORDERS: 'orders',
	USERS: 'users',
	MENUS: 'menus',
	ROLES: 'roles',
	ADMINS: 'admins',
	SETTINGS: 'settings',
} as const;

/**
 * 标准权限代码格式: resource:action
 * 例如: products:read, orders:update
 */
export const AdminPermission = {
	// 通配符权限 - 超级管理员
	WILDCARD: '*',
	
	// 仪表盘
	DASHBOARD_VIEW: 'dashboard:view',
	
	// 分类管理
	CATEGORIES_READ: 'categories:read',
	CATEGORIES_CREATE: 'categories:create',
	CATEGORIES_UPDATE: 'categories:update',
	CATEGORIES_DELETE: 'categories:delete',
	CATEGORIES_MANAGE: 'categories:manage',
	
	// 产品管理
	PRODUCTS_READ: 'products:read',
	PRODUCTS_CREATE: 'products:create',
	PRODUCTS_UPDATE: 'products:update',
	PRODUCTS_DELETE: 'products:delete',
	PRODUCTS_MANAGE: 'products:manage',
	PRODUCTS_EXPORT: 'products:export',
	PRODUCTS_IMPORT: 'products:import',
	
	// 订单管理
	ORDERS_READ: 'orders:read',
	ORDERS_VIEW: 'orders:view',
	ORDERS_UPDATE: 'orders:update',
	ORDERS_DELETE: 'orders:delete',
	ORDERS_MANAGE: 'orders:manage',
	ORDERS_EXPORT: 'orders:export',
	
	// 用户管理
	USERS_READ: 'users:read',
	USERS_VIEW: 'users:view',
	USERS_UPDATE: 'users:update',
	USERS_DELETE: 'users:delete',
	USERS_MANAGE: 'users:manage',
	USERS_EXPORT: 'users:export',
	
	// 菜单管理
	MENUS_READ: 'menus:read',
	MENUS_CREATE: 'menus:create',
	MENUS_UPDATE: 'menus:update',
	MENUS_DELETE: 'menus:delete',
	MENUS_MANAGE: 'menus:manage',
	
	// 角色管理
	ROLES_READ: 'roles:read',
	ROLES_CREATE: 'roles:create',
	ROLES_UPDATE: 'roles:update',
	ROLES_DELETE: 'roles:delete',
	ROLES_MANAGE: 'roles:manage',
	
	// 管理员管理
	ADMINS_READ: 'admins:read',
	ADMINS_CREATE: 'admins:create',
	ADMINS_UPDATE: 'admins:update',
	ADMINS_DELETE: 'admins:delete',
	ADMINS_MANAGE: 'admins:manage',
	
	// 系统设置
	SETTINGS_VIEW: 'settings:view',
	SETTINGS_UPDATE: 'settings:update',
	SETTINGS_MANAGE: 'settings:manage',
} as const;

// 所有权限列表
export const ADMIN_PERMISSIONS = Object.values(AdminPermission);
export type AdminPermissionCode = (typeof ADMIN_PERMISSIONS)[number];

/**
 * 权限分组 - 用于前端权限配置界面
 */
export const PERMISSION_GROUPS = [
	{
		key: 'dashboard',
		label: '仪表盘',
		permissions: [
			{ code: AdminPermission.DASHBOARD_VIEW, label: '查看仪表盘', description: '查看系统统计数据和概览' },
		],
	},
	{
		key: 'catalog',
		label: '商品中心',
		permissions: [
			{ code: AdminPermission.CATEGORIES_READ, label: '查看分类', description: '查看分类列表' },
			{ code: AdminPermission.CATEGORIES_CREATE, label: '创建分类', description: '添加新分类' },
			{ code: AdminPermission.CATEGORIES_UPDATE, label: '编辑分类', description: '修改分类信息' },
			{ code: AdminPermission.CATEGORIES_DELETE, label: '删除分类', description: '删除分类（需谨慎）' },
			{ code: AdminPermission.CATEGORIES_MANAGE, label: '完全管理分类', description: '分类的所有操作权限' },
			
			{ code: AdminPermission.PRODUCTS_READ, label: '查看商品', description: '查看商品列表' },
			{ code: AdminPermission.PRODUCTS_CREATE, label: '创建商品', description: '添加新商品' },
			{ code: AdminPermission.PRODUCTS_UPDATE, label: '编辑商品', description: '修改商品信息' },
			{ code: AdminPermission.PRODUCTS_DELETE, label: '删除商品', description: '删除商品' },
			{ code: AdminPermission.PRODUCTS_EXPORT, label: '导出商品', description: '导出商品数据' },
			{ code: AdminPermission.PRODUCTS_IMPORT, label: '导入商品', description: '批量导入商品' },
			{ code: AdminPermission.PRODUCTS_MANAGE, label: '完全管理商品', description: '商品的所有操作权限' },
		],
	},
	{
		key: 'orders',
		label: '订单管理',
		permissions: [
			{ code: AdminPermission.ORDERS_READ, label: '查看订单列表', description: '查看所有订单' },
			{ code: AdminPermission.ORDERS_VIEW, label: '查看订单详情', description: '查看订单详细信息' },
			{ code: AdminPermission.ORDERS_UPDATE, label: '处理订单', description: '更新订单状态、备注等' },
			{ code: AdminPermission.ORDERS_DELETE, label: '删除订单', description: '删除订单记录' },
			{ code: AdminPermission.ORDERS_EXPORT, label: '导出订单', description: '导出订单数据' },
			{ code: AdminPermission.ORDERS_MANAGE, label: '完全管理订单', description: '订单的所有操作权限' },
		],
	},
	{
		key: 'users',
		label: '用户管理',
		permissions: [
			{ code: AdminPermission.USERS_READ, label: '查看用户列表', description: '查看所有用户' },
			{ code: AdminPermission.USERS_VIEW, label: '查看用户详情', description: '查看用户详细信息' },
			{ code: AdminPermission.USERS_UPDATE, label: '管理用户', description: '封禁/解封用户等操作' },
			{ code: AdminPermission.USERS_DELETE, label: '删除用户', description: '删除用户账号' },
			{ code: AdminPermission.USERS_EXPORT, label: '导出用户', description: '导出用户数据' },
			{ code: AdminPermission.USERS_MANAGE, label: '完全管理用户', description: '用户的所有操作权限' },
		],
	},
	{
		key: 'system',
		label: '系统管理',
		permissions: [
			{ code: AdminPermission.MENUS_READ, label: '查看菜单', description: '查看菜单配置' },
			{ code: AdminPermission.MENUS_CREATE, label: '创建菜单', description: '添加新菜单' },
			{ code: AdminPermission.MENUS_UPDATE, label: '编辑菜单', description: '修改菜单配置' },
			{ code: AdminPermission.MENUS_DELETE, label: '删除菜单', description: '删除菜单项' },
			{ code: AdminPermission.MENUS_MANAGE, label: '完全管理菜单', description: '菜单的所有操作权限' },
			
			{ code: AdminPermission.ROLES_READ, label: '查看角色', description: '查看角色列表' },
			{ code: AdminPermission.ROLES_CREATE, label: '创建角色', description: '添加新角色' },
			{ code: AdminPermission.ROLES_UPDATE, label: '编辑角色', description: '修改角色权限' },
			{ code: AdminPermission.ROLES_DELETE, label: '删除角色', description: '删除角色' },
			{ code: AdminPermission.ROLES_MANAGE, label: '完全管理角色', description: '角色的所有操作权限' },
			
			{ code: AdminPermission.ADMINS_READ, label: '查看管理员', description: '查看管理员列表' },
			{ code: AdminPermission.ADMINS_CREATE, label: '创建管理员', description: '添加新管理员' },
			{ code: AdminPermission.ADMINS_UPDATE, label: '编辑管理员', description: '修改管理员信息' },
			{ code: AdminPermission.ADMINS_DELETE, label: '删除管理员', description: '删除管理员账号' },
			{ code: AdminPermission.ADMINS_MANAGE, label: '完全管理管理员', description: '管理员的所有操作权限' },
			
			{ code: AdminPermission.SETTINGS_VIEW, label: '查看设置', description: '查看系统设置' },
			{ code: AdminPermission.SETTINGS_UPDATE, label: '修改设置', description: '修改系统配置' },
			{ code: AdminPermission.SETTINGS_MANAGE, label: '完全管理设置', description: '系统设置的所有操作权限' },
		],
	},
] as const;

/**
 * 权限依赖关系
 * manage 权限包含该资源的所有其他权限
 */
export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
	'categories:manage': ['categories:read', 'categories:create', 'categories:update', 'categories:delete'],
	'products:manage': ['products:read', 'products:create', 'products:update', 'products:delete', 'products:export', 'products:import'],
	'orders:manage': ['orders:read', 'orders:view', 'orders:update', 'orders:delete', 'orders:export'],
	'users:manage': ['users:read', 'users:view', 'users:update', 'users:delete', 'users:export'],
	'menus:manage': ['menus:read', 'menus:create', 'menus:update', 'menus:delete'],
	'roles:manage': ['roles:read', 'roles:create', 'roles:update', 'roles:delete'],
	'admins:manage': ['admins:read', 'admins:create', 'admins:update', 'admins:delete'],
	'settings:manage': ['settings:view', 'settings:update'],
};

/**
 * 预设角色模板
 */
export const ROLE_TEMPLATES = {
	SUPER_ADMIN: {
		name: '超级管理员',
		description: '拥有系统所有权限',
		permissions: [AdminPermission.WILDCARD],
	},
	ADMIN: {
		name: '管理员',
		description: '拥有商品、订单、用户的管理权限',
		permissions: [
			AdminPermission.DASHBOARD_VIEW,
			AdminPermission.CATEGORIES_MANAGE,
			AdminPermission.PRODUCTS_MANAGE,
			AdminPermission.ORDERS_MANAGE,
			AdminPermission.USERS_MANAGE,
		],
	},
	OPERATOR: {
		name: '运营人员',
		description: '负责商品上架和订单处理',
		permissions: [
			AdminPermission.DASHBOARD_VIEW,
			AdminPermission.CATEGORIES_READ,
			AdminPermission.PRODUCTS_READ,
			AdminPermission.PRODUCTS_CREATE,
			AdminPermission.PRODUCTS_UPDATE,
			AdminPermission.ORDERS_READ,
			AdminPermission.ORDERS_VIEW,
			AdminPermission.ORDERS_UPDATE,
		],
	},
	CUSTOMER_SERVICE: {
		name: '客服人员',
		description: '负责订单查看和用户管理',
		permissions: [
			AdminPermission.DASHBOARD_VIEW,
			AdminPermission.ORDERS_READ,
			AdminPermission.ORDERS_VIEW,
			AdminPermission.USERS_READ,
			AdminPermission.USERS_VIEW,
			AdminPermission.USERS_UPDATE,
		],
	},
	VIEWER: {
		name: '只读用户',
		description: '只能查看数据，不能进行任何修改',
		permissions: [
			AdminPermission.DASHBOARD_VIEW,
			AdminPermission.CATEGORIES_READ,
			AdminPermission.PRODUCTS_READ,
			AdminPermission.ORDERS_READ,
			AdminPermission.ORDERS_VIEW,
			AdminPermission.USERS_READ,
		],
	},
} as const;
