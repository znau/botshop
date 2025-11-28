<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import ProductCard from '@/components/catalog/ProductCard.vue';
import CategoryRail from '@/components/catalog/CategoryRail.vue';

const catalog = useCatalogStore();
onMounted(() => {
  catalog.fetchCatalog();
});

const featuredProducts = computed(() => catalog.featuredProducts);
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8">
    <section class="rounded-3xl bg-gradient-to-br from-accent to-indigo-500 p-8 text-white">
      <p class="text-sm uppercase tracking-[0.3em]">BotShop</p>
      <h1 class="mt-4 text-3xl font-semibold md:text-4xl">全新数字商品体验</h1>
      <p class="mt-3 max-w-2xl text-white/80">
        即刻解锁一键发货、加密支付与 Telegram Mini App 无缝衔接的电商体验。在任意设备上流畅购物。
      </p>
      <div class="mt-6 flex gap-4">
        <RouterLink to="/catalog" class="rounded-full bg-white px-6 py-2 font-semibold text-accent">立即选购</RouterLink>
        <RouterLink to="/orders" class="rounded-full border border-white/60 px-6 py-2 font-semibold text-white">
          我的订单
        </RouterLink>
      </div>
    </section>

    <CategoryRail :categories="catalog.rootCategories" />

    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-body">精选商品</h2>
        <p class="text-sm text-body/60" v-if="catalog.generatedAt">
          数据更新于 {{ new Date(catalog.generatedAt).toLocaleString() }}
        </p>
      </div>
      <div v-if="catalog.status === 'loading'" class="rounded-2xl border border-dashed border-black/10 p-8 text-center text-body/60">
        正在加载商品...
      </div>
      <div v-else-if="catalog.status === 'error'" class="rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center text-red-600">
        加载失败：{{ catalog.lastError }}
      </div>
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProductCard v-for="product in featuredProducts" :key="product.id" :product="product" />
        <p v-if="!featuredProducts.length" class="col-span-full rounded-2xl border border-black/5 bg-white p-6 text-center text-body/60">
          暂无可用商品，敬请期待。
        </p>
      </div>
    </section>
  </div>
</template>
