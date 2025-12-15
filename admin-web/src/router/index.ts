import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { AdminMenu } from '@/types/api';

const componentMap: Record<string, () => Promise<unknown>> = {
	Dashboard: () => import('@/views/DashboardView.vue'),
	DashboardView: () => import('@/views/DashboardView.vue'),
	Categories: () => import('@/views/catalog/CategoriesView.vue'),
	CategoriesView: () => import('@/views/catalog/CategoriesView.vue'),
	Products: () => import('@/views/catalog/ProductsView.vue'),
	ProductsView: () => import('@/views/catalog/ProductsView.vue'),
	Orders: () => import('@/views/OrdersView.vue'),
	OrdersView: () => import('@/views/OrdersView.vue'),
	Users: () => import('@/views/UsersView.vue'),
	UsersView: () => import('@/views/UsersView.vue'),
	Menus: () => import('@/views/system/MenusView.vue'),
	MenusView: () => import('@/views/system/MenusView.vue'),
	Roles: () => import('@/views/system/RolesView.vue'),
	RolesView: () => import('@/views/system/RolesView.vue'),
	AdminAccounts: () => import('@/views/system/AdminAccountsView.vue'),
	AdminAccountsView: () => import('@/views/system/AdminAccountsView.vue'),
};

const staticRoutes: RouteRecordRaw[] = [
	{
		path: '/login',
		name: 'login',
		component: () => import('@/views/LoginView.vue'),
		meta: { public: true, title: '登录' },
	},
	{
		path: '/',
		component: () => import('@/layouts/index.vue'),
		children: [
			{ 
				path: '', 
				name: 'root',
				redirect: '/dashboard' 
			}
		],
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes: staticRoutes,
});

let dynamicAdded = false;

function normalizeName(path: string) {
	return path
		.replace(/^\//, '')
		.replace(/\//g, '_')
		.replace(/[:?]/g, '_')
		|| 'root';
}

function resolveComponent(key?: string | null) {
	if (!key) return null;
	return componentMap[key] || componentMap[key.replace(/View$/, '')];
}

function buildMenuRoutes(menus: AdminMenu[]): RouteRecordRaw[] {
	const routes: RouteRecordRaw[] = [];
	const addNodes = (nodes: AdminMenu[], parentRedirect?: string) => {
		nodes
			.filter((m) => m.menuType !== 'button')
			.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
			.forEach((menu) => {
				const isDirectory = menu.menuType === 'directory';
				const componentLoader = resolveComponent(menu.component || null);
				const route: RouteRecordRaw = {
					path: menu.path,
					name: normalizeName(menu.path),
					meta: { 
						title: menu.title, 
						description: menu.description,
						permission: menu.permission 
					},
				};
				if (isDirectory) {
					// directory acts as container; redirect to first child when available
					const children = menu.children || [];
					const firstChildPath = children[0]?.path;
					if (firstChildPath) {
						route.redirect = firstChildPath;
					}
					addNodes(children, firstChildPath);
					return routes.push(route);
				}
				if (componentLoader) {
					route.component = componentLoader;
					routes.push(route);
				}
			});
	};

	addNodes(menus);
	return routes;
}

router.beforeEach(async (to, from, next) => {
	NProgress.start();
	const auth = useAuthStore();

	if (!to.meta.public && !auth.token) {
		return next({ path: '/login', query: { redirect: to.fullPath } });
	}

	if (auth.token && !auth.profileLoaded) {
		try {
			await auth.bootstrap();
		} catch (error) {
			return next({ path: '/login' });
		}
	}

	if (!dynamicAdded && auth.menus?.length) {
		const menuRoutes = buildMenuRoutes(auth.menus);
		menuRoutes.forEach((route) => router.addRoute('root', route));
		// Add 404 route last to catch unmatched paths
		router.addRoute('root', {
			path: ':pathMatch(.*)*',
			name: 'not-found',
			component: () => import('@/views/NotFoundView.vue'),
			meta: { title: '未找到' },
		});
		dynamicAdded = true;
		// Re-run navigation with newly added routes
		return next({ ...to, replace: true });
	}

	if (to.meta.permission && !auth.hasPermission(String(to.meta.permission))) {
		return next({ path: '/dashboard' });
	}

	next();
});

router.afterEach((to) => {
	if (to.meta.title) {
		document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_NAME ?? 'BotShop Admin'}`;
	}
	NProgress.done();
});

export default router;
