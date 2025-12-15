import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResult } from '@/types/api';

let authToken: string | null = null;

export class ApiError extends Error {
	code: number;

	constructor(message: string, code: number) {
		super(message);
		this.code = code;
	}
}

export function setApiToken(token: string | null) {
	authToken = token;
}

const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

const client = axios.create({
	baseURL: `${apiBase}/admin`,
	timeout: 15000,
});

client.interceptors.request.use((config) => {
	if (authToken) {
		config.headers = {
			...config.headers,
			Authorization: `Bearer ${authToken}`,
		};
	}
	return config;
});

async function request<T>(config: AxiosRequestConfig) {
	const response = await client.request<ApiResult<T>>(config);
	const payload = response.data;
	if (payload.code !== 0) {
		throw new ApiError(payload.message, payload.code);
	}
	return payload.data;
}

export default {
	get<T>(url: string, config?: AxiosRequestConfig) {
		return request<T>({ url, method: 'GET', ...config });
	},
	post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
		return request<T>({ url, method: 'POST', data, ...config });
	},
	put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
		return request<T>({ url, method: 'PUT', data, ...config });
	},
	patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
		return request<T>({ url, method: 'PATCH', data, ...config });
	},
	delete<T>(url: string, config?: AxiosRequestConfig) {
		return request<T>({ url, method: 'DELETE', ...config });
	},
};
