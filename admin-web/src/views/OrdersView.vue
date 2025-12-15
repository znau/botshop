<script setup lang="ts">
import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { OrderItem, PaginationResponse } from '@/types/api';
import dayjs from 'dayjs';

const ORDER_STATUS = [
	'pending',
	'awaiting_payment',
	'paid',
	'delivering',
	'delivered',
	'awaiting_stock',
	'failed',
	'refunded',
	'expired',
];

const query = reactive<{ page: number; pageSize: number; status?: string; search?: string }>({ page: 1, pageSize: 10 });
const orders = ref<OrderItem[]>([]);
const loading = ref(false);
const total = ref(0);

const statusModal = reactive({ open: false, order: null as OrderItem | null, status: '', note: '' });

async function fetchOrders() {
	loading.value = true;
	try {
		const res: PaginationResponse<OrderItem> = await adminApi.listOrders(query);
		orders.value = res.items || [];
		total.value = res.total || 0;
	} catch (error: any) {
		message.error(error?.message || '加载订单失败');
	} finally {
		loading.value = false;
	}
}

function openStatusModal(order: OrderItem) {
	statusModal.order = order;
	statusModal.status = order.status;
	statusModal.note = '';
	statusModal.open = true;
}

async function updateStatus() {
	if (!statusModal.order) return;
	try {
		await adminApi.updateOrderStatus(statusModal.order.id, statusModal.status, statusModal.note || undefined);
		message.success('状态已更新');
		statusModal.open = false;
		fetchOrders();
	} catch (error: any) {
		message.error(error?.message || '更新失败');
	}
}

fetchOrders();
</script>

<template>
	<a-space style="margin-bottom: 12px" :size="8">
			<a-input v-model:value="query.search" allow-clear placeholder="订单号/用户" style="width: 220px" @change="fetchOrders" />
			<a-select v-model:value="query.status" allow-clear placeholder="状态" style="width: 200px" @change="fetchOrders">
				<a-select-option v-for="s in ORDER_STATUS" :key="s" :value="s">{{ s }}</a-select-option>
			</a-select>
		</a-space>

		<a-table
			:data-source="orders"
			row-key="id"
			:loading="loading"
			:pagination="{ current: query.page, pageSize: query.pageSize, total, onChange: (p, ps) => { query.page = p; query.pageSize = ps; fetchOrders(); } }"
		>
			<a-table-column title="订单号" data-index="orderSn" key="orderSn" />
			<a-table-column title="金额" key="amount">
				<template #default="{ record }">
					{{ record.totalAmount }} {{ record.currency }}
				</template>
			</a-table-column>
			<a-table-column title="状态" key="status">
				<template #default="{ record }">
					<a-tag>{{ record.status }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="创建时间" key="createdAt">
				<template #default="{ record }">{{ dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-button type="link" @click="openStatusModal(record)">更新状态</a-button>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="statusModal.open" title="更新订单状态" @ok="updateStatus">
			<a-form layout="vertical">
				<a-form-item label="状态">
					<a-select v-model:value="statusModal.status">
						<a-select-option v-for="s in ORDER_STATUS" :key="s" :value="s">{{ s }}</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="备注">
					<a-textarea v-model:value="statusModal.note" rows="3" />
				</a-form-item>
			</a-form>
		</a-modal>
</template>
