<script setup lang="ts">
import { ref, computed } from 'vue';
import Iconify from './Iconify.vue';

const props = defineProps<{
	value?: string;
}>();

const emit = defineEmits<{
	(e: 'update:value', value: string): void;
	(e: 'change', value: string): void;
}>();

const visible = ref(false);
const searchText = ref('');

// 常用图标库
const iconCategories = [
	{
		name: '通用',
		icons: [
			'carbon:dashboard',
			'carbon:home',
			'carbon:user',
			'carbon:settings',
			'carbon:notification',
			'carbon:search',
			'carbon:menu',
			'carbon:close',
			'carbon:edit',
			'carbon:delete',
			'carbon:add',
			'carbon:checkmark',
			'carbon:warning',
			'carbon:information',
			'carbon:view',
			'carbon:list',
			'carbon:grid',
			'carbon:filter',
			'carbon:help',
			'carbon:bookmark',
			'carbon:star',
			'carbon:favorite',
			'carbon:share',
			'carbon:download',
			'carbon:upload',
			'carbon:calendar',
			'carbon:time',
			'carbon:location',
			'carbon:phone',
			'carbon:email',
		],
	},
	{
		name: '电商',
		icons: [
			'carbon:shopping-cart',
			'carbon:product',
			'carbon:catalog',
			'carbon:order-details',
			'carbon:currency-dollar',
			'carbon:tag',
			'carbon:delivery',
			'carbon:star',
			'carbon:finance',
			'carbon:wallet',
			'carbon:purchase',
			'carbon:receipt',
			'carbon:gift',
			'carbon:package',
			'carbon:inventory-management',
			'carbon:store',
			'carbon:shopping-bag',
			'carbon:currency',
		],
	},
	{
		name: '文件',
		icons: [
			'carbon:document',
			'carbon:folder',
			'carbon:save',
			'carbon:download',
			'carbon:upload',
			'carbon:copy',
			'carbon:paste',
			'carbon:document-add',
			'carbon:folder-add',
			'carbon:file-storage',
			'carbon:cloud-upload',
			'carbon:cloud-download',
			'carbon:attachment',
			'carbon:document-export',
			'carbon:document-import',
		],
	},
	{
		name: '系统',
		icons: [
			'carbon:user-multiple',
			'carbon:security',
			'carbon:locked',
			'carbon:unlocked',
			'carbon:application',
			'carbon:data-base',
			'carbon:server',
			'carbon:settings-adjust',
			'carbon:tools',
			'carbon:flash',
			'carbon:power',
			'carbon:chart-line',
			'carbon:analytics',
			'carbon:report',
			'carbon:dashboard-reference',
		],
	},
	{
		name: '箭头',
		icons: [
			'carbon:arrow-up',
			'carbon:arrow-down',
			'carbon:arrow-left',
			'carbon:arrow-right',
			'carbon:chevron-up',
			'carbon:chevron-down',
			'carbon:chevron-left',
			'carbon:chevron-right',
			'carbon:caret-up',
			'carbon:caret-down',
			'carbon:caret-left',
			'carbon:caret-right',
			'carbon:next',
			'carbon:previous',
			'carbon:return',
			'carbon:undo',
			'carbon:redo',
		],
	},
	{
		name: '媒体',
		icons: [
			'carbon:image',
			'carbon:video',
			'carbon:play',
			'carbon:pause',
			'carbon:stop',
			'carbon:volume-up',
			'carbon:volume-mute',
			'carbon:microphone',
			'carbon:camera',
			'carbon:music',
			'carbon:media',
		],
	},
	{
		name: '通讯',
		icons: [
			'carbon:email',
			'carbon:chat',
			'carbon:send',
			'carbon:phone',
			'carbon:user-avatar',
			'carbon:user-online',
			'carbon:group',
			'carbon:forum',
			'carbon:logo-wechat',
			'carbon:mobile',
		],
	},
	{
		name: '数据',
		icons: [
			'carbon:chart-bar',
			'carbon:chart-line',
			'carbon:chart-pie',
			'carbon:analytics',
			'carbon:data-table',
			'carbon:report',
			'carbon:graph',
			'carbon:trending-up',
			'carbon:trending-down',
		],
	},
];

const allIcons = computed(() => {
	return iconCategories.flatMap((cat) => cat.icons);
});

const filteredIcons = computed(() => {
	if (!searchText.value) return iconCategories;
	const text = searchText.value.toLowerCase();
	return iconCategories
		.map((cat) => ({
			...cat,
			icons: cat.icons.filter((icon) => icon.toLowerCase().includes(text)),
		}))
		.filter((cat) => cat.icons.length > 0);
});

function handleSelect(icon: string) {
	emit('update:value', icon);
	emit('change', icon);
	visible.value = false;
}

function handleClear() {
	emit('update:value', '');
	emit('change', '');
}
</script>

<template>
	<div class="icon-picker">
		<a-input
			:value="value"
			placeholder="选择图标"
			readonly
			@click="visible = true"
		>
			<template #prefix>
				<Iconify v-if="value" :name="value" :size="16" />
				<span v-else style="color: #999">🎨</span>
			</template>
			<template #suffix>
				<CloseCircleOutlined v-if="value" style="cursor: pointer; color: #999" @click.stop="handleClear" />
			</template>
		</a-input>

		<a-modal
			v-model:open="visible"
			title="选择图标"
			:footer="null"
			width="800px"
		>
			<a-input
				v-model:value="searchText"
				placeholder="搜索图标..."
				allow-clear
				style="margin-bottom: 16px"
			>
				<template #prefix>🔍</template>
			</a-input>

			<div class="icon-categories">
				<div v-for="category in filteredIcons" :key="category.name" class="icon-category">
					<div class="category-name">{{ category.name }}</div>
					<div class="icon-grid">
						<div
							v-for="icon in category.icons"
							:key="icon"
							:class="['icon-item', { selected: value === icon }]"
							@click="handleSelect(icon)"
						>
							<Iconify :name="icon" :size="24" />
							<div class="icon-name">{{ icon.split(':')[1] }}</div>
						</div>
					</div>
				</div>
			</div>
		</a-modal>
	</div>
</template>

<style scoped>
.icon-picker {
	width: 100%;
}
.icon-categories {
	max-height: 500px;
	overflow-y: auto;
}
.icon-category {
	margin-bottom: 24px;
}
.category-name {
	font-size: 14px;
	font-weight: 600;
	color: #333;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid #e8e8e8;
}
.icon-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
	gap: 12px;
}
.icon-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 12px 8px;
	border: 1px solid #e8e8e8;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s;
}
.icon-item:hover {
	border-color: #1890ff;
	background: #f0f8ff;
}
.icon-item.selected {
	border-color: #1890ff;
	background: #e6f7ff;
}
.icon-name {
	font-size: 11px;
	color: #666;
	text-align: center;
	word-break: break-all;
	line-height: 1.2;
}
</style>
