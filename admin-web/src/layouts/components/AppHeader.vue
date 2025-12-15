<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import {
	FullscreenOutlined,
	FullscreenExitOutlined,
	SearchOutlined,
	ReloadOutlined,
	CloseOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
} from '@ant-design/icons-vue';
import MenuSearchModal from './MenuSearchModal.vue';
import Iconify from '@/components/icon/Iconify.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

const dropdownVisible = ref(false);
const contextMenuVisible = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const contextMenuTab = ref<any>(null);

const avatarUrl = computed(() => {
	if (auth.admin?.avatar) return auth.admin.avatar;
	return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(auth.displayName)}&radius=50&bold=true`;
});

async function handleLogout() {
	auth.logout();
	await router.push('/login');
}

function handleTabChange(key: string) {
	const tab = ui.tabs.find((t) => t.key === key);
	if (tab) {
		router.push(tab.path);
	}
}

function handleTabClose(targetKey: string) {
	const tab = ui.tabs.find((t) => t.key === targetKey);
	if (tab && tab.closable) {
		ui.removeTab(targetKey);
		if (ui.tabs.length > 0) {
			const nextTab = ui.tabs[ui.tabs.length - 1];
			router.push(nextTab.path);
		} else {
			router.push('/dashboard');
		}
	}
}

function showContextMenu(e: MouseEvent, tab: any) {
	contextMenuPos.value = { x: e.clientX, y: e.clientY };
	contextMenuTab.value = tab;
	contextMenuVisible.value = true;
}

function refreshCurrentTab() {
	// 刷新当前活跃的tab页面，使用浏览器刷新
	router.go(0);
}

function refreshTab(tabKey: string) {
	if (tabKey === route.path) {
		router.go(0);
	} else {
		router.push(tabKey).then(() => router.go(0));
	}
}

function closeOtherTabs(tabKey?: string) {
	ui.closeOtherTabs(tabKey || ui.activeTab);
}

function closeAllTabs() {
	ui.closeAllTabs();
	if (ui.tabs.length > 0) {
		router.push(ui.tabs[0].path);
	} else {
		router.push('/dashboard');
	}
}

function handleKeydown(e: KeyboardEvent) {
	if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
		e.preventDefault();
		ui.toggleSearchModal();
	}
}

onMounted(() => {
	window.addEventListener('keydown', handleKeydown);
	document.addEventListener('fullscreenchange', () => {
		ui.isFullscreen = !!document.fullscreenElement;
	});
});

onUnmounted(() => {
	window.removeEventListener('keydown', handleKeydown);
});

watch(
	() => route.path,
	(path) => {
		if (path && route.meta.title && path !== '/login') {
			const menu = auth.menus?.find((m) => m.path === path) || auth.menus?.flatMap((m) => m.children || []).find((m) => m.path === path);
			ui.addTab({
				key: path,
				title: String(route.meta.title),
				path,
				closable: path !== '/dashboard',
				icon: menu?.icon || undefined,
			});
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div class="header-wrapper">
		<div class="app-header">
			<div class="header-left">
				<a-button type="text" @click="ui.toggleSider">
					<template #icon>
						<MenuUnfoldOutlined v-if="ui.siderCollapsed" />
						<MenuFoldOutlined v-else />
					</template>
				</a-button>
			</div>
			<div class="header-right">
				<a-space :size="16" align="center">
					<a-tooltip title="搜索菜单 (Ctrl+K)">
						<a-button type="text" @click="ui.toggleSearchModal">
							<template #icon>
								<SearchOutlined />
							</template>
						</a-button>
					</a-tooltip>
					<a-tooltip :title="ui.isFullscreen ? '退出全屏' : '全屏'">
						<a-button type="text" @click="ui.toggleFullscreen">
							<template #icon>
								<FullscreenExitOutlined v-if="ui.isFullscreen" />
								<FullscreenOutlined v-else />
							</template>
						</a-button>
					</a-tooltip>
					<a-tooltip :title="ui.darkMode ? '切换到亮色' : '切换到暗黑'">
						<a-button type="text" @click="ui.toggleDarkMode">
							<template #icon>
								<span v-if="ui.darkMode" style="font-size: 16px">☀️</span>
								<span v-else style="font-size: 16px">🌙</span>
							</template>
						</a-button>
					</a-tooltip>
					<a-dropdown v-model:open="dropdownVisible" placement="bottomRight">
						<a-space class="user-entry" align="center" style="cursor: pointer">
							<a-avatar :src="avatarUrl" :size="32">{{ auth.displayName?.slice(0, 1).toUpperCase()
								}}</a-avatar>
							<div class="user-info">
								<div class="user-name">{{ auth.displayName }}</div>
								<div class="user-role">{{ auth.admin?.role?.name }}</div>
							</div>
						</a-space>
						<template #overlay>
							<a-menu>
								<a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
							</a-menu>
						</template>
					</a-dropdown>
				</a-space>
			</div>
		</div>

		<div v-if="ui.tabs.length > 0" class="tabs-container">
			<div class="tabs-list">
				<div v-for="tab in ui.tabs" :key="tab.key" :class="['tab-item', { active: ui.activeTab === tab.key }]"
					@click="handleTabChange(tab.key)" @contextmenu.prevent="(e) => showContextMenu(e, tab)">
					<Iconify v-if="tab.icon" :name="tab.icon" :size="14" class="tab-icon" />
					<span class="tab-title">{{ tab.title }}</span>
					<CloseOutlined v-if="tab.closable" class="tab-close" @click.stop="handleTabClose(tab.key)" />
				</div>
			</div>
			<div class="tabs-actions">
				<a-tooltip title="刷新当前页">
					<a-button type="text" size="small" class="action-btn" @click="refreshCurrentTab">
						<template #icon>
							<ReloadOutlined />
						</template>
					</a-button>
				</a-tooltip>
			</div>
			<a-dropdown v-model:open="contextMenuVisible" :trigger="['click']">
				<div
					:style="{ position: 'fixed', left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px', width: 0, height: 0 }">
				</div>
				<template #overlay>
					<a-menu v-if="contextMenuTab">
						<a-menu-item @click="refreshTab(contextMenuTab.key)">
							<ReloadOutlined /> 刷新此页
						</a-menu-item>
						<a-menu-item v-if="contextMenuTab.closable" @click="handleTabClose(contextMenuTab.key)">
							<CloseOutlined /> 关闭此页
						</a-menu-item>
						<a-menu-divider />
						<a-menu-item @click="closeOtherTabs(contextMenuTab.key)">
							关闭其他
						</a-menu-item>
						<a-menu-item @click="closeAllTabs">
							关闭所有
						</a-menu-item>
					</a-menu>
				</template>
			</a-dropdown>
		</div>
		<MenuSearchModal />
	</div>
</template>

<style scoped>
.header-wrapper {
	position: relative;
	background: #fff;
	border-bottom: 1px solid #e5e7eb;
}

.app-header {
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 16px;
	background: #fff;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 12px;
}

.header-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

.user-entry {
	padding: 4px 8px;
	border-radius: 8px;
	transition: background 0.2s;
}

.user-entry:hover {
	background: #f3f4f6;
}

.user-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	line-height: 1.3;
}

.user-name {
	font-weight: 600;
	font-size: 14px;
}

.user-role {
	font-size: 12px;
	color: #6b7280;
}

.tabs-container {
	background: #fff;
	border: 1px solid #d9d9d9;
	border-left: none;
	border-right: none;
	display: flex;
	align-items: stretch;
	min-height: 40px;
	height: 40px;
}

.tabs-list {
	flex: 1;
	display: flex;
	align-items: stretch;
	overflow-x: auto;
	overflow-y: hidden;
	min-height: 40px;
}

.tabs-list::-webkit-scrollbar {
	height: 3px;
}

.tabs-list::-webkit-scrollbar-thumb {
	background: #d9d9d9;
	border-radius: 3px;
}

.tab-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 0 16px;
	min-height: 40px;
	background: #fff;
	border-right: 1px solid #e8e8e8;
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
	transition: all 0.2s;
	font-size: 13px;
	color: #595959;
	flex-shrink: 0;
}

.tab-item:hover {
	background: #f0f0f0;
}

.tab-item.active {
	background: #e6f7ff;
	color: #1890ff;
}

.tab-icon {
	flex-shrink: 0;
}

.tab-title {
	flex-shrink: 0;
}

.tab-close {
	flex-shrink: 0;
	font-size: 10px;
	padding: 2px;
	border-radius: 2px;
	margin-left: 4px;
}

.tab-close:hover {
	background: rgba(0, 0, 0, 0.1);
}

.tab-item.active .tab-close:hover {
	background: rgba(24, 144, 255, 0.15);
}

.tabs-actions {
	display: flex;
	align-items: center;
	padding: 0 12px;
	border-left: 1px solid #e8e8e8;
	background: #fff;
	min-height: 40px;
	flex-shrink: 0;
}

.action-btn {
	color: #595959;
}

.action-btn:hover {
	color: #1890ff;
}
</style>
