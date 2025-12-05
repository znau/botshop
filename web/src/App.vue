<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { NConfigProvider, NMessageProvider } from 'naive-ui';
import AppHeader from '@/components/layout/AppHeader.vue';
import BottomNav from '@/components/layout/BottomNav.vue';
import LoginModal from '@/components/auth/LoginModal.vue';
import { useSessionStore } from '@/stores/session';

const showLogin = ref(false);
const route = useRoute();
const router = useRouter();
const session = useSessionStore();

session.bootstrap();

const closeLogin = () => {
  showLogin.value = false;
};

const handleLoginRequest = () => {
  showLogin.value = true;
};

watch(
  () => route.query.login,
  (value) => {
    if (value) {
      showLogin.value = true;
      const nextQuery = { ...route.query };
      delete nextQuery.login;
      router.replace({ query: nextQuery });
    }
  },
  { immediate: true },
);
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <div class="min-h-screen flex flex-col bg-gray-50">
        <AppHeader @request-login="handleLoginRequest" />
        
        <main class="flex-1 pb-20 md:pb-8">
          <div class="app-container py-6">
            <RouterView v-slot="{ Component }">
              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-2"
                mode="out-in"
              >
                <component :is="Component" />
              </transition>
            </RouterView>
          </div>
        </main>
        
        <BottomNav class="md:hidden" />
        
        <LoginModal :open="showLogin" @close="closeLogin" />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
/* 确保在移动端底部导航不遮挡内容 */
@media (max-width: 768px) {
  main {
    min-height: calc(100vh - 4rem - 4.5rem); /* 顶部导航 + 底部导航 */
  }
}
</style>
