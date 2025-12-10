export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type AdminRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  isSystem?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUser = {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type AdminMenuNode = {
  id: string;
  title: string;
  path: string;
  menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link';
  icon?: string | null;
  component?: string | null;
  permission?: string | null;
  sort: number;
  isVisible: boolean;
  children: AdminMenuNode[];
};

export type AdminProfileResponse = {
  admin: AdminUser;
  menus: AdminMenuNode[];
  permissions: string[];
};

export type DashboardMetrics = {
  stats: {
    categories: number;
    products: number;
    orders: number;
    users: number;
    revenue: number;
  };
  latestOrders: Array<{ orderSn: string; status: string; totalAmount: number; createdAt: string }>;
  latestUsers: Array<{ id: string; nickname: string; createdAt: string }>;
};

export type CategoryRecord = {
  id: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  parentId?: string | null;
  sort: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecord = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  priceMap: Record<string, number>;
  priceLabel: string;
  defaultCurrency: string;
  stock: number;
  deliveryMode: string;
  deliveryInstructions?: string | null;
  sort: number;
  updatedAt: string;
  isActive: boolean;
  category: { id: string; name: string } | null;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

export type OrderRecord = {
  id: string;
  orderSn: string;
  status: string;
  currency: string;
  totalAmount: number;
  unitAmount: number;
  quantity: number;
  productId: string;
  productTitle?: string;
  userId: string;
  userNickname?: string;
  createdAt: string;
  updatedAt: string;
  payment?: Record<string, unknown> | null;
};

export type UserRecord = {
  id: string;
  nickname: string;
  username?: string | null;
  language?: string | null;
  isBlocked: boolean;
  createdAt: string;
  lastInteractionAt: string;
};

export type MenuInput = {
  title: string;
  path: string;
  menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link';
  icon?: string;
  component?: string;
  permission?: string;
  parentId?: string | null;
  sort?: number;
  isVisible?: boolean;
};

export type RoleInput = {
  name: string;
  description?: string;
  permissions: string[];
};

export type AdminAccountRecord = AdminUser;
