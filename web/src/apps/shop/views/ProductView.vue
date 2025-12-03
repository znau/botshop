<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NAlert, useMessage } from 'naive-ui';
import { shopApi } from '@shop/api/shop';
import type { ProductDetailResponse, CheckoutResponse } from '@shop/types/api';
import ProductCard from '@shop/components/catalog/ProductCard.vue';
import { useSessionStore } from '@shop/stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const message = useMessage();

const detail = ref<ProductDetailResponse | null>(null);
const loading = ref(true);
const error = ref('');
const creatingOrder = ref(false);
const deliveryResult = ref<CheckoutResponse | null>(null);

const loadDetail = async () => {
  loading.value = true;
  error.value = '';
  deliveryResult.value = null;
  try {
    const data = await shopApi.getProductDetail(route.params.productId as string);
    detail.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
};

const requireLogin = () => {
  router.push({
    name: 'Product',
    params: { productId: route.params.productId },
    query: { login: '1' },
  });
};

const buyNow = async () => {
  if (!detail.value) return;
  if (!session.isAuthenticated) {
    requireLogin();
    return;
  }
  creatingOrder.value = true;
  try {
    const payload = await shopApi.createOrder({ productId: detail.value.product.id });
    deliveryResult.value = payload;
    message.success(`订单 ${payload.orderSn} 已完成`);
    await session.fetchOrders(true);
  } catch (err) {
    message.error(err instanceof Error ? err.message : '下单失败');
  } finally {
    creatingOrder.value = false;
  }
};

onMounted(loadDetail);
watch(
  () => route.params.productId,
  () => {
    loadDetail();
  },
);

const related = computed(() => detail.value?.related ?? []);
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-8">
    <NAlert v-if="error" type="error" :show-icon="false">{{ error }}</NAlert>
    <div v-else-if="loading" class="rounded-2xl border border-dashed border-black/10 p-8 text-center text-body/60">
      正在加载商品信息...
    </div>
    <section v-else-if="detail" class="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <p class="text-sm text-body/60">{{ detail.product.category.name }}</p>
      <div class="mt-2 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-3xl font-semibold text-body">{{ detail.product.title }}</h1>
          <p class="mt-3 text-body/80">{{ detail.product.description }}</p>
        </div>
        <div class="rounded-2xl bg-accent-soft px-6 py-4 text-right">
          <p class="text-sm text-accent">即时交付</p>
          <p class="text-3xl font-semibold text-accent">{{ detail.product.priceLabel }}</p>
          <NButton class="mt-4" type="primary" secondary :loading="creatingOrder" @click="buyNow">立即购买</NButton>
        </div>
      </div>
      <div v-if="detail.product.attachment" class="mt-6 rounded-2xl bg-black/5 p-4 text-sm text-body/70">
        {{ detail.product.attachment }}
      </div>
    </section>

    <section v-if="deliveryResult" class="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-900">
      <h2 class="text-xl font-semibold">订单已完成 🎉</h2>
      <p class="mt-2 text-sm">订单号：{{ deliveryResult.orderSn }}</p>
      <p class="mt-2 text-lg font-semibold">{{ deliveryResult.product.title }}</p>
      <p class="mt-1">共计 {{ deliveryResult.amount }} {{ deliveryResult.currency }}</p>
      <p v-if="deliveryResult.code" class="mt-3 rounded-xl bg-white/40 p-3 font-mono text-sm tracking-wide">
        激活码：{{ deliveryResult.code }}
      </p>
      <p v-if="deliveryResult.instructions" class="mt-2 text-sm text-body/80">
        {{ deliveryResult.instructions }}
      </p>
      <p v-if="deliveryResult.attachment" class="mt-2 text-sm text-body/80">
        {{ deliveryResult.attachment }}
      </p>
    </section>

    <section v-if="related.length" class="space-y-4">
      <h3 class="text-lg font-semibold text-body">你可能还喜欢</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <ProductCard v-for="item in related" :key="item.id" :product="item" />
      </div>
    </section>
  </div>
</template>
