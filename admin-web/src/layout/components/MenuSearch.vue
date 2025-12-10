<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useSessionStore } from '@/stores/session';
import type { AdminMenuNode } from '@/types/api';

interface Props {
  show: boolean;
}

interface MenuItem {
  id: string;
  title: string;
  path: string;
  parentTitle?: string;
  icon?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const router = useRouter();
const message = useMessage();
const session = useSessionStore();

const searchValue = ref('');
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

// 展平菜单树
function flattenMenus(menus: AdminMenuNode[], parent?: AdminMenuNode): MenuItem[] {
  const result: MenuItem[] = [];
  
  for (const menu of menus) {
    if (menu.path && menu.isVisible) {
      result.push({
        id: menu.id,
        title: menu.title,
        path: menu.path,
        parentTitle: parent?.title,
        icon: menu.icon || undefined,
      });
    }
    
    if (menu.children && menu.children.length > 0) {
      result.push(...flattenMenus(menu.children, menu));
    }
  }
  
  return result;
}

// 所有菜单项
const allMenuItems = computed(() => flattenMenus(session.menus));

// 过滤后的菜单项
const filteredMenus = computed(() => {
  if (!searchValue.value.trim()) {
    return allMenuItems.value.slice(0, 10); // 默认显示前10个
  }
  
  const keyword = searchValue.value.toLowerCase().trim();
  return allMenuItems.value.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(keyword);
    const parentMatch = item.parentTitle?.toLowerCase().includes(keyword);
    const pathMatch = item.path.toLowerCase().includes(keyword);
    return titleMatch || parentMatch || pathMatch;
  });
});

// 监听搜索值变化，重置选中索引
watch(searchValue, () => {
  selectedIndex.value = 0;
});

// 监听显示状态
watch(() => props.show, (show) => {
  if (show) {
    searchValue.value = '';
    selectedIndex.value = 0;
    // 使用 nextTick 确保 DOM 已更新
    setTimeout(() => {
      inputRef.value?.focus();
    }, 100);
  }
});

// 键盘导航
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredMenus.value.length - 1);
      scrollToSelected();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      scrollToSelected();
      break;
    case 'Enter':
      e.preventDefault();
      if (filteredMenus.value[selectedIndex.value]) {
        selectMenu(filteredMenus.value[selectedIndex.value]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      handleClose();
      break;
  }
};

// 滚动到选中项
const scrollToSelected = () => {
  const listElement = document.querySelector('.menu-search-list');
  const selectedElement = document.querySelector('.menu-item.selected');
  
  if (listElement && selectedElement) {
    const listRect = listElement.getBoundingClientRect();
    const selectedRect = selectedElement.getBoundingClientRect();
    
    if (selectedRect.bottom > listRect.bottom) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (selectedRect.top < listRect.top) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
};

// 选择菜单
const selectMenu = (item: MenuItem) => {
  router.push(item.path);
  message.success(`正在跳转到: ${item.title}`);
  handleClose();
};

// 关闭搜索框
const handleClose = () => {
  emit('update:show', false);
};

// 高亮搜索关键词
const highlightKeyword = (text: string) => {
  if (!searchValue.value.trim()) return text;
  
  const keyword = searchValue.value.trim();
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// 全局快捷键监听
const handleGlobalKeydown = (e: KeyboardEvent) => {
  // Ctrl+K 或 Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    emit('update:show', !props.show);
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="true"
    :close-on-esc="true"
    preset="card"
    class="menu-search-modal"
    :bordered="false"
    :style="{ width: '600px', maxWidth: '90vw' }"
    @update:show="emit('update:show', $event)"
    @mask-click="handleClose"
  >
    <template #header>
      <div class="search-header">
        <n-input
          ref="inputRef"
          v-model:value="searchValue"
          placeholder="搜索菜单... (支持 Ctrl+K 快捷键)"
          size="large"
          clearable
          @keydown="handleKeydown"
        >
          <template #prefix>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/>
              </svg>
            </n-icon>
          </template>
          <template #suffix>
            <n-tag size="small" :bordered="false">Ctrl+K</n-tag>
          </template>
        </n-input>
      </div>
    </template>

    <div class="menu-search-content">
      <div v-if="filteredMenus.length === 0" class="empty-state">
        <n-empty description="没有找到匹配的菜单" size="small">
          <template #icon>
            <n-icon size="48">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </n-icon>
          </template>
        </n-empty>
      </div>

      <div v-else class="menu-search-list">
        <div
          v-for="(item, index) in filteredMenus"
          :key="item.id"
          class="menu-item"
          :class="{ selected: index === selectedIndex }"
          @click="selectMenu(item)"
          @mouseenter="selectedIndex = index"
        >
          <div class="menu-item-icon">
            <n-icon v-if="item.icon" size="20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
            </n-icon>
            <n-icon v-else size="20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2l-5.5 9h11z"/>
              </svg>
            </n-icon>
          </div>
          <div class="menu-item-content">
            <div class="menu-item-title" v-html="highlightKeyword(item.title)"></div>
            <div v-if="item.parentTitle" class="menu-item-subtitle">
              {{ item.parentTitle }} / {{ item.title }}
            </div>
          </div>
          <div class="menu-item-path">
            <n-text depth="3" style="font-size: 12px;">{{ item.path }}</n-text>
          </div>
        </div>
      </div>

      <div class="search-tips">
        <n-text depth="3" style="font-size: 12px;">
          <span class="tip-item"><kbd>↑</kbd> <kbd>↓</kbd> 导航</span>
          <span class="tip-item"><kbd>Enter</kbd> 选择</span>
          <span class="tip-item"><kbd>Esc</kbd> 关闭</span>
        </n-text>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.menu-search-modal {
  top: 100px;
}

.search-header {
  margin: -20px -24px 0;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.menu-search-content {
  margin: 0 -24px -20px;
}

.menu-search-list {
  max-height: 400px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.menu-item:hover,
.menu-item.selected {
  background-color: rgba(24, 160, 88, 0.08);
  border-left-color: #18a058;
}

.menu-item-icon {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.menu-item.selected .menu-item-icon {
  color: #18a058;
}

.menu-item-content {
  flex: 1;
  min-width: 0;
}

.menu-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2d3d;
  margin-bottom: 4px;
}

.menu-item-title :deep(mark) {
  background-color: #ffd700;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.menu-item-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item-path {
  flex-shrink: 0;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 40px 24px;
}

.search-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background-color: rgba(0, 0, 0, 0.02);
}

.tip-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  line-height: 1;
  color: #1f2d3d;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-family: monospace;
}

/* 自定义滚动条 */
.menu-search-list::-webkit-scrollbar {
  width: 6px;
}

.menu-search-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.menu-search-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
