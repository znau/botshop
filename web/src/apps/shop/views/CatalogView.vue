<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCatalogStore } from '@shop/stores/catalog';
import ProductCard from '@shop/components/catalog/ProductCard.vue';

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();

onMounted(() => {
  catalog.fetchCatalog();
});

const flattened = computed(() => catalog.allCategories);

const activeCategory = computed(() => {
  const id = route.params.categoryId as string | undefined;
  if (id) {
    return catalog.getCategoryById(id);
  }
  return catalog.rootCategories[0] ?? null;
});

const products = computed(() => activeCategory.value?.products ?? []);

const selectCategory = (id: string) => {
  router.push({ name: 'Catalog', params: { categoryId: id } });
};
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row">
    <aside class="w-full rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:w-64">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-body/60">全部分类</h2>
      <div class="flex flex-col gap-2">
        <button
          v-for="category in flattened"
          :key="category.id"
          class="rounded-xl px-3 py-2 text-left text-sm"
          :class="category.id === activeCategory?.id ? 'bg-accent-soft text-accent font-semibold' : 'text-body/70 hover:bg-black/5'"
          @click="selectCategory(category.id)"
        >
          <span class="mr-2">{{ category.emoji ?? '🛒' }}</span>
          {{ category.name }}
        </button>
      </div>
    </aside>
    <section class="flex-1 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-sm text-body/60">当前分类</p>
          <h1 class="text-2xl font-semibold text-body">
            {{ activeCategory?.name ?? '全部商品' }}
          </h1>
        </div>
        <p class="text-sm text-body/60">共 {{ products.length }} 件商品</p>
      </div>
      <div v-if="catalog.status === 'loading'" class="rounded-2xl border border-dashed border-black/10 p-8 text-center text-body/60">
        正在加载商品...
      </div>
      <div v-else class="grid gap-4 md:grid-cols-2">
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
        <p v-if="!products.length" class="col-span-full rounded-2xl border border-black/5 bg-white p-6 text-center text-body/60">
          该分类暂无商品，欢迎稍后再来。
        </p>
      </div>
    </section>
  </div>
</template>
