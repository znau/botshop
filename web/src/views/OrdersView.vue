<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import type { OrdersResponseItem } from '@/types/api';

const session = useSessionStore();
const orders = ref<OrdersResponseItem[]>([]);
const loading = ref(true);
const error = ref('');

const loadOrders = async () => {
  loading.value = true;
  error.value = '';
  try {
    const rows = await session.fetchOrders(true);
    orders.value = rows ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
};

onMounted(loadOrders);
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <header>
      <p class="text-sm text-body/60">我的账户</p>
      <h1 class="text-3xl font-semibold text-body">近期订单</h1>
    </header>
    <div v-if="loading" class="rounded-2xl border border-dashed border-black/10 p-8 text-center text-body/60">
      正在同步订单...
    </div>
    <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center text-red-600">
      {{ error }}
    </div>
    <div v-else-if="!orders.length" class="rounded-2xl border border-black/5 bg-white p-8 text-center text-body/60">
      暂无订单记录。
    </div>
    <ul v-else class="space-y-4">
      <li v-for="order in orders" :key="order.id" class="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm text-body/60">订单号 {{ order.orderSn }}</p>
            <p class="text-lg font-semibold text-body">{{ order.productTitle }}</p>
          </div>
          <p class="text-lg font-semibold text-accent">{{ order.amount.toFixed(2) }} {{ order.currency }}</p>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-body/60">
          <span>{{ new Date(order.createdAt).toLocaleString() }}</span>
          <span class="rounded-full bg-black/5 px-3 py-1 text-xs uppercase tracking-wide text-body/60">
            {{ order.status }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
