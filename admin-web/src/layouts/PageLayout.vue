<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import PageContainer from '@/layouts/components/PageContainer.vue';

const route = useRoute();

const pageTitle = computed(() => String(route.meta.title || ''));
const pageDescription = computed(() => String(route.meta.description || ''));
</script>

<template>
	<PageContainer :title="pageTitle" :description="pageDescription">
		<slot />
	</PageContainer>
</template>
