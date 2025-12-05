import axios from 'axios';
import type { ApiResponse } from '@/types/api';

const client = axios.create({
  baseURL: '/api/shop',
  timeout: 10000,
});

export function setAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  if (response.data.code !== 200) {
    throw new Error(response.data.message ?? '请求失败');
  }
  return response.data.data;
}

export default client;
