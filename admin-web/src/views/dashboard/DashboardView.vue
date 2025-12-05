<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { fetchDashboard } from '@/api/admin';
import type { DashboardMetrics } from '@/types/api';

const message = useMessage();
const loading = ref(false);
const metrics = ref<DashboardMetrics | null>(null);

const load = async () => {
  loading.value = true;
  try {
    metrics.value = await fetchDashboard();
  } catch (error) {
    message.error((error as Error).message || '无法加载仪表盘数据');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <n-spin :show="loading">
    <div v-if="metrics" class="dashboard-grid">
      <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <n-grid-item v-for="(value, key) in metrics.stats" :key="key">
          <n-card>
            <div class="stat-label">{{ key }}</div>
            <div class="stat-value">{{ value }}</div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <div class="dashboard-panels">
        <n-card title="最新订单" class="panel">
          <n-empty v-if="!metrics.latestOrders.length" description="暂无订单" />
          <template v-else>
            <div v-for="order in metrics.latestOrders" :key="order.orderSn" class="list-row">
              <div>
                <div class="row-title">{{ order.orderSn }}</div>
                <small>{{ order.createdAt }}</small>
              </div>
              <n-tag>{{ order.status }}</n-tag>
              <span>{{ order.totalAmount }}</span>
            </div>
          </template>
        </n-card>
        <n-card title="新增用户" class="panel">
          <n-empty v-if="!metrics.latestUsers.length" description="暂无数据" />
          <template v-else>
            <div v-for="user in metrics.latestUsers" :key="user.id" class="list-row">
              <div class="row-title">{{ user.nickname }}</div>
              <small>{{ user.createdAt }}</small>
            </div>
          </template>
        </n-card>
      </div>
    </div>
  </n-spin>
</template>

<style scoped>
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stat-label {
  color: rgba(0, 0, 0, 0.45);
  text-transform: capitalize;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  margin-top: 8px;
}
.dashboard-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.06);
}
.list-row:last-child {
  border-bottom: none;
}
.row-title {
  font-weight: 600;
}
.panel {
  min-height: 240px;
}
</style>
