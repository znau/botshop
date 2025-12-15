<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { RoleItem } from '@/types/api';

const roles = ref<RoleItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const editing = ref<RoleItem | null>(null);
const permissionGroups = ref<Array<{ key: string; label: string; permissions: { code: string; label: string }[] }>>([]);

const formState = reactive<{ name: string; description?: string; permissions: string[] }>({
	name: '',
	description: '',
	permissions: [],
});

async function fetchRoles() {
	loading.value = true;
	try {
		roles.value = await adminApi.listRoles();
	} catch (error: any) {
		message.error(error?.message || '加载角色失败');
	} finally {
		loading.value = false;
	}
}

async function fetchPermissions() {
	try {
		const res = await adminApi.permissions();
		permissionGroups.value = res.groups || [];
	} catch (error) {
		// ignore
	}
}

function openCreate() {
	Object.assign(formState, { name: '', description: '', permissions: [] });
	editing.value = null;
	modalOpen.value = true;
}

function openEdit(record: RoleItem) {
	editing.value = record;
	Object.assign(formState, record);
	modalOpen.value = true;
}

async function handleSubmit() {
	saving.value = true;
	try {
		if (editing.value) {
			await adminApi.updateRole(editing.value.id, formState);
			message.success('已更新');
		} else {
			await adminApi.createRole(formState);
			message.success('已创建');
		}
		modalOpen.value = false;
		fetchRoles();
	} catch (error: any) {
		message.error(error?.message || '保存失败');
	} finally {
		saving.value = false;
	}
}

function confirmDelete(record: RoleItem) {
	Modal.confirm({
		title: '删除角色？',
		content: '删除后关联账号需要重新分配角色',
		onOk: async () => {
			await adminApi.deleteRole(record.id);
			message.success('已删除');
			fetchRoles();
		},
	});
}

onMounted(() => {
	fetchRoles();
	fetchPermissions();
});
</script>

<template>
	<div>
		<div style="margin-bottom: 16px">
			<a-button type="primary" @click="openCreate">新建角色</a-button>
		</div>
		<a-table :data-source="roles" :loading="loading" row-key="id" :pagination="false">
			<a-table-column title="名称" data-index="name" key="name" />
			<a-table-column title="描述" data-index="description" key="description" />
			<a-table-column title="权限数量" key="permissions">
				<template #default="{ record }">{{ record.permissions?.length || 0 }}</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-space>
						<a-button type="link" @click="openEdit(record)">编辑</a-button>
						<a-button type="link" danger @click="confirmDelete(record)">删除</a-button>
					</a-space>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="modalOpen" :title="editing ? '编辑角色' : '新建角色'" :confirm-loading="saving" width="720px" @ok="handleSubmit">
			<a-form layout="vertical">
				<a-form-item label="名称"><a-input v-model:value="formState.name" /></a-form-item>
				<a-form-item label="描述"><a-input v-model:value="formState.description" /></a-form-item>
				<a-form-item label="权限">
					<a-collapse>
						<a-collapse-panel v-for="group in permissionGroups" :key="group.key" :header="group.label">
							<a-checkbox-group v-model:value="formState.permissions">
								<a-row :gutter="8">
									<a-col :span="12" v-for="item in group.permissions" :key="item.code" style="margin-bottom: 6px">
										<a-checkbox :value="item.code">{{ item.label }}</a-checkbox>
									</a-col>
								</a-row>
							</a-checkbox-group>
						</a-collapse-panel>
				</a-collapse>
			</a-form-item>
		</a-form>
	</a-modal>
	</div>
</template>