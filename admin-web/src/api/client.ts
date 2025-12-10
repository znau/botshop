import axios from 'axios';
import type { ApiResponse } from '@/types/api';

// 在开发环境使用代理，生产环境使用完整 URL
const baseURL = import.meta.env.DEV ? '/api/admin' : (import.meta.env.VITE_API_BASE_URL || '') + '/api/admin';

const client = axios.create({
  baseURL,
  timeout: 15000,
});

export function setAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export async function request<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  const response = await promise;
  if (response.data.code !== 0) {
    throw new Error(response.data.message ?? '请求失败');
  }
  return response.data.data;
}

export default client;
