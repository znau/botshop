import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

import AdminLayout from '@/layout/index.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RedirectView from '@/views/redirect/RedirectView.vue';
import { pinia } from '@/stores';
import { useSessionStore } from '@/stores/session';
import type { AdminMenuNode } from '@/types/api';

// 视图组件映射
const viewComponents: Record<string, () => Promise<any>> = {
  DashboardView: () => import('@/views/dashboard/DashboardView.vue'),
  CategoriesView: () => import('@/views/catalog/CategoriesView.vue'),
  ProductsView: () => import('@/views/catalog/ProductsView.vue'),
  OrdersView: () => import('@/views/orders/OrdersView.vue'),
  UsersView: () => import('@/views/users/UsersView.vue'),
  MenusView: () => import('@/views/system/MenusView.vue'),
  RolesView: () => import('@/views/system/RolesView.vue'),
  AdminAccountsView: () => import('@/views/system/AdminAccountsView.vue'),
};

/**
 * 将菜单节点转换为路由配置（扁平化处理）
 */
function menuToRoute(menu: AdminMenuNode): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  // 跳过按钮类型的菜单
  if (menu.menuType === 'button') {
    return routes;
  }

  // 处理不同类型的菜单
  if (menu.menuType === 'directory') {
    // 目录类型：递归处理子菜单
    if (menu.children?.length) {
      menu.children.forEach(child => {
        routes.push(...menuToRoute(child));
      });
    }
  } else if (menu.menuType === 'iframe' || menu.menuType === 'link') {
    // 内嵌或外链：使用特殊组件
    routes.push({
      path: menu.path,
      name: menu.id,
      meta: {
        title: menu.title,
        icon: menu.icon,
        permission: menu.permission,
        menuType: menu.menuType,
        isIframe: menu.menuType === 'iframe',
        isLink: menu.menuType === 'link',
      },
      // 可以创建一个专门的 IframeView 组件来处理
    });
  } else if (menu.component) {
    // 普通菜单：加载对应的组件
    const componentLoader = viewComponents[menu.component];
    if (componentLoader) {
      routes.push({
        path: menu.path,
        name: menu.id,
        component: componentLoader,
        meta: {
          title: menu.title,
          icon: menu.icon,
          permission: menu.permission,
          menuType: menu.menuType,
        },
      });
    } else {
      console.warn(`未找到组件: ${menu.component}`);
    }
  }

  return routes;
}

/**
 * 根据菜单生成动态路由（扁平化）
 */
export function generateRoutesFromMenus(menus: AdminMenuNode[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  menus.forEach(menu => {
    routes.push(...menuToRoute(menu));
  });
  return routes;
}

// 基础静态路由
const staticRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'AdminLogin', component: LoginView, meta: { public: true } },
  {
    path: '/',
    name: 'AdminLayout',
    component: AdminLayout,
    children: [
      { path: '/redirect/:path(.*)', name: 'Redirect', component: RedirectView, meta: { public: true, hidden: true } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/login' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: staticRoutes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 标记是否已添加动态路由
let dynamicRoutesAdded = false;

/**
 * 添加动态路由
 */
export function addDynamicRoutes(menus: AdminMenuNode[]) {
  if (dynamicRoutesAdded) {
    return;
  }

  const dynamicRoutes = generateRoutesFromMenus(menus);
  
  // 添加到 AdminLayout 路由的子路由
  dynamicRoutes.forEach(route => {
    router.addRoute('AdminLayout', route);
  });
  
  dynamicRoutesAdded = true;
}

/**
 * 重置动态路由（用于登出时清理）
 */
export function resetDynamicRoutes() {
  dynamicRoutesAdded = false;
  // 重新创建路由器会更彻底，但也可以通过 removeRoute 逐个删除
}

router.beforeEach(async (to, from) => {
  const session = useSessionStore(pinia);
  await session.bootstrap();

  // 公开路由处理
  if (to.meta?.public) {
    // 已登录访问登录页，跳转到默认路由
    if (to.path === '/login' && session.isAuthenticated) {
      // 动态添加路由（如果还没添加）
      if (session.menus.length > 0 && !dynamicRoutesAdded) {
        addDynamicRoutes(session.menus);
      }
      
      const defaultRoute = session.defaultRoute && session.defaultRoute !== '/login' 
        ? session.defaultRoute 
        : '/dashboard';
      return defaultRoute;
    }
    return true;
  }

  // 未登录跳转到登录页
  if (!session.isAuthenticated) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' && to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : undefined,
    };
  }

  // 动态添加路由（首次登录后）
  if (session.menus.length > 0 && !dynamicRoutesAdded) {
    addDynamicRoutes(session.menus);
    // 如果当前路由是根路径，重定向到默认路由
    if (to.path === '/') {
      const defaultRoute = session.defaultRoute && session.defaultRoute !== '/login'
        ? session.defaultRoute
        : '/dashboard';
      return defaultRoute;
    }
    // 重新导航到目标路由
    return { ...to, replace: true };
  }

  // 如果访问根路径，重定向到默认路由
  if (to.path === '/') {
    const defaultRoute = session.defaultRoute && session.defaultRoute !== '/login'
      ? session.defaultRoute
      : '/dashboard';
    return defaultRoute;
  }

  // 权限检查
  const required = to.meta?.permission as string | undefined;
  if (required) {
    const hasWildcard = session.permissions.includes('*');
    const hasPermission = hasWildcard || session.permissions.includes(required);
    if (!hasPermission) {
      const fallback = session.defaultRoute && session.defaultRoute !== '/login'
        ? session.defaultRoute
        : '/dashboard';
      // 避免无限重定向
      if (to.path !== fallback) {
        return fallback;
      }
      // 如果默认路由也没有权限，返回 false
      return false;
    }
  }

  return true;
});

export default router;
