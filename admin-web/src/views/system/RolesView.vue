<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { createRole, deleteRole, listRoles, updateRole } from '@/api/admin';
import { usePermissionData } from '@/composables/usePermissionData';
import type { AdminRole } from '@/types/api';

const message = useMessage();
const { permissionGroups, loading: loadingPermissions } = usePermissionData();
const roles = ref<AdminRole[]>([]);
const showModal = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: '', description: '', permissions: [] as string[] });

// 将权限分组数据转换为扁平列表供 checkbox 使用
const permissionList = computed(() => {
  return permissionGroups.value.flatMap(group => 
    group.permissions.map(perm => ({
      value: perm.code,
      label: perm.name,
      group: group.name
    }))
  );
});

const load = async () => {
  roles.value = await listRoles();
};

const openModal = (record?: AdminRole) => {
  if (record) {
    editingId.value = record.id;
    Object.assign(form, {
      name: record.name,
      description: record.description ?? '',
      permissions: [...record.permissions],
    });
  } else {
    editingId.value = null;
    Object.assign(form, { name: '', description: '', permissions: [] });
  }
  showModal.value = true;
};

const handleSave = async () => {
  saving.value = true;
  try {
    const payload = { ...form };
    if (editingId.value) {
      await updateRole(editingId.value, payload);
      message.success('角色已更新');
    } else {
      await createRole(payload);
      message.success('角色已创建');
    }
    showModal.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (record: AdminRole) => {
  if (!window.confirm(`确认删除角色「${record.name}」？`)) return;
  await deleteRole(record.id);
  message.success('角色已删除');
  await load();
};

onMounted(load);
</script>

<template>
  <n-card title="角色管理" :bordered="false">
    <template #action>
      <n-button type="primary" @click="openModal()">新建角色</n-button>
    </template>
    <n-table :single-line="false">
      <thead>
        <tr>
          <th>名称</th>
          <th>描述</th>
          <th>权限数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.id">
          <td>{{ role.name }}</td>
          <td>{{ role.description }}</td>
          <td>{{ role.permissions.length }}</td>
          <td>
            <n-space>
              <n-button quaternary size="small" @click="openModal(role)">编辑</n-button>
              <n-button quaternary size="small" @click="handleDelete(role)">删除</n-button>
            </n-space>
          </td>
        </tr>
      </tbody>
    </n-table>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editingId ? '编辑角色' : '新建角色'">
    <n-form label-placement="top">
      <n-form-item label="名称">
        <n-input v-model:value="form.name" />
      </n-form-item>
      <n-form-item label="描述">
        <n-input v-model:value="form.description" />
      </n-form-item>
      <n-form-item label="权限">
        <n-spin :show="loadingPermissions">
          <n-checkbox-group v-model:value="form.permissions">
            <n-space vertical>
              <div v-for="group in permissionGroups" :key="group.name">
                <n-divider title-placement="left">{{ group.name }}</n-divider>
                <n-space>
                  <n-checkbox v-for="perm in group.permissions" :key="perm.code" :value="perm.code">
                    {{ perm.name }}
                  </n-checkbox>
                </n-space>
              </div>
            </n-space>
          </n-checkbox-group>
        </n-spin>
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
