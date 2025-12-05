<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();
const message = useMessage();

const formRef = ref();
const form = reactive({ username: '', password: '', nickname: '' });
const rules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  try {
    await session.register({ ...form });
    message.success('管理员账号已创建');
    router.push('/dashboard');
  } catch (error) {
    message.error((error as Error).message || '注册失败');
  }
};
</script>

<template>
  <div class="auth-page">
    <n-card title="初始化管理员" class="auth-card">
      <n-alert type="warning" style="margin-bottom: 16px;">
        仅当系统首次部署且没有任何管理员时才能注册。
      </n-alert>
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="设置管理员用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" placeholder="设置密码" type="password" />
        </n-form-item>
        <n-form-item label="昵称">
          <n-input v-model:value="form.nickname" placeholder="展示昵称，可选" />
        </n-form-item>
        <n-button type="primary" block :loading="session.loading" @click="handleSubmit">
          注册并登录
        </n-button>
        <n-button quaternary block tag="a" href="/admin/login" style="margin-top: 12px;">
          返回登录
        </n-button>
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
