<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import SideMenu from './components/SideMenu.vue';
import AppHeader from './components/AppHeader.vue';
import PageContainer from '@/layouts/components/PageContainer.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();

const menus = computed(() => auth.menus || []);
const pageTitle = computed(() => String(route.meta.title || ''));
const pageDescription = computed(() => String(route.meta.description || ''));

// 缓存的组件名称列表,基于打开的 tabs
const cachedViews = computed(() => {
	return ui.tabs.map((tab) => tab.path.replace(/^\//, '').replace(/\//g, '_') || 'root');
});
</script>

<template>
	<a-layout class="admin-layout">
		<a-layout-sider
			:collapsed="ui.siderCollapsed"
			:width="240"
			:collapsed-width="72"
			:trigger="null"
			theme="light"
			class="admin-sider"
		>
			<div class="brand">
				<div class="brand-logo">🛰️</div>
				<div v-if="!ui.siderCollapsed" class="brand-text">
					<div class="brand-name">BotShop Admin</div>
					<div class="brand-sub"></div>
				</div>
			</div>
			<SideMenu :menus="menus" />
		</a-layout-sider>
		<a-layout>
			<a-layout-header class="admin-header">
				<AppHeader />
			</a-layout-header>

		<a-layout-content class="admin-content">
			<PageContainer :title="pageTitle" :description="pageDescription">
				<RouterView v-slot="{ Component, route }">
					<KeepAlive :include="cachedViews">
						<component :is="Component" :key="route.path" />
					</KeepAlive>
				</RouterView>
			</PageContainer>
		</a-layout-content>
		</a-layout>
	</a-layout>
</template>

<style scoped>
.admin-layout {
	min-height: 100vh;
}
.admin-sider {
	border-right: 1px solid #e5e7eb;
	background: #ffffffcc;
	backdrop-filter: blur(4px);
}
.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 64px;
	padding: 0 16px;
	border-bottom: 1px solid #e5e7eb;
	font-weight: 700;
}
.brand-logo {
	width: 36px;
	height: 36px;
	display: grid;
	place-items: center;
	background: linear-gradient(135deg, #2563eb, #7c3aed);
	color: #fff;
	border-radius: 12px;
	font-size: 16px;
}
.brand-name {
	margin: 0;
	font-size: 16px;
}
.brand-sub {
	margin: 0;
	color: #94a3b8;
	font-size: 12px;
}
.admin-header {
	padding: 0;
	background: transparent;
	height: auto;
	line-height: normal;
}
.admin-content {
	min-height: calc(100vh - 64px);
	background: #f5f5f5;
	padding: 6px;
}
</style>
