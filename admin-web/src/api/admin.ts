import client, { request } from './client';
import type {
  AdminAccountRecord,
  AdminMenuNode,
  AdminProfileResponse,
  AdminRole,
  CategoryRecord,
  DashboardMetrics,
  MenuInput,
  OrderRecord,
  Paginated,
  ProductRecord,
  RoleInput,
  UserRecord,
} from '@/types/api';

export const adminLogin = (payload: { username: string; password: string }) =>
  request<{ token: string; admin: AdminProfileResponse['admin']; menus?: AdminMenuNode[]; permissions?: string[] }>(
    client.post('/login', payload),
  );

export const adminRegister = (payload: { username: string; password: string; nickname?: string }) =>
  request<{ token: string; admin: AdminProfileResponse['admin']; menus?: AdminMenuNode[]; permissions?: string[] }>(
    client.post('/register', payload),
  );

export const fetchAdminProfile = () => request<AdminProfileResponse>(client.get('/profile'));
export const fetchDashboard = () => request<DashboardMetrics>(client.get('/dashboard'));

export const listCategories = () => request<{ items: CategoryRecord[] }>(client.get('/categories'));
export const createCategory = (payload: Partial<CategoryRecord>) => request<CategoryRecord>(client.post('/categories', payload));
export const updateCategory = (id: string, payload: Partial<CategoryRecord>) => request<CategoryRecord>(client.put(`/categories/${id}`, payload));
export const deleteCategory = (id: string) => request<{ ok: boolean }>(client.delete(`/categories/${id}`));

export const listProducts = (params: { page?: number; pageSize?: number; search?: string; categoryId?: string; isActive?: boolean }) =>
  request<Paginated<ProductRecord>>(
    client.get('/products', { params: { ...params, isActive: typeof params.isActive === 'boolean' ? String(params.isActive) : undefined } }),
  );

export const createProduct = (payload: unknown) => request<ProductRecord | null>(client.post('/products', payload));
export const updateProduct = (id: string, payload: unknown) => request<ProductRecord | null>(client.put(`/products/${id}`, payload));
export const toggleProductStatus = (id: string, isActive: boolean) =>
  request<ProductRecord | null>(client.patch(`/products/${id}/status`, { isActive }));

export const listOrders = (params: { page?: number; pageSize?: number; status?: string; search?: string }) =>
  request<Paginated<OrderRecord>>(client.get('/orders', { params }));
export const getOrderDetail = (orderId: string) => request<OrderRecord>(client.get(`/orders/${orderId}`));
export const updateOrderStatusApi = (orderId: string, status: string) =>
  request<OrderRecord>(client.patch(`/orders/${orderId}/status`, { status }));

export const listUsers = (params: { page?: number; pageSize?: number; search?: string }) =>
  request<Paginated<UserRecord>>(client.get('/users', { params }));
export const toggleUserBlock = (uid: string, isBlocked: boolean) => request(client.patch(`/users/${uid}/block`, { isBlocked }));

export const listMenus = () => request<AdminMenuNode[]>(client.get('/menus'));
export const createMenu = (payload: MenuInput) => request(client.post('/menus', payload));
export const updateMenu = (id: string, payload: Partial<MenuInput>) => request(client.put(`/menus/${id}`, payload));
export const deleteMenu = (id: string) => request(client.delete(`/menus/${id}`));

export const listRoles = () => request<AdminRole[]>(client.get('/roles'));
export const createRole = (payload: RoleInput) => request<AdminRole>(client.post('/roles', payload));
export const updateRole = (id: string, payload: Partial<RoleInput>) => request<AdminRole>(client.put(`/roles/${id}`, payload));
export const deleteRole = (id: string) => request(client.delete(`/roles/${id}`));

export const listAdmins = () => request<AdminAccountRecord[]>(client.get('/admins'));
export const createAdmin = (payload: { username: string; password: string; nickname?: string; roleId: string; isActive?: boolean }) =>
  request<AdminAccountRecord | null>(client.post('/admins', payload));
export const updateAdminRole = (adminId: string, roleId: string) =>
  request<AdminAccountRecord | null>(client.patch(`/admins/${adminId}/role`, { roleId }));
export const updateAdminStatus = (adminId: string, isActive: boolean) =>
  request<AdminAccountRecord | null>(client.patch(`/admins/${adminId}/status`, { isActive }));

export const fetchPermissions = () => request<{ groups: Array<{ name: string; label: string; permissions: Array<{ code: string; name: string; description?: string }> }> }>(client.get('/permissions'));
