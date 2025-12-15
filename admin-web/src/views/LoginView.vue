<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const loading = ref(false);
const formState = reactive({ username: '', password: '' });

async function handleSubmit() {
	loading.value = true;
	try {
		await auth.login(formState);
		message.success('登录成功');
		const redirect = (route.query.redirect as string) || '/dashboard';
		router.replace(redirect);
	} catch (error: any) {
		message.error(error?.message || '登录失败');
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="login-page">
		<div class="login-card">
			<div class="login-brand">
				<div class="brand-icon">🛰️</div>
				<div>
					<h1>BotShop Admin</h1>
					<p>G3453</p>
				</div>
			</div>
			<a-form layout="vertical" :model="formState" @finish="handleSubmit">
				<a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
					<a-input v-model:value="formState.username" size="large" placeholder="admin" />
				</a-form-item>
				<a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
					<a-input-password v-model:value="formState.password" size="large" placeholder="••••••••" />
				</a-form-item>
				<a-button type="primary" block size="large" :loading="loading" html-type="submit">登录</a-button>
			</a-form>
		</div>
	</div>
</template>

<style scoped>
.login-page {
	min-height: 100vh;
	display: grid;
	place-items: center;
	background: radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.12), transparent 30%),
		radial-gradient(circle at 80% 0%, rgba(37, 99, 235, 0.16), transparent 30%),
		linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
	padding: 16px;
}
.login-card {
	width: min(420px, 100%);
	background: #ffffff;
	padding: 28px;
	border-radius: 16px;
	box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
	border: 1px solid #e5e7eb;
}
.login-brand {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 20px;
}
.brand-icon {
	width: 48px;
	height: 48px;
	border-radius: 14px;
	display: grid;
	place-items: center;
	background: linear-gradient(135deg, #2563eb, #7c3aed);
	color: #fff;
	font-size: 22px;
}
.login-brand h1 {
	margin: 0;
	font-size: 22px;
}
.login-brand p {
	margin: 4px 0 0;
	color: #64748b;
}
</style>
