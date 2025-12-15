<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { AdminMenu, MenuInput } from '@/types/api';
import IconPicker from '@/components/icon/IconPicker.vue';
import Iconify from '@/components/icon/Iconify.vue';

const menus = ref<AdminMenu[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const saving = ref(false);
const editing = ref<AdminMenu | null>(null);

const formState = reactive<Partial<MenuInput>>({
	title: '',
	path: '',
	menuType: 'menu',
	icon: '',
	component: '',
	permission: '',
	parentId: null,
	sort: 0,
	isVisible: true,
});

const menuFlat = computed(() => flattenMenus(menus.value));

// 处理菜单数据，按钮和外链类型不显示子节点
const processedMenus = computed(() => {
	return processMenus(menus.value);
});

function processMenus(list: AdminMenu[]): AdminMenu[] {
	return list.map(menu => {
		const processed = { ...menu };
		// 按钮和外链类型不显示子节点
		if (menu.menuType === 'button' || menu.menuType === 'link') {
			delete processed.children;
		} else if (menu.children?.length) {
			processed.children = processMenus(menu.children);
		}
		return processed;
	});
}

function getChildrenColumn(record: AdminMenu) {
	// 按钮和外链类型不展示子节点
	if (record.menuType === 'button' || record.menuType === 'link') {
		return undefined;
	}
	return 'children';
}

function flattenMenus(list: AdminMenu[], parent: AdminMenu | null = null): AdminMenu[] {
	return list.reduce<AdminMenu[]>((acc, cur) => {
		acc.push({ ...cur, parentId: parent?.id } as any);
		if (cur.children?.length) acc.push(...flattenMenus(cur.children, cur));
		return acc;
	}, []);
}

async function fetchMenus() {
	loading.value = true;
	try {
		menus.value = await adminApi.listMenus();
	} catch (error: any) {
		message.error(error?.message || '加载菜单失败');
	} finally {
		loading.value = false;
	}
}

function resetForm() {
	Object.assign(formState, {
		title: '',
		path: '',
		menuType: 'menu',
		icon: '',
		component: '',
		permission: '',
		parentId: null,
		sort: 0,
		isVisible: true,
	});
	editing.value = null;
}

function openCreate(parentId?: string | null) {
	resetForm();
	formState.parentId = parentId || null;
	modalOpen.value = true;
}

function openEdit(record: AdminMenu) {
	editing.value = record;
	Object.assign(formState, record, { parentId: record.parentId ?? null });
	modalOpen.value = true;
}

async function handleSubmit() {
	saving.value = true;
	try {
		if (editing.value) {
			await adminApi.updateMenu(editing.value.id, formState);
			message.success('已更新');
		} else {
			await adminApi.createMenu(formState as MenuInput);
			message.success('已创建');
		}
		modalOpen.value = false;
		fetchMenus();
	} catch (error: any) {
		message.error(error?.message || '保存失败');
	} finally {
		saving.value = false;
	}
}

function confirmDelete(record: AdminMenu) {
	Modal.confirm({
		title: '确定删除该菜单吗？',
		content: '删除后子菜单也会同时删除',
		onOk: async () => {
			await adminApi.deleteMenu(record.id);
			message.success('已删除');
			fetchMenus();
		},
	});
}

onMounted(fetchMenus);
</script>

<template>
	<div>
		<div style="margin-bottom: 16px">
			<a-button type="primary" @click="openCreate()">新建菜单</a-button>
		</div>
		<a-table 
			:data-source="processedMenus" 
			:loading="loading" 
			row-key="id" 
			:pagination="false" 
			:default-expand-all-rows="true"
		>
			<a-table-column title="标题" data-index="title" key="title">
				<template #default="{ record }">
					<div style="display: flex; align-items: center; gap: 8px;">
						<Iconify v-if="record.icon" :name="record.icon" :size="16" />
						<span>{{ record.title }}</span>
					</div>
				</template>
			</a-table-column>
			<a-table-column title="路径" data-index="path" key="path" />
			<a-table-column title="类型" data-index="menuType" key="menuType" />
			<a-table-column title="权限码" data-index="permission" key="permission" />
			<a-table-column title="排序" data-index="sort" key="sort" />
			<a-table-column title="显示" key="isVisible">
				<template #default="{ record }">
					<a-tag :color="record.isVisible === false ? 'red' : 'green'">{{ record.isVisible === false ? '隐藏' : '显示' }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-space>
						<a-button 
							v-if="record.menuType !== 'button' && record.menuType !== 'link'" 
							type="link" 
							@click="openCreate(record.id)"
						>
							添加子菜单
						</a-button>
						<a-button type="link" @click="openEdit(record)">编辑</a-button>
						<a-button type="link" danger @click="confirmDelete(record)">删除</a-button>
					</a-space>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="modalOpen" :title="editing ? '编辑菜单' : '新建菜单'" :confirm-loading="saving" @ok="handleSubmit">
			<a-form layout="vertical">
				<a-form-item label="标题"><a-input v-model:value="formState.title" /></a-form-item>
				<a-form-item label="路径"><a-input v-model:value="formState.path" placeholder="/system/menus" /></a-form-item>
				<a-form-item label="组件标识"><a-input v-model:value="formState.component" placeholder="对应路由组件名称" /></a-form-item>
				<a-form-item label="菜单类型">
					<a-select v-model:value="formState.menuType">
						<a-select-option value="directory">目录</a-select-option>
						<a-select-option value="menu">菜单</a-select-option>
						<a-select-option value="button">按钮</a-select-option>
						<a-select-option value="link">外链</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="图标"><IconPicker v-model:value="formState.icon" /></a-form-item>
				<a-form-item label="权限码"><a-input v-model:value="formState.permission" placeholder="products:read" /></a-form-item>
				<a-form-item label="父级">
					<a-select v-model:value="formState.parentId" allow-clear placeholder="选择父级">
						<a-select-option v-for="item in menuFlat" :key="item.id" :value="item.id">{{ item.title }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="排序"><a-input-number v-model:value="formState.sort" style="width: 100%" /></a-form-item>
				<a-form-item label="显示">
				<a-switch v-model:checked="formState.isVisible" checked-children="显示" un-checked-children="隐藏" />
			</a-form-item>
		</a-form>
	</a-modal>
	</div>
</template>