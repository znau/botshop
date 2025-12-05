<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import {
  createProduct,
  listCategories,
  listProducts,
  toggleProductStatus,
  updateProduct,
} from '@/api/admin';
import type { CategoryRecord, Paginated, ProductRecord } from '@/types/api';

const message = useMessage();
const categories = ref<CategoryRecord[]>([]);
const products = ref<Paginated<ProductRecord>>({ page: 1, pageSize: 10, total: 0, items: [] });
const loading = ref(false);
const drawerVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const filters = reactive({ page: 1, pageSize: 10, search: '', isActive: undefined as boolean | undefined });
const form = reactive({
  slug: '',
  title: '',
  categoryId: '',
  priceJson: '{"USD":10}' as string,
  defaultCurrency: 'USD',
  stock: 0,
  deliveryMode: 'code',
  isActive: true,
});

const loadCategories = async () => {
  const { items } = await listCategories();
  categories.value = items;
};

const loadProducts = async () => {
  loading.value = true;
  try {
    products.value = await listProducts(filters);
  } finally {
    loading.value = false;
  }
};

const openDrawer = (record?: ProductRecord) => {
  if (record) {
    editingId.value = record.id;
    Object.assign(form, {
      slug: record.slug,
      title: record.title,
      categoryId: record.category?.id ?? '',
      priceJson: JSON.stringify(record.priceMap, null, 2),
      defaultCurrency: record.defaultCurrency,
      stock: record.stock,
      deliveryMode: record.deliveryMode,
      isActive: record.isActive,
    });
  } else {
    editingId.value = null;
    Object.assign(form, {
      slug: '',
      title: '',
      categoryId: categories.value[0]?.id ?? '',
      priceJson: '{"USD":10}',
      defaultCurrency: 'USD',
      stock: 0,
      deliveryMode: 'code',
      isActive: true,
    });
  }
  drawerVisible.value = true;
};

const handleSave = async () => {
  try {
    saving.value = true;
    const priceMap = JSON.parse(form.priceJson) as Record<string, number>;
    const payload = {
      slug: form.slug,
      title: form.title,
      categoryId: form.categoryId,
      priceMap,
      defaultCurrency: form.defaultCurrency,
      stock: form.stock,
      deliveryMode: form.deliveryMode,
      isActive: form.isActive,
    };
    if (editingId.value) {
      await updateProduct(editingId.value, payload);
      message.success('商品已更新');
    } else {
      await createProduct(payload);
      message.success('商品已创建');
    }
    drawerVisible.value = false;
    await loadProducts();
  } catch (error) {
    message.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleStatus = async (record: ProductRecord, next: boolean) => {
  await toggleProductStatus(record.id, next);
  message.success('状态已更新');
  await loadProducts();
};

onMounted(async () => {
  await loadCategories();
  await loadProducts();
});
</script>

<template>
  <n-card title="商品管理" :bordered="false">
    <template #action>
      <n-space>
        <n-input v-model:value="filters.search" placeholder="搜索商品" clearable @update:value="loadProducts" />
        <n-select
          v-model:value="filters.isActive"
          :options="[
            { label: '全部', value: undefined },
            { label: '上架', value: true },
            { label: '下架', value: false },
          ]"
          style="width: 120px;"
          @update:value="loadProducts"
        />
        <n-button type="primary" @click="openDrawer()">新建商品</n-button>
      </n-space>
    </template>
    <n-spin :show="loading">
      <n-table :single-line="false">
        <thead>
          <tr>
            <th>标题</th>
            <th>分类</th>
            <th>价格</th>
            <th>库存</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in products.items" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.category?.name ?? '-' }}</td>
            <td>{{ item.priceLabel }}</td>
            <td>{{ item.stock }}</td>
            <td>
              <n-tag type="success" v-if="item.isActive">上架</n-tag>
              <n-tag v-else>下架</n-tag>
            </td>
            <td>{{ item.updatedAt }}</td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="openDrawer(item)">编辑</n-button>
                <n-button quaternary size="small" @click="handleStatus(item, !item.isActive)">
                  {{ item.isActive ? '下架' : '上架' }}
                </n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-spin>
  </n-card>

  <n-drawer v-model:show="drawerVisible" :width="420" placement="right">
    <n-drawer-content :title="editingId ? '编辑商品' : '新建商品'">
      <n-form label-placement="top">
        <n-form-item label="Slug">
          <n-input v-model:value="form.slug" placeholder="唯一标识" />
        </n-form-item>
        <n-form-item label="标题">
          <n-input v-model:value="form.title" placeholder="商品标题" />
        </n-form-item>
        <n-form-item label="分类">
          <n-select v-model:value="form.categoryId" :options="categories.map((c) => ({ label: c.name, value: c.id }))" />
        </n-form-item>
        <n-form-item label="默认币种">
          <n-input v-model:value="form.defaultCurrency" />
        </n-form-item>
        <n-form-item label="库存">
          <n-input-number v-model:value="form.stock" :min="0" />
        </n-form-item>
        <n-form-item label="发货方式">
          <n-select
            v-model:value="form.deliveryMode"
            :options="[
              { label: '自动发码', value: 'code' },
              { label: '文本交付', value: 'text' },
              { label: '人工处理', value: 'manual' },
            ]"
          />
        </n-form-item>
        <n-form-item label="价格 JSON">
          <n-input v-model:value="form.priceJson" type="textarea" placeholder='例如: {"USD":10, "CNY":68}' />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="form.isActive" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space>
          <n-button @click="drawerVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>
