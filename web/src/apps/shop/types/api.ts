export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type Product = {
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
};

export type CategoryNode = {
  id: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  parentId?: string | null;
  sort: number;
  products: Product[];
  children: CategoryNode[];
};

export type CatalogResponse = {
  generatedAt: string;
  categories: CategoryNode[];
};

export type ProductDetailResponse = {
  product: Product & {
    category: { id: string; name: string; emoji?: string | null };
    attachment?: string | null;
  };
  related: Product[];
};

export type UserProfile = {
  id: string;
  nickname: string;
  username: string;
  avatar: string;
  language?: string;
};

export type OrdersResponseItem = {
  id: string;
  orderSn: string;
  productTitle: string;
  currency: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type ProfileResponse = {
  user: UserProfile;
  orders: OrdersResponseItem[];
};

export type CheckoutResponse = {
  orderSn: string;
  product: Product;
  currency: string;
  amount: number;
  code?: string | null;
  instructions?: string | null;
  attachment?: string | null;
};

export type LoginPayload = { username: string; password: string };
export type CheckoutPayload = { productId: string; quantity?: number; currency?: string };
export type RegisterPayload = {
  username: string;
  password: string;
  nickname?: string;
  language?: string;
};
