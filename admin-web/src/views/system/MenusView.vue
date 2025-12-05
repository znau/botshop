<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';

import { createMenu, deleteMenu, listMenus, updateMenu } from '@/api/admin';
import type { AdminMenuNode, MenuInput } from '@/types/api';

const message = useMessage();
const menus = ref<AdminMenuNode[]>([]);
const drawerVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<MenuInput>({ title: '', path: '', component: '', permission: '', parentId: null, sort: 0, isVisible: true });

const flatMenus = computed(() => {
  const result: Array<MenuInput & { id: string }> = [];
  const walk = (nodes: AdminMenuNode[], parentTitle = '') => {
    nodes.forEach((node) => {
      result.push({
        id: node.id,
        title: node.title,
        path: node.path,
        component: node.component ?? '',
        permission: node.permission ?? '',
        parentId: node.parentId ?? null,
        sort: node.sort,
        isVisible: node.isVisible,
      });
      if (node.children?.length) {
        walk(node.children, node.title);
      }
    });
  };
  walk(menus.value);
  return result;
});

const load = async () => {
  menus.value = await listMenus();
};

const openDrawer = (record?: { id: string } & MenuInput) => {
  if (record) {
    editingId.value = record.id;
    Object.assign(form, record);
  } else {
    editingId.value = null;
    Object.assign(form, { title: '', path: '', component: '', permission: '', parentId: null, sort: 0, isVisible: true });
  }
  drawerVisible.value = true;
};

const handleSave = async () => {
  saving.value = true;
  try {
    if (editingId.value) {
      await updateMenu(editingId.value, form);
      message.success('菜单已更新');
    } else {
      await createMenu(form);
      message.success('菜单已创建');
    }
    drawerVisible.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (!window.confirm('确定删除该菜单？')) return;
  await deleteMenu(id);
  message.success('菜单已删除');
  await load();
};

onMounted(load);
</script>

<template>
  <n-card title="菜单管理" :bordered="false">
    <template #action>
      <n-button type="primary" @click="openDrawer()">新建菜单</n-button>
    </template>
    <n-table :single-line="false">
      <thead>
        <tr>
          <th>名称</th>
          <th>路径</th>
          <th>组件</th>
          <th>权限</th>
          <th>排序</th>
          <th>可见</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in flatMenus" :key="item.id">
          <td>{{ item.title }}</td>
          <td>{{ item.path }}</td>
          <td>{{ item.component }}</td>
          <td>{{ item.permission }}</td>
          <td>{{ item.sort }}</td>
          <td>
            <n-tag type="success" v-if="item.isVisible">显示</n-tag>
            <n-tag v-else>隐藏</n-tag>
          </td>
          <td>
            <n-space>
              <n-button quaternary size="small" @click="openDrawer(item)">编辑</n-button>
              <n-button quaternary size="small" @click="handleDelete(item.id)">删除</n-button>
            </n-space>
          </td>
        </tr>
      </tbody>
    </n-table>
  </n-card>

  <n-drawer v-model:show="drawerVisible" :width="420" placement="right">
    <n-drawer-content :title="editingId ? '编辑菜单' : '新建菜单'">
      <n-form label-placement="top">
        <n-form-item label="名称">
          <n-input v-model:value="form.title" />
        </n-form-item>
        <n-form-item label="路径">
          <n-input v-model:value="form.path" />
        </n-form-item>
        <n-form-item label="组件标识">
          <n-input v-model:value="form.component" placeholder="例如 Dashboard" />
        </n-form-item>
        <n-form-item label="权限">
          <n-input v-model:value="form.permission" placeholder="对应后端权限码，可选" />
        </n-form-item>
        <n-form-item label="父级菜单 ID">
          <n-input v-model:value="form.parentId" placeholder="顶级菜单可留空" />
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="form.sort" :min="0" />
        </n-form-item>
        <n-form-item label="是否显示">
          <n-switch v-model:value="form.isVisible" />
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
