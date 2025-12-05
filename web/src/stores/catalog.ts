import { defineStore } from 'pinia';
import { shopApi } from '@/api/shop';
import type { CatalogResponse, CategoryNode, Product } from '@/types/api';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const flattenCategories = (nodes: CategoryNode[]): CategoryNode[] => {
  const result: CategoryNode[] = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCategories(node.children));
    }
  });
  return result;
};

const flattenProducts = (nodes: CategoryNode[]): Product[] => {
  const result: Product[] = [];
  nodes.forEach((node) => {
    result.push(...node.products);
    if (node.children?.length) {
      result.push(...flattenProducts(node.children));
    }
  });
  return result;
};

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [] as CategoryNode[],
    generatedAt: '',
    status: 'idle' as LoadState,
    lastError: '',
  }),
  getters: {
    rootCategories: (state) => state.categories,
    allCategories: (state) => flattenCategories(state.categories),
    allProducts: (state) => flattenProducts(state.categories),
    featuredProducts: (state) => flattenProducts(state.categories).slice(0, 8),
    getCategoryById: (state) => (id: string | undefined) => {
      if (!id) return null;
      return flattenCategories(state.categories).find((item) => item.id === id) ?? null;
    },
  },
  actions: {
    async fetchCatalog(force = false) {
      if (this.status === 'loading') return;
      if (this.status === 'ready' && !force) return;
      this.status = 'loading';
      this.lastError = '';
      try {
        const payload: CatalogResponse = await shopApi.getCatalog();
        this.categories = payload.categories;
        this.generatedAt = payload.generatedAt;
        this.status = 'ready';
      } catch (error) {
        console.error('catalog fetch failed', error);
        this.lastError = error instanceof Error ? error.message : '加载失败';
        this.status = 'error';
      }
    },
  },
});
