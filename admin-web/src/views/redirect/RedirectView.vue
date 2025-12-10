<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

onMounted(() => {
  const path = route.path.replace(/^\/redirect/, '');
  router.replace(path || '/dashboard');
});
</script>

<template>
  <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
    <n-spin size="large" />
  </div>
</template>
