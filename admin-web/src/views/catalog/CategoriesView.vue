<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { createCategory, deleteCategory, listCategories, updateCategory } from '@/api/admin';
import type { CategoryRecord } from '@/types/api';

const message = useMessage();
const categories = ref<CategoryRecord[]>([]);
const loading = ref(false);
const showModal = ref(false);
const saving = ref(false);
const editing = ref<CategoryRecord | null>(null);
const form = reactive({ name: '', description: '', parentId: null as string | null, sort: 0, isActive: true });

const load = async () => {
  loading.value = true;
  try {
    const { items } = await listCategories();
    categories.value = items;
  } catch (error) {
    message.error((error as Error).message || '无法加载分类');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { name: '', description: '', parentId: null, sort: 0, isActive: true });
  showModal.value = true;
};

const openEdit = (record: CategoryRecord) => {
  editing.value = record;
  Object.assign(form, {
    name: record.name,
    description: record.description ?? '',
    parentId: record.parentId ?? null,
    sort: record.sort,
    isActive: record.isActive === 1,
  });
  showModal.value = true;
};

const handleSubmit = async () => {
  saving.value = true;
  try {
    const payload = { ...form };
    if (editing.value) {
      await updateCategory(editing.value.id, payload);
      message.success('分类已更新');
    } else {
      await createCategory(payload);
      message.success('分类已创建');
    }
    showModal.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (record: CategoryRecord) => {
  if (!window.confirm(`确认删除分类「${record.name}」？`)) {
    return;
  }
  await deleteCategory(record.id);
  message.success('分类已删除');
  await load();
};

onMounted(load);
</script>

<template>
  <n-card title="分类管理" :bordered="false">
    <template #action>
      <n-button type="primary" @click="openCreate">新建分类</n-button>
    </template>
    <n-spin :show="loading">
      <n-table :single-line="false">
        <thead>
          <tr>
            <th>名称</th>
            <th>上级</th>
            <th>排序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in categories" :key="record.id">
            <td>{{ record.name }}</td>
            <td>{{ record.parentId ?? '-' }}</td>
            <td>{{ record.sort }}</td>
            <td>
              <n-tag type="success" v-if="record.isActive === 1">启用</n-tag>
              <n-tag type="default" v-else>停用</n-tag>
            </td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="openEdit(record)">编辑</n-button>
                <n-button quaternary size="small" @click="handleDelete(record)">删除</n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-spin>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editing ? '编辑分类' : '新建分类'">
    <n-form label-placement="top">
      <n-form-item label="名称">
        <n-input v-model:value="form.name" placeholder="请输入分类名称" />
      </n-form-item>
      <n-form-item label="描述">
        <n-input v-model:value="form.description" placeholder="描述，可选" type="textarea" />
      </n-form-item>
      <n-form-item label="上级分类 ID">
        <n-input v-model:value="form.parentId" placeholder="无上级可留空" />
      </n-form-item>
      <n-form-item label="排序">
        <n-input-number v-model:value="form.sort" :min="0" />
      </n-form-item>
      <n-form-item label="状态">
        <n-switch v-model:value="form.isActive" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
