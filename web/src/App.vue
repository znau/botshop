<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { NConfigProvider, NMessageProvider } from 'naive-ui';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import SiteFooter from '@/components/layout/SiteFooter.vue';
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
      <div class="min-h-screen flex flex-col bg-surface text-body">
        <SiteHeader @request-login="handleLoginRequest" />
        <main class="flex-1 px-4 py-6 md:px-8">
          <RouterView />
        </main>
        <SiteFooter />
        <LoginModal :open="showLogin" @close="closeLogin" />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
