<script setup lang="ts">
// n-back-top 组件会自动监听滚动容器，不需要手动处理
</script>

<template>
  <n-layout-content
    class="layout-content"
    :native-scrollbar="false"
    content-style="padding: 24px;"
  >
    <!-- 页面内容 -->
    <div class="content-wrapper">
      <slot />
    </div>

    <!-- 返回顶部 -->
    <n-back-top :right="40" :bottom="40" />
  </n-layout-content>
</template>

<style scoped>
.layout-content {
  flex: 1;
  min-height: calc(100vh - 64px);
  background-color: #f5f6fb;
  overflow-y: auto;
}

.content-wrapper {
  min-height: calc(100vh - 64px - 48px);
}
</style>
