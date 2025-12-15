<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/api/admin';
import type { DashboardStats } from '@/types/api';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

const loading = ref(false);
const data = ref<DashboardStats | null>(null);

async function fetchData() {
	loading.value = true;
	try {
		data.value = await adminApi.dashboard();
	} catch (error: any) {
		message.error(error?.message || '加载仪表盘失败');
	} finally {
		loading.value = false;
	}
}

onMounted(fetchData);
</script>

<template>
	<a-spin :spinning="loading">
			<div class="stats-grid">
				<a-card v-for="item in ['categories', 'products', 'orders', 'users']" :key="item" bordered={false}>
					<div class="stat-label">{{ { categories: '分类', products: '商品', orders: '订单', users: '用户' }[item] }}</div>
					<div class="stat-value">{{ data?.stats?.[item] ?? 0 }}</div>
				</a-card>
				<a-card bordered={false}>
					<div class="stat-label">累计营收</div>
					<div class="stat-value revenue">${{ data?.stats?.revenue?.toFixed?.(2) ?? '0.00' }}</div>
				</a-card>
			</div>

			<div class="panel-grid">
				<a-card title="最新订单" :bordered="false">
					<a-list :data-source="data?.latestOrders || []">
						<template #renderItem="{ item }">
							<a-list-item>
								<a-list-item-meta :title="item.orderSn" :description="dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')" />
								<div class="list-amount">{{ item.totalAmount }} {{ item.currency }}</div>
							</a-list-item>
						</template>
					</a-list>
				</a-card>
				<a-card title="新增用户" :bordered="false">
					<a-list :data-source="data?.latestUsers || []">
						<template #renderItem="{ item }">
							<a-list-item>
								<a-list-item-meta :title="item.nickname || '匿名用户'" :description="dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')" />
							</a-list-item>
						</template>
					</a-list>
				</a-card>
			</div>
		</a-spin>
</template>

<style scoped>
.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 12px;
	margin-bottom: 12px;
}
.stat-label {
	color: #64748b;
	font-size: 13px;
}
.stat-value {
	font-size: 28px;
	font-weight: 800;
	margin-top: 6px;
}
.revenue {
	color: #16a34a;
}
.panel-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 12px;
}
.list-amount {
	font-weight: 700;
}
</style>
