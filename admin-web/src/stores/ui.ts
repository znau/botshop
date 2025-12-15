import { defineStore } from 'pinia';

export type TabItem = {
	key: string;
	title: string;
	path: string;
	closable: boolean;
	icon?: string;
};

export const useUiStore = defineStore('ui', {
	state: () => ({
		siderCollapsed: false,
		darkMode: localStorage.getItem('darkMode') === 'true',
		tabs: [] as TabItem[],
		activeTab: '',
		searchModalVisible: false,
		isFullscreen: false,
	}),
	actions: {
		toggleSider() {
			this.siderCollapsed = !this.siderCollapsed;
		},
		setSider(collapsed: boolean) {
			this.siderCollapsed = collapsed;
		},
		toggleDarkMode() {
			this.darkMode = !this.darkMode;
			localStorage.setItem('darkMode', String(this.darkMode));
			if (this.darkMode) {
				document.documentElement.classList.add('dark');
				document.body.setAttribute('data-theme', 'dark');
			} else {
				document.documentElement.classList.remove('dark');
				document.body.removeAttribute('data-theme');
			}
		},
		addTab(tab: TabItem) {
			const exists = this.tabs.find((t) => t.key === tab.key);
			if (!exists) {
				this.tabs.push(tab);
			}
			this.activeTab = tab.key;
		},
		removeTab(key: string) {
			const index = this.tabs.findIndex((t) => t.key === key);
			if (index === -1) return;
			this.tabs.splice(index, 1);
			if (this.activeTab === key && this.tabs.length > 0) {
				this.activeTab = this.tabs[Math.max(0, index - 1)].key;
			}
		},
		setActiveTab(key: string) {
			this.activeTab = key;
		},
		closeOtherTabs(key: string) {
			this.tabs = this.tabs.filter((t) => t.key === key || !t.closable);
			this.activeTab = key;
		},
		closeAllTabs() {
			this.tabs = this.tabs.filter((t) => !t.closable);
			if (this.tabs.length > 0) {
				this.activeTab = this.tabs[0].key;
			}
		},
		toggleSearchModal() {
			this.searchModalVisible = !this.searchModalVisible;
		},
		toggleFullscreen() {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
				this.isFullscreen = true;
			} else {
				document.exitFullscreen();
				this.isFullscreen = false;
			}
		},
	},
});
