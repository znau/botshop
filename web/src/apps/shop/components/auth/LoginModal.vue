<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSelect, useMessage } from 'naive-ui';
import { useSessionStore } from '@shop/stores/session';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (event: 'close'): void }>();

const session = useSessionStore();
const message = useMessage();
const form = ref({ username: '', password: '', nickname: '', language: 'en' });
const loading = ref(false);
const supportsTelegram = Boolean(window.Telegram?.WebApp?.initData);
const mode = ref<'login' | 'register'>('login');
const languageOptions = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
];
const isLoginMode = computed(() => mode.value === 'login');
const title = computed(() => (isLoginMode.value ? '欢迎回来' : '创建新账号'));
const primaryButtonText = computed(() => (isLoginMode.value ? '立即登录' : '立即注册'));

const resetForm = () => {
  form.value = { username: '', password: '', nickname: '', language: 'en' };
  mode.value = 'login';
};

const handleClose = () => {
  emit('close');
};

const submit = async () => {
  try {
    loading.value = true;
    if (isLoginMode.value) {
      await session.login({ username: form.value.username, password: form.value.password });
      message.success('登录成功');
    } else {
      await session.register({
        username: form.value.username,
        password: form.value.password,
        nickname: form.value.nickname.trim() || undefined,
        language: form.value.language,
      });
      message.success('注册成功');
    }
    emit('close');
  } catch (error) {
    const fallback = isLoginMode.value ? '登录失败' : '注册失败';
    message.error(error instanceof Error ? error.message : fallback);
  } finally {
    loading.value = false;
  }
};

const loginWithTelegram = async () => {
  try {
    loading.value = true;
    const initData = window.Telegram?.WebApp?.initData;
    await session.loginWithTelegram(initData ?? '');
    message.success('已通过 Telegram 登录');
    emit('close');
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Telegram 登录失败');
  } finally {
    loading.value = false;
  }
};

const toggleMode = () => {
  mode.value = isLoginMode.value ? 'register' : 'login';
};

watch(
  () => props.open,
  (value) => {
    if (!value) resetForm();
  },
);
</script>

<template>
  <NModal :show="props.open" :mask-closable="false" preset="card" @close="handleClose">
    <NCard class="w-[360px]" :title="title">
      <NForm @submit.prevent="submit">
        <NFormItem label="用户名">
          <NInput v-model:value="form.username" placeholder="请输入用户名" />
        </NFormItem>
        <NFormItem label="密码">
          <NInput v-model:value="form.password" type="password" placeholder="请输入密码" />
        </NFormItem>
        <template v-if="!isLoginMode">
          <NFormItem label="昵称 (选填)">
            <NInput v-model:value="form.nickname" placeholder="用于展示的昵称" />
          </NFormItem>
          <NFormItem label="语言">
            <NSelect v-model:value="form.language" :options="languageOptions" />
          </NFormItem>
        </template>
        <div class="flex flex-col gap-2">
          <NButton type="primary" block :loading="loading" @click="submit">
            {{ primaryButtonText }}
          </NButton>
          <NButton v-if="isLoginMode && supportsTelegram" block :loading="loading" @click="loginWithTelegram">
            使用 Telegram 授权
          </NButton>
          <NButton text type="primary" @click="toggleMode">
            {{ isLoginMode ? '没有账号？立即注册' : '已有账号？去登录' }}
          </NButton>
        </div>
      </NForm>
    </NCard>
  </NModal>
</template>
