<script setup lang="ts">
defineProps<{
	title?: string;
	description?: string;
}>();
</script>

<template>
	<div class="page-container">
		<div class="page-content">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.page-container {
	padding: 6px;
}
.page-content {
	background: #fff;
	border-radius: 8px;
	padding: 6px;
}
</style>
