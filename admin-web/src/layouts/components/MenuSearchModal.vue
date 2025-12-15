<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type { AdminMenu } from '@/types/api';
import Iconify from '@/components/icon/Iconify.vue';

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const searchText = ref('');
const flatMenus = ref<Array<{ key: string; title: string; path: string; icon?: string | null }>>([]);

const filteredMenus = computed(() => {
	if (!searchText.value) return flatMenus.value;
	const text = searchText.value.toLowerCase();
	return flatMenus.value.filter((m) => m.title.toLowerCase().includes(text) || m.path.toLowerCase().includes(text));
});

function flattenMenus(menus: AdminMenu[], result: typeof flatMenus.value = []) {
	menus.forEach((menu) => {
		if (menu.menuType === 'menu' && menu.isVisible !== false) {
			result.push({
				key: menu.id,
				title: menu.title,
				path: menu.path,
				icon: menu.icon,
			});
		}
		if (menu.children?.length) {
			flattenMenus(menu.children, result);
		}
	});
	return result;
}

watch(
	() => ui.searchModalVisible,
	(visible) => {
		if (visible) {
			searchText.value = '';
			flatMenus.value = flattenMenus(auth.menus || []);
		}
	},
);

function handleSelect(path: string) {
	router.push(path);
	ui.toggleSearchModal();
}
</script>

<template>
	<a-modal
		v-model:open="ui.searchModalVisible"
		title="搜索菜单"
		:footer="null"
		width="600px"
		:body-style="{ padding: '12px 0' }"
	>
		<a-input
			v-model:value="searchText"
			placeholder="输入关键字搜索..."
			size="large"
			allow-clear
			autofocus
			style="margin: 0 12px 12px"
		>
			<template #prefix><span style="color: #9ca3af">🔍</span></template>
		</a-input>
		<div class="menu-list">
			<div
				v-for="item in filteredMenus"
				:key="item.key"
				class="menu-item"
				@click="handleSelect(item.path)"
			>
				<Iconify v-if="item.icon" :name="item.icon" :size="18" />
				<span v-else class="menu-icon-placeholder">📄</span>
				<span class="menu-title">{{ item.title }}</span>
				<span class="menu-path">{{ item.path }}</span>
			</div>
			<div v-if="filteredMenus.length === 0" class="empty-state">
				<span>未找到匹配的菜单</span>
			</div>
		</div>
	</a-modal>
</template>

<style scoped>
.menu-list {
	max-height: 400px;
	overflow-y: auto;
}
.menu-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 16px;
	cursor: pointer;
	transition: background 0.2s;
}
.menu-item:hover {
	background: #f3f4f6;
}
.menu-icon-placeholder {
	font-size: 18px;
}
.menu-title {
	font-weight: 500;
	flex: 1;
}
.menu-path {
	font-size: 12px;
	color: #9ca3af;
}
.empty-state {
	padding: 40px;
	text-align: center;
	color: #9ca3af;
}
</style>
