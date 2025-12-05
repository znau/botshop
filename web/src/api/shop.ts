import client, { unwrap } from './client';
import type {
  ApiResponse,
  CatalogResponse,
  ProductDetailResponse,
  CheckoutResponse,
  OrdersResponseItem,
  ProfileResponse,
  LoginPayload,
  CheckoutPayload,
  UserProfile,
  RegisterPayload,
} from '@/types/api';

type ApiResult<T> = Promise<T>;
type AuthResponse = { token: string; user: UserProfile; expiresIn?: number };

export const shopApi = {
  getHealth: async (): ApiResult<{ status: string; timestamp: string }> => {
    const response = await client.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    return unwrap(response);
  },
  getCatalog: async (): ApiResult<CatalogResponse> => {
    const response = await client.get<ApiResponse<CatalogResponse>>('/catalog');
    return unwrap(response);
  },
  getProductDetail: async (productId: string): ApiResult<ProductDetailResponse> => {
    const response = await client.get<ApiResponse<ProductDetailResponse>>(`/products/${productId}`);
    return unwrap(response);
  },
  login: async (payload: LoginPayload) => {
    const response = await client.post<ApiResponse<AuthResponse>>('/login', payload);
    return unwrap(response);
  },
  register: async (payload: RegisterPayload) => {
    const response = await client.post<ApiResponse<AuthResponse>>('/register', payload);
    return unwrap(response);
  },
  loginWithTelegram: async (initData: string) => {
    const response = await client.post<ApiResponse<AuthResponse>>('/login/telegram', {
      initData,
    });
    return unwrap(response);
  },
  logout: async () => {
    const response = await client.post<ApiResponse<{ ok: boolean }>>('/logout');
    return unwrap(response);
  },
  getProfile: async (): ApiResult<ProfileResponse> => {
    const response = await client.get<ApiResponse<ProfileResponse>>('/profile');
    return unwrap(response);
  },
  getOrders: async (): ApiResult<{ orders: OrdersResponseItem[] }> => {
    const response = await client.get<ApiResponse<{ orders: OrdersResponseItem[] }>>('/orders');
    return unwrap(response);
  },
  createOrder: async (payload: CheckoutPayload): ApiResult<CheckoutResponse> => {
    const response = await client.post<ApiResponse<CheckoutResponse>>('/orders', payload);
    return unwrap(response);
  },
};
