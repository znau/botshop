import axios from 'axios';
import type { ApiResponse } from '@/types/api';

const client = axios.create({
  baseURL: '/api/admin',
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
