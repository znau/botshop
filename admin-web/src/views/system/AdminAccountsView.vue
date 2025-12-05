<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import {
  createAdmin,
  listAdmins,
  listRoles,
  updateAdminRole,
  updateAdminStatus,
} from '@/api/admin';
import type { AdminAccountRecord, AdminRole } from '@/types/api';

const message = useMessage();
const admins = ref<AdminAccountRecord[]>([]);
const roles = ref<AdminRole[]>([]);
const showModal = ref(false);
const saving = ref(false);
const form = reactive({ username: '', password: '', nickname: '', roleId: '' });

const load = async () => {
  const [adminList, roleList] = await Promise.all([listAdmins(), listRoles()]);
  admins.value = adminList;
  roles.value = roleList;
  if (!form.roleId && roleList.length) {
    form.roleId = roleList[0].id;
  }
};

const openModal = () => {
  Object.assign(form, { username: '', password: '', nickname: '', roleId: roles.value[0]?.id ?? '' });
  showModal.value = true;
};

const handleCreate = async () => {
  if (!form.roleId) {
    message.error('请选择角色');
    return;
  }
  saving.value = true;
  try {
    await createAdmin({ ...form });
    message.success('管理员已创建');
    showModal.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message || '创建失败');
  } finally {
    saving.value = false;
  }
};

const handleRoleChange = async (record: AdminAccountRecord, roleId: string) => {
  await updateAdminRole(record.id, roleId);
  message.success('角色已更新');
  await load();
};

const handleStatusChange = async (record: AdminAccountRecord, value: boolean) => {
  await updateAdminStatus(record.id, value);
  message.success('状态已更新');
  await load();
};

onMounted(load);
</script>

<template>
  <n-card title="管理员账号" :bordered="false">
    <template #action>
      <n-button type="primary" @click="openModal">新建管理员</n-button>
    </template>
    <n-table :single-line="false">
      <thead>
        <tr>
          <th>用户名</th>
          <th>昵称</th>
          <th>角色</th>
          <th>状态</th>
          <th>最后登录</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="admin in admins" :key="admin.id">
          <td>{{ admin.username }}</td>
          <td>{{ admin.nickname }}</td>
          <td>
            <n-select
              :value="admin.role.id"
              :options="roles.map((role) => ({ label: role.name, value: role.id }))"
              @update:value="(val) => handleRoleChange(admin, val as string)"
            />
          </td>
          <td>
            <n-switch :value="admin.isActive" @update:value="(val) => handleStatusChange(admin, val)" />
          </td>
          <td>{{ admin.lastLoginAt ?? '-' }}</td>
        </tr>
      </tbody>
    </n-table>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" title="新建管理员">
    <n-form label-placement="top">
      <n-form-item label="用户名">
        <n-input v-model:value="form.username" />
      </n-form-item>
      <n-form-item label="密码">
        <n-input v-model:value="form.password" type="password" />
      </n-form-item>
      <n-form-item label="昵称">
        <n-input v-model:value="form.nickname" />
      </n-form-item>
      <n-form-item label="角色">
        <n-select v-model:value="form.roleId" :options="roles.map((role) => ({ label: role.name, value: role.id }))" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleCreate">创建</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
