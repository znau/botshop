<script setup lang="ts">
import { h, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Iconify from '@/components/icon/Iconify.vue';
import type { AdminMenu } from '@/types/api';

const props = defineProps<{ menus: AdminMenu[] }>();

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const selectedKeys = computed(() => [route.path]);
const openKeys = ref<string[]>([]);

watch(
	() => route.matched,
	(matched) => {
		openKeys.value = matched.map((m) => m.path).filter(Boolean);
	},
	{ immediate: true },
);

const menuItems = computed(() => buildMenuItems(props.menus || []));

function onOpenChange(keys: string[]) {
	openKeys.value = keys;
}

function buildMenuItems(nodes: AdminMenu[]): any[] {
	return nodes
		.filter((item) => item.isVisible !== false && auth.hasPermission(item.permission || undefined))
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item) => {
			const children = buildMenuItems(item.children || []);
			const hasChildren = children.length > 0;
			return {
				key: item.path,
				label: item.title,
				icon: item.icon ? () => h(Iconify, { name: item.icon }) : undefined,
				children: hasChildren ? children : undefined,
			};
		});
}

function onSelect({ key }: { key: string }) {
	if (key) router.push(key);
}
</script>

<template>
	<a-menu
		mode="inline"
		:items="menuItems"
		:selected-keys="selectedKeys"
		:open-keys="openKeys"
		@openChange="onOpenChange"
		@select="onSelect"
	/>
</template>
