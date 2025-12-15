<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { CategoryItem } from '@/types/api';

const loading = ref(false);
const categories = ref<CategoryItem[]>([]);
const modalOpen = ref(false);
const saving = ref(false);
const editing = ref<CategoryItem | null>(null);

const formState = reactive<Partial<CategoryItem>>({
	name: '',
	description: '',
	emoji: '',
	parentId: null,
	sort: 0,
	isActive: true,
});

function resetForm() {
	Object.assign(formState, {
		name: '',
		description: '',
		emoji: '',
		parentId: null,
		sort: 0,
		isActive: true,
	});
	editing.value = null;
}

async function fetchCategories() {
	loading.value = true;
	try {
		const res = await adminApi.listCategories();
		categories.value = res.items || [];
	} catch (error: any) {
		message.error(error?.message || '加载分类失败');
	} finally {
		loading.value = false;
	}
}

function openCreate() {
	resetForm();
	modalOpen.value = true;
}

function openEdit(record: CategoryItem) {
	editing.value = record;
	Object.assign(formState, record);
	modalOpen.value = true;
}

async function handleSubmit() {
	saving.value = true;
	try {
		if (editing.value) {
			await adminApi.updateCategory(editing.value.id, formState);
			message.success('更新成功');
		} else {
			await adminApi.createCategory(formState);
			message.success('创建成功');
		}
		modalOpen.value = false;
		await fetchCategories();
	} catch (error: any) {
		message.error(error?.message || '保存失败');
	} finally {
		saving.value = false;
	}
}

async function handleDelete(record: CategoryItem) {
	Modal.confirm({
		title: '确认删除该分类吗？',
		content: '该操作不可撤销',
		onOk: async () => {
			await adminApi.deleteCategory(record.id);
			message.success('已删除');
			fetchCategories();
		},
	});
}

onMounted(fetchCategories);
</script>

<template>
	<div>
		<div style="margin-bottom: 16px">
			<a-button type="primary" @click="openCreate">新建分类</a-button>
		</div>
		<a-table :data-source="categories" :loading="loading" row-key="id" :pagination="false">
			<a-table-column title="名称" data-index="name" key="name" />
			<a-table-column title="表情" key="emoji">
				<template #default="{ record }">
					{{ record.emoji }}
				</template>
			</a-table-column>
			<a-table-column title="上级" key="parentId">
				<template #default="{ record }">
					{{ record.parentId ? categories.find((c) => c.id === record.parentId)?.name : '-' }}
				</template>
			</a-table-column>
			<a-table-column title="排序" data-index="sort" key="sort" />
			<a-table-column title="状态" key="isActive">
				<template #default="{ record }">
					<a-tag :color="record.isActive === false ? 'red' : 'green'">{{ record.isActive === false ? '停用' : '启用' }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-space>
						<a-button type="link" @click="openEdit(record)">编辑</a-button>
						<a-button type="link" danger @click="handleDelete(record)">删除</a-button>
					</a-space>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="modalOpen" :title="editing ? '编辑分类' : '新建分类'" :confirm-loading="saving" @ok="handleSubmit">
			<a-form layout="vertical">
				<a-form-item label="名称">
					<a-input v-model:value="formState.name" placeholder="请输入分类名称" />
				</a-form-item>
				<a-form-item label="描述">
					<a-input v-model:value="formState.description" placeholder="可选" />
				</a-form-item>
				<a-form-item label="表情">
					<a-input v-model:value="formState.emoji" placeholder="如 😺" />
				</a-form-item>
				<a-form-item label="上级分类">
					<a-select v-model:value="formState.parentId" allow-clear placeholder="选择上级">
						<a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="排序">
					<a-input-number v-model:value="formState.sort" style="width: 100%" />
				</a-form-item>
				<a-form-item label="状态">
					<a-switch v-model:checked="formState.isActive" checked-children="启用" un-checked-children="停用" />
				</a-form-item>
		</a-form>
	</a-modal>
	</div>
</template>