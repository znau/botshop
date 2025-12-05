<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag } from 'naive-ui';
import type { Product } from '@/types/api';

const props = defineProps<{ product: Product }>();
const router = useRouter();

const stockLabel = computed(() => {
  if (props.product.stock <= 0) return '售罄';
  if (props.product.stock < 3) return '库存紧张';
  return `库存 ${props.product.stock}`;
});

const goDetail = () => {
  router.push({ name: 'Product', params: { productId: props.product.id } });
};
</script>

<template>
  <div class="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
    <div class="flex flex-1 flex-col gap-4">
      <div>
        <p class="text-xs uppercase tracking-wide text-body/60">{{ stockLabel }}</p>
        <h3 class="mt-2 text-lg font-semibold text-body">{{ product.title }}</h3>
        <p class="line-clamp-2 text-sm text-body/70">{{ product.description }}</p>
      </div>
      <div class="mt-auto flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xl font-bold text-accent">{{ product.priceLabel }}</span>
          <NTag type="info" size="small">{{ product.deliveryMode === 'code' ? '自动发货' : '联系客服' }}</NTag>
        </div>
        <NButton type="primary" block @click="goDetail">查看详情</NButton>
      </div>
    </div>
  </div>
</template>
