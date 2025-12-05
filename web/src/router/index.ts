import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import CatalogView from '@/views/CatalogView.vue';
import ProductView from '@/views/ProductView.vue';
import OrdersView from '@/views/OrdersView.vue';
import AccountView from '@/views/AccountView.vue';
import { useSessionStore } from '@/stores/session';
import { pinia } from '@/stores';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: HomeView },
    { path: '/catalog/:categoryId?', name: 'Catalog', component: CatalogView, props: true },
    { path: '/products/:productId', name: 'Product', component: ProductView, props: true },
    { path: '/orders', name: 'Orders', component: OrdersView, meta: { requiresAuth: true } },
    { path: '/account', name: 'Account', component: AccountView, meta: { requiresAuth: true } },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) {
    return true;
  }
  const session = useSessionStore(pinia);
  if (!session.isAuthenticated) {
    await session.bootstrap();
  }
  if (!session.isAuthenticated) {
    return {
      name: 'Home',
      query: { login: '1', redirect: to.fullPath },
    };
  }
  return true;
});

export default router;
