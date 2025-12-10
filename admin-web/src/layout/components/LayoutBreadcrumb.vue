<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, type RouteLocationMatched } from 'vue-router';

const route = useRoute();

// 面包屑数据
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title || item.name);
  return matched.map((item) => ({
    title: (item.meta?.title as string) || (item.name as string) || '',
    path: item.path,
  }));
});

// 是否可以跳转
const isClickable = (index: number) => {
  return index < breadcrumbs.value.length - 1;
};
</script>

<template>
  <n-breadcrumb v-if="breadcrumbs.length > 0">
    <n-breadcrumb-item
      v-for="(item, index) in breadcrumbs"
      :key="item.path"
      :href="isClickable(index) ? item.path : undefined"
    >
      {{ item.title }}
    </n-breadcrumb-item>
  </n-breadcrumb>
</template>

<style scoped>
/* 样式可以根据需要自定义 */
</style>
