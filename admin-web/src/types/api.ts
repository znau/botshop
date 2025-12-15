export type ApiResult<T> = {
	code: number;
	message: string;
	data: T;
};

export type AdminUser = {
	id: string;
	username: string;
	nickname?: string | null;
	avatar?: string | null;
	role: {
		id: string;
		name: string;
		permissions: string[];
	};
	isActive: boolean;
	lastLoginAt?: string | null;
	createdAt?: string;
};

export type AdminMenu = {
	id: string;
	title: string;
	path: string;
	menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link';
	icon?: string | null;
	component?: string | null;
	permission?: string | null;
	sort?: number | null;
	isVisible?: boolean;
	children: AdminMenu[];
};

export type AdminProfileResponse = {
	admin: AdminUser;
	menus: AdminMenu[];
	permissions: string[];
};

export type DashboardStats = {
	stats: {
		categories: number;
		products: number;
		orders: number;
		users: number;
		revenue: number;
	};
	latestOrders: Array<{ orderSn: string; status: string; totalAmount: number; createdAt: string }>;
	latestUsers: Array<{ id: string; nickname?: string | null; createdAt: string }>;
};

export type CategoryItem = {
	id: string;
	name: string;
	description?: string | null;
	emoji?: string | null;
	parentId?: string | null;
	sort?: number | null;
	isActive?: boolean;
	createdAt?: string;
};

export type ProductItem = {
	id: string;
	slug: string;
	title: string;
	description?: string | null;
	mediaUrl?: string | null;
	priceMap: Record<string, number>;
	defaultCurrency: string;
	stock: number;
	deliveryMode: 'code' | 'text' | 'manual';
	deliveryInstructions?: string | null;
	categoryId: string;
	sort?: number | null;
	isActive?: boolean;
	updatedAt?: string;
};

export type OrderItem = {
	id: string;
	orderSn: string;
	status: string;
	totalAmount: number;
	currency: string;
	createdAt: string;
	productTitle?: string;
	uid?: string;
};

export type UserItem = {
	id: string;
	nickname?: string | null;
	username?: string | null;
	isBlocked: boolean;
	createdAt?: string;
	telegramId?: number;
};

export type MenuInput = {
	title: string;
	path: string;
	menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link';
	icon?: string | null;
	component?: string | null;
	permission?: string | null;
	parentId?: string | null;
	sort?: number | null;
	isVisible?: boolean;
};

export type RoleItem = {
	id: string;
	name: string;
	description?: string | null;
	permissions: string[];
};

export type AdminAccount = {
	id: string;
	username: string;
	nickname?: string | null;
	avatar?: string | null;
	role: RoleItem;
	isActive: boolean;
	lastLoginAt?: string | null;
	createdAt?: string;
};

export type PaginationResponse<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
};
