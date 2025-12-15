<script setup lang="ts">
import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { PaginationResponse, UserItem } from '@/types/api';
import dayjs from 'dayjs';

const query = reactive<{ page: number; pageSize: number; search?: string }>({ page: 1, pageSize: 10 });
const users = ref<UserItem[]>([]);
const total = ref(0);
const loading = ref(false);

async function fetchUsers() {
	loading.value = true;
	try {
		const res: PaginationResponse<UserItem> = await adminApi.listUsers(query);
		users.value = res.items || [];
		total.value = res.total || 0;
	} catch (error: any) {
		message.error(error?.message || '加载用户失败');
	} finally {
		loading.value = false;
	}
}

async function toggleBlock(record: UserItem) {
	try {
		await adminApi.toggleUserBlock(record.id, !record.isBlocked);
		message.success(!record.isBlocked ? '已封禁' : '已解封');
		fetchUsers();
	} catch (error: any) {
		message.error(error?.message || '操作失败');
	}
}

fetchUsers();
</script>

<template>
	<a-input
		v-model:value="query.search"
		allow-clear
		placeholder="搜索昵称/用户名"
		style="width: 240px; margin-bottom: 12px"
		@change="fetchUsers"
	/>

		<a-table
			:data-source="users"
			row-key="id"
			:loading="loading"
			:pagination="{ current: query.page, pageSize: query.pageSize, total, onChange: (p, ps) => { query.page = p; query.pageSize = ps; fetchUsers(); } }"
		>
			<a-table-column title="昵称" data-index="nickname" key="nickname" />
			<a-table-column title="用户名" data-index="username" key="username" />
			<a-table-column title="Telegram" key="telegramId">
				<template #default="{ record }">{{ record.telegramId || '-' }}</template>
			</a-table-column>
			<a-table-column title="注册时间" key="createdAt">
				<template #default="{ record }">{{ record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') : '-' }}</template>
			</a-table-column>
			<a-table-column title="状态" key="isBlocked">
				<template #default="{ record }">
					<a-tag :color="record.isBlocked ? 'red' : 'green'">{{ record.isBlocked ? '已封禁' : '正常' }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-button type="link" danger @click="toggleBlock(record)">{{ record.isBlocked ? '解封' : '封禁' }}</a-button>
				</template>
			</a-table-column>
		</a-table>
</template>
