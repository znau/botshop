<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{ name?: string; size?: number | string }>();
</script>

<template>
	<Icon v-if="props.name" :icon="props.name" :width="props.size ?? 18" :height="props.size ?? 18" />
</template>
