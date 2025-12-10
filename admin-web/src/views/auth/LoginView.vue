<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';

import { useSessionStore } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const message = useMessage();

const formRef = ref();
const form = reactive({ username: '', password: '' });
const rules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  try {
    await session.login({ ...form });
    console.log('登录成功，menus:', session.menus);
    console.log('defaultRoute:', session.defaultRoute);
    const redirect = (route.query.redirect as string) ?? session.defaultRoute ?? '/dashboard';
    console.log('准备跳转到:', redirect);
    await router.push(redirect);
    message.success('登录成功');
  } catch (error) {
    console.error('登录失败:', error);
    message.error((error as Error).message || '登录失败');
  }
};
</script>

<template>
  <div class="auth-page">
    <n-card title="管理员登录" class="auth-card">
      <n-form ref="formRef" :rules="rules" :model="form" label-placement="top">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="请输入密码" />
        </n-form-item>
        <n-button type="primary" block :loading="session.loading" @click="handleSubmit">
          登录
        </n-button>
        <!-- <n-button quaternary block tag="a" href="/admin/register" style="margin-top: 12px;">
          新部署？立即注册首个管理员
        </n-button> -->
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  padding: 24px;
}
.auth-card {
  width: 360px;
}
</style>
