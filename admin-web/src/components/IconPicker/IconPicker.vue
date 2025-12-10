<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  value?: string | null;
}>();

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const message = useMessage();
const showModal = ref(false);
const searchText = ref('');

// Carbon Icons 常用图标列表
const iconList = [
  // 通用
  'carbon:dashboard', 'carbon:home', 'carbon:settings', 'carbon:user', 'carbon:user-multiple',
  'carbon:chart-line', 'carbon:analytics', 'carbon:report', 'carbon:data-table',
  
  // 菜单导航
  'carbon:menu', 'carbon:side-panel', 'carbon:list', 'carbon:grid', 'carbon:tree-view',
  
  // 文件和文档
  'carbon:document', 'carbon:folder', 'carbon:file', 'carbon:catalog', 'carbon:notebook',
  
  // 商品和订单
  'carbon:package', 'carbon:shopping-cart', 'carbon:order-details', 'carbon:shopping-bag',
  'carbon:product', 'carbon:category', 'carbon:tag', 'carbon:price-tag',
  
  // 用户和权限
  'carbon:user-admin', 'carbon:user-role', 'carbon:credentials', 'carbon:security',
  'carbon:locked', 'carbon:unlocked', 'carbon:view', 'carbon:view-off',
  
  // 操作
  'carbon:add', 'carbon:edit', 'carbon:delete', 'carbon:save', 'carbon:close',
  'carbon:search', 'carbon:filter', 'carbon:refresh', 'carbon:download', 'carbon:upload',
  
  // 状态
  'carbon:checkmark', 'carbon:error', 'carbon:warning', 'carbon:information',
  'carbon:help', 'carbon:notification', 'carbon:star', 'carbon:favorite',
  
  // 箭头和导航
  'carbon:arrow-right', 'carbon:arrow-left', 'carbon:arrow-up', 'carbon:arrow-down',
  'carbon:chevron-right', 'carbon:chevron-left', 'carbon:chevron-up', 'carbon:chevron-down',
  
  // 其他
  'carbon:time', 'carbon:calendar', 'carbon:location', 'carbon:email', 'carbon:phone',
  'carbon:link', 'carbon:image', 'carbon:code', 'carbon:language', 'carbon:translate',
];

const filteredIcons = computed(() => {
  if (!searchText.value) return iconList;
  const search = searchText.value.toLowerCase();
  return iconList.filter(icon => icon.toLowerCase().includes(search));
});

const selectIcon = (icon: string) => {
  emit('update:value', icon);
  showModal.value = false;
};

const clearIcon = () => {
  emit('update:value', '');
};

const copyIcon = () => {
  if (props.value) {
    navigator.clipboard.writeText(props.value);
    message.success('图标代码已复制');
  }
};
</script>

<template>
  <div class="icon-picker">
    <n-input-group>
      <n-input 
        :value="value || ''" 
        @update:value="emit('update:value', $event)"
        placeholder="carbon:dashboard"
        style="flex: 1;"
      >
        <template #prefix>
          <div v-if="value" class="icon-preview">
            <Icon :icon="value" />
          </div>
        </template>
      </n-input>
      <n-button @click="showModal = true">
        <template #icon>
          <Icon icon="carbon:grid" />
        </template>
      </n-button>
      <n-button v-if="value" @click="clearIcon">
        <template #icon>
          <Icon icon="carbon:close" />
        </template>
      </n-button>
    </n-input-group>

    <n-modal v-model:show="showModal" preset="card" title="选择图标" style="width: 800px;">
      <n-space vertical>
        <n-input 
          v-model:value="searchText" 
          placeholder="搜索图标..."
          clearable
        >
          <template #prefix>
            <Icon icon="carbon:search" />
          </template>
        </n-input>

        <div class="icon-grid">
          <div 
            v-for="icon in filteredIcons" 
            :key="icon"
            class="icon-item"
            :class="{ active: value === icon }"
            @click="selectIcon(icon)"
            :title="icon"
          >
            <Icon :icon="icon" class="icon" />
            <div class="icon-name">{{ icon.split(':')[1] }}</div>
          </div>
        </div>

        <n-empty v-if="filteredIcons.length === 0" description="未找到匹配的图标" />
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.icon-picker {
  width: 100%;
}

.icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--n-text-color);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--n-color);
}

.icon-item:hover {
  border-color: var(--n-color-target);
  background: var(--n-color-hover);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-item.active {
  border-color: var(--n-color-target);
  background: var(--n-color-pressed);
}

.icon-item .icon {
  font-size: 28px;
  margin-bottom: 8px;
  color: var(--n-text-color);
}

.icon-item .icon-name {
  font-size: 12px;
  color: var(--n-text-color-2);
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
}

.icon-item.active .icon {
  color: var(--n-color-target);
}
</style>
