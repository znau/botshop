import http from './client';
import type {
	AdminAccount,
	AdminMenu,
	AdminProfileResponse,
	AdminUser,
	CategoryItem,
	DashboardStats,
	MenuInput,
	OrderItem,
	PaginationResponse,
	ProductItem,
	RoleItem,
	UserItem,
} from '@/types/api';

export const adminApi = {
	login(payload: { username: string; password: string }) {
		return http.post<{ token: string; admin: AdminUser }>('login', payload);
	},
	profile() {
		return http.get<AdminProfileResponse>('profile');
	},
	dashboard() {
		return http.get<DashboardStats>('dashboard');
	},
	permissions() {
		return http.get<{ groups: Array<{ key: string; label: string; permissions: { code: string; label: string }[] }> }>(
			'permissions',
		);
	},
	// Categories
	listCategories() {
		return http.get<{ items: CategoryItem[] }>('categories');
	},
	createCategory(payload: Partial<CategoryItem>) {
		return http.post<CategoryItem>('categories', payload);
	},
	updateCategory(categoryId: string, payload: Partial<CategoryItem>) {
		return http.put<CategoryItem>(`categories/${categoryId}`, payload);
	},
	deleteCategory(categoryId: string) {
		return http.delete<{ ok: boolean }>(`categories/${categoryId}`);
	},
	// Products
	listProducts(params: { page?: number; pageSize?: number; search?: string; categoryId?: string; isActive?: boolean }) {
		const query: Record<string, unknown> = { ...params };
		if (typeof params.isActive === 'boolean') {
			query.isActive = String(params.isActive);
		}
		return http.get<PaginationResponse<ProductItem>>('products', { params: query });
	},
	createProduct(payload: Partial<ProductItem>) {
		return http.post<ProductItem>('products', payload);
	},
	updateProduct(productId: string, payload: Partial<ProductItem>) {
		return http.put<ProductItem>(`products/${productId}`, payload);
	},
	toggleProductStatus(productId: string, isActive: boolean) {
		return http.patch<ProductItem>(`products/${productId}/status`, { isActive });
	},
	// Orders
	listOrders(params: { page?: number; pageSize?: number; status?: string; search?: string }) {
		return http.get<PaginationResponse<OrderItem>>('orders', { params });
	},
	getOrderDetail(orderId: string) {
		return http.get<OrderItem>(`orders/${orderId}`);
	},
	updateOrderStatus(orderId: string, status: string, note?: string) {
		return http.patch<OrderItem>(`orders/${orderId}/status`, { status, note });
	},
	// Users
	listUsers(params: { page?: number; pageSize?: number; search?: string }) {
		return http.get<PaginationResponse<UserItem>>('users', { params });
	},
	toggleUserBlock(uid: string, isBlocked: boolean) {
		return http.patch<{ ok: boolean }>(`users/${uid}/block`, { isBlocked });
	},
	// Menus
	listMenus() {
		return http.get<AdminMenu[]>('menus');
	},
	createMenu(payload: MenuInput) {
		return http.post<AdminMenu>('menus', payload);
	},
	updateMenu(menuId: string, payload: Partial<MenuInput>) {
		return http.put<AdminMenu>(`menus/${menuId}`, payload);
	},
	deleteMenu(menuId: string) {
		return http.delete<{ ok: boolean }>(`menus/${menuId}`);
	},
	// Roles
	listRoles() {
		return http.get<RoleItem[]>('roles');
	},
	createRole(payload: Partial<RoleItem>) {
		return http.post<RoleItem>('roles', payload);
	},
	updateRole(roleId: string, payload: Partial<RoleItem>) {
		return http.put<RoleItem>(`roles/${roleId}`, payload);
	},
	deleteRole(roleId: string) {
		return http.delete<{ ok: boolean }>(`roles/${roleId}`);
	},
	// Admin accounts
	listAdmins() {
		return http.get<AdminAccount[]>('admins');
	},
	createAdmin(payload: { username: string; password: string; nickname?: string; roleId: string; isActive?: boolean }) {
		return http.post<AdminAccount>('admins', payload);
	},
	updateAdminRole(adminId: string, roleId: string) {
		return http.patch<AdminAccount>(`admins/${adminId}/role`, { roleId });
	},
	toggleAdminStatus(adminId: string, isActive: boolean) {
		return http.patch<AdminAccount>(`admins/${adminId}/status`, { isActive });
	},
};
