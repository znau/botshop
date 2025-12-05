<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { listUsers, toggleUserBlock } from '@/api/admin';
import type { Paginated, UserRecord } from '@/types/api';

const message = useMessage();
const filters = reactive({ page: 1, pageSize: 10, search: '' });
const users = ref<Paginated<UserRecord>>({ page: 1, pageSize: 10, total: 0, items: [] });
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    users.value = await listUsers(filters);
  } finally {
    loading.value = false;
  }
};

const handleToggle = async (record: UserRecord, value: boolean) => {
  await toggleUserBlock(record.id, value);
  message.success(value ? '已封禁' : '已解除封禁');
  await load();
};

onMounted(load);
</script>

<template>
  <n-card title="用户管理" :bordered="false">
    <template #action>
      <n-input v-model:value="filters.search" placeholder="搜索用户" clearable @update:value="load" />
    </template>
    <n-spin :show="loading">
      <n-table :single-line="false">
        <thead>
          <tr>
            <th>昵称</th>
            <th>用户名</th>
            <th>语言</th>
            <th>创建时间</th>
            <th>最后活跃</th>
            <th>封禁</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in users.items" :key="item.id">
            <td>{{ item.nickname }}</td>
            <td>{{ item.username ?? '-' }}</td>
            <td>{{ item.language ?? '-' }}</td>
            <td>{{ item.createdAt }}</td>
            <td>{{ item.lastInteractionAt }}</td>
            <td>
              <n-switch :value="item.isBlocked" @update:value="(val) => handleToggle(item, val)" />
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-spin>
  </n-card>
</template>
