import { createRouter, createWebHistory } from 'vue-router';

import AdminLayout from '@/components/layout/AdminLayout.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import DashboardView from '@/views/dashboard/DashboardView.vue';
import CategoriesView from '@/views/catalog/CategoriesView.vue';
import ProductsView from '@/views/catalog/ProductsView.vue';
import OrdersView from '@/views/orders/OrdersView.vue';
import UsersView from '@/views/users/UsersView.vue';
import MenusView from '@/views/system/MenusView.vue';
import RolesView from '@/views/system/RolesView.vue';
import AdminAccountsView from '@/views/system/AdminAccountsView.vue';
import { pinia } from '@/stores';
import { useSessionStore } from '@/stores/session';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'AdminLogin', component: LoginView, meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        { path: '/dashboard', name: 'AdminDashboard', component: DashboardView, meta: { permission: 'dashboard:view' } },
        { path: '/catalog/categories', name: 'AdminCategories', component: CategoriesView, meta: { permission: 'categories:read' } },
        { path: '/catalog/products', name: 'AdminProducts', component: ProductsView, meta: { permission: 'products:read' } },
        { path: '/orders', name: 'AdminOrders', component: OrdersView, meta: { permission: 'orders:read' } },
        { path: '/users', name: 'AdminUsers', component: UsersView, meta: { permission: 'users:read' } },
        { path: '/system/menus', name: 'AdminMenus', component: MenusView, meta: { permission: 'menus:manage' } },
        { path: '/system/roles', name: 'AdminRoles', component: RolesView, meta: { permission: 'roles:manage' } },
        { path: '/system/admins', name: 'AdminAccounts', component: AdminAccountsView, meta: { permission: 'admins:manage' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const session = useSessionStore(pinia);
  await session.bootstrap();
  if (to.meta?.public) {
    if (to.path === '/login' && session.isAuthenticated) {
      return session.defaultRoute ?? '/dashboard';
    }
    return true;
  }
  if (!session.isAuthenticated) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    };
  }
  const required = to.meta?.permission as string | undefined;
  if (required) {
    const hasWildcard = session.permissions.includes('*');
    const hasPermission = hasWildcard || session.permissions.includes(required);
    if (!hasPermission) {
      const fallback = session.defaultRoute ?? '/dashboard';
      // 避免无限重定向
      if (to.path !== fallback) {
        return fallback;
      }
      // 如果默认路由也没有权限，返回 403 或其他处理
      return false;
    }
  }
  return true;
});

export default router;
