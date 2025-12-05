<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { listOrders, updateOrderStatusApi } from '@/api/admin';
import type { OrderRecord, Paginated } from '@/types/api';

const message = useMessage();
const filters = reactive({ page: 1, pageSize: 10, status: '', search: '' });
const orders = ref<Paginated<OrderRecord>>({ page: 1, pageSize: 10, total: 0, items: [] });
const loading = ref(false);

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '待支付', value: 'awaiting_payment' },
  { label: '已支付', value: 'paid' },
  { label: '发货中', value: 'delivering' },
  { label: '已完成', value: 'delivered' },
  { label: '异常', value: 'failed' },
];

const load = async () => {
  loading.value = true;
  try {
    orders.value = await listOrders({ ...filters, status: filters.status || undefined });
  } finally {
    loading.value = false;
  }
};

const handleUpdateStatus = async (record: OrderRecord, status: string) => {
  try {
    await updateOrderStatusApi(record.id, status);
    message.success('状态已更新');
    await load();
  } catch (error) {
    message.error((error as Error).message || '更新失败');
  }
};

onMounted(load);
</script>

<template>
  <n-card title="订单管理" :bordered="false">
    <template #action>
      <n-space>
        <n-input v-model:value="filters.search" placeholder="订单号 / 用户" clearable @update:value="load" />
        <n-select v-model:value="filters.status" :options="statusOptions" style="width: 140px" @update:value="load" />
      </n-space>
    </template>
    <n-spin :show="loading">
      <n-table :single-line="false">
        <thead>
          <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>金额</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orders.items" :key="item.id">
            <td>{{ item.orderSn }}</td>
            <td>{{ item.productTitle }}</td>
            <td>{{ item.currency }} {{ item.totalAmount }}</td>
            <td>
              <n-tag>{{ item.status }}</n-tag>
            </td>
            <td>{{ item.createdAt }}</td>
            <td>
              <n-dropdown
                trigger="click"
                :options="statusOptions.filter((opt) => opt.value && opt.value !== item.status)"
                @select="(value) => handleUpdateStatus(item, value as string)"
              >
                <n-button quaternary size="small">更新状态</n-button>
              </n-dropdown>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-spin>
  </n-card>
</template>
