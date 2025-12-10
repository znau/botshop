import { AdminPermission } from '@/enum/adminPermission';

export type AdminMenuSeed = {
	id: string;
	title: string;
	path: string;
	menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link'; // 目录、菜单、按钮、内嵌、外链
	icon?: string;
	component?: string;
	permission?: string;
	sort?: number;
	children?: AdminMenuSeed[];
};

export const DEFAULT_ADMIN_MENUS: AdminMenuSeed[] = [
	{
		id: 'dashboard',
		title: '仪表盘',
		path: '/dashboard',
		menuType: 'menu',
		icon: 'carbon:dashboard',
		component: 'Dashboard',
		permission: AdminPermission.DASHBOARD_VIEW,
		sort: 10,
	},
	{
		id: 'catalog',
		title: '商品中心',
		path: '/catalog',
		menuType: 'directory',
		icon: 'carbon:catalog',
		sort: 20,
		children: [
			{
				id: 'catalog-categories',
				title: '分类管理',
				path: '/catalog/categories',
				menuType: 'menu',
				component: 'Categories',
				permission: AdminPermission.CATEGORIES_READ,
				sort: 21,
			},
			{
				id: 'catalog-products',
				title: '商品管理',
				path: '/catalog/products',
				menuType: 'menu',
				component: 'Products',
				permission: AdminPermission.PRODUCTS_READ,
				sort: 22,
			},
		],
	},
	{
		id: 'orders',
		title: '订单管理',
		path: '/orders',
		menuType: 'menu',
		icon: 'carbon:order-details',
		component: 'Orders',
		permission: AdminPermission.ORDERS_READ,
		sort: 30,
	},
	{
		id: 'users',
		title: '用户管理',
		path: '/users',
		menuType: 'menu',
		icon: 'carbon:user-multiple',
		component: 'Users',
		permission: AdminPermission.USERS_READ,
		sort: 40,
	},
	{
		id: 'system',
		title: '系统管理',
		path: '/system',
		menuType: 'directory',
		icon: 'carbon:settings',
		sort: 50,
		children: [
			{
				id: 'system-menus',
				title: '菜单管理',
				path: '/system/menus',
				menuType: 'menu',
				component: 'Menus',
				permission: AdminPermission.MENUS_READ,
				sort: 51,
			},
			{
				id: 'system-roles',
				title: '角色管理',
				path: '/system/roles',
				menuType: 'menu',
				component: 'Roles',
				permission: AdminPermission.ROLES_READ,
				sort: 52,
			},
			{
				id: 'system-admins',
				title: '管理员',
				path: '/system/admins',
				menuType: 'menu',
				component: 'AdminAccounts',
				permission: AdminPermission.ADMINS_READ,
				sort: 53,
			},
		],
	},
];
