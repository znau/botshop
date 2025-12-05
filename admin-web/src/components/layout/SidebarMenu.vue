<script setup lang="ts">
import type { MenuOption } from 'naive-ui';
import { computed } from 'vue';

import type { AdminMenuNode } from '@/types/api';

const props = defineProps<{ menus: AdminMenuNode[]; collapsed?: boolean }>();
const emit = defineEmits<{ (e: 'select', path: string): void }>();

const options = computed<MenuOption[]>(() => buildMenuOptions(props.menus));

const handleSelect = (key: string) => {
  emit('select', key);
};

function buildMenuOptions(nodes: AdminMenuNode[]): MenuOption[] {
  return nodes.map((node) => ({
    key: node.path || node.id,
    label: node.title,
    children: node.children?.length ? buildMenuOptions(node.children) : undefined,
  }));
}
</script>

<template>
  <n-menu
    :collapsed="collapsed"
    :collapsed-width="64"
    :options="options"
    :indent="18"
    accordion
    :value="null"
    @update:value="handleSelect"
  />
</template>
