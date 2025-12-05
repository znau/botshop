<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { CategoryNode } from '@/types/api';

const props = defineProps<{ categories: CategoryNode[] }>();
</script>

<template>
  <section class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-body">分类导航</h2>
      <RouterLink class="text-sm text-accent hover:underline" to="/catalog">查看全部</RouterLink>
    </div>
    <div class="flex gap-3 overflow-x-auto pb-2">
      <RouterLink
        v-for="category in props.categories"
        :key="category.id"
        class="min-w-[160px] rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-body/80 shadow-sm transition hover:-translate-y-1 hover:text-accent"
        :to="{ name: 'Catalog', params: { categoryId: category.id } }"
      >
        <span class="mr-2">{{ category.emoji ?? '🛍️' }}</span>
        {{ category.name }}
      </RouterLink>
    </div>
  </section>
</template>
