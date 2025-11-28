import { sqliteTableCreator, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const createTable = sqliteTableCreator((name) => name);

export const categories = createTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  emoji: text('emoji'),
  parentId: text('parent_id').references(() => categories.id, { onDelete: 'set null' }),
  sort: integer('sort').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  sortIdx: index('idx_categories_sort').on(table.sort),
  parentIdx: index('idx_categories_parent').on(table.parentId),
});

export const products = createTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  mediaUrl: text('media_url'),
  price: text('price').notNull(),
  defaultCurrency: text('default_currency').notNull(),
  stock: integer('stock').notNull().default(0),
  deliveryMode: text('delivery_mode').notNull(),
  deliveryInstructions: text('delivery_instructions'),
  sort: integer('sort').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('idx_products_slug').on(table.slug),
  categoryIdx: index('idx_products_category').on(table.categoryId),
  activeIdx: index('idx_products_active').on(table.isActive, table.sort),
});

export const users = createTable('users', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar').notNull(),
  isBlocked: integer('is_blocked').notNull().default(0),
  lastInteractionAt: text('last_interaction_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
});

export const userRegisters = createTable('user_registers', {
  uid: text('uid').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  thirdId: integer('third_id').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  registerIp: text('register_ip').notNull(),
  language: text('language').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  thirdIdIdx: index('idx_registers_third_id').on(table.thirdId),
});

export const orders = createTable('orders', {
  id: text('id').primaryKey(),
  orderSn: text('order_sn').notNull(),
  uid: text('uid').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  unitAmount: real('unit_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  paymentInvoiceId: text('payment_invoice_id').notNull(),
  paymentJson: text('payment_json').notNull(),
  cryptoReceiveAddress: text('crypto_receive_address'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orderSnIdx: uniqueIndex('idx_orders_order_sn').on(table.orderSn),
  paymentIdx: uniqueIndex('idx_orders_payment_invoice').on(table.paymentInvoiceId),
  userIdx: index('idx_orders_user').on(table.uid),
  statusIdx: index('idx_orders_status').on(table.status),
}));
