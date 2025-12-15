<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { AdminAccount, RoleItem } from '@/types/api';

const admins = ref<AdminAccount[]>([]);
const roles = ref<RoleItem[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const saving = ref(false);
const creating = reactive({ username: '', password: '', nickname: '', roleId: '' });

async function fetchData() {
	loading.value = true;
	try {
		const [adminList, roleList] = await Promise.all([adminApi.listAdmins(), adminApi.listRoles()]);
		admins.value = adminList || [];
		roles.value = roleList || [];
	} catch (error: any) {
		message.error(error?.message || '加载管理员失败');
	} finally {
		loading.value = false;
	}
}

function openCreate() {
	Object.assign(creating, { username: '', password: '', nickname: '', roleId: roles.value[0]?.id || '' });
	modalOpen.value = true;
}

async function handleCreate() {
	saving.value = true;
	try {
		await adminApi.createAdmin({ ...creating });
		message.success('已创建');
		modalOpen.value = false;
		fetchData();
	} catch (error: any) {
		message.error(error?.message || '创建失败');
	} finally {
		saving.value = false;
	}
}

async function changeRole(record: AdminAccount, roleId: string) {
	await adminApi.updateAdminRole(record.id, roleId);
	message.success('已更新角色');
	fetchData();
}

function toggleStatus(record: AdminAccount) {
	Modal.confirm({
		title: record.isActive ? '停用该管理员？' : '启用该管理员？',
		onOk: async () => {
			await adminApi.toggleAdminStatus(record.id, !record.isActive);
			message.success('状态已更新');
			fetchData();
		},
	});
}

onMounted(fetchData);
</script>

<template>
	<div>
		<div style="margin-bottom: 16px">
			<a-button type="primary" @click="openCreate">新建账号</a-button>
		</div>
		<a-table :data-source="admins" :loading="loading" row-key="id" :pagination="false">
			<a-table-column title="用户名" data-index="username" key="username" />
			<a-table-column title="昵称" data-index="nickname" key="nickname" />
			<a-table-column title="角色" key="role">
				<template #default="{ record }">
					<a-select :value="record.role?.id" style="width: 160px" @change="(val) => changeRole(record, val)">
						<a-select-option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-select-option>
					</a-select>
				</template>
			</a-table-column>
			<a-table-column title="状态" key="isActive">
				<template #default="{ record }">
					<a-tag :color="record.isActive ? 'green' : 'red'">{{ record.isActive ? '启用' : '停用' }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-button type="link" danger @click="toggleStatus(record)">{{ record.isActive ? '停用' : '启用' }}</a-button>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="modalOpen" title="新建管理员" :confirm-loading="saving" @ok="handleCreate">
			<a-form layout="vertical">
				<a-form-item label="用户名"><a-input v-model:value="creating.username" /></a-form-item>
				<a-form-item label="密码"><a-input-password v-model:value="creating.password" /></a-form-item>
				<a-form-item label="昵称"><a-input v-model:value="creating.nickname" /></a-form-item>
				<a-form-item label="角色">
					<a-select v-model:value="creating.roleId" placeholder="选择角色">
						<a-select-option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-select-option>
				</a-select>
			</a-form-item>
		</a-form>
	</a-modal>
	</div>
</template>