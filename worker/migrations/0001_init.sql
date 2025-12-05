-- Categories 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    parent_id TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Products 商品表
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    price TEXT NOT NULL,
    default_currency TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    delivery_mode TEXT NOT NULL,
    delivery_instructions TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort);
 
 -- users 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    avatar TEXT NOT NULL,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- user_register 用户注册信息表
CREATE TABLE IF NOT EXISTS user_registers (
    uid TEXT PRIMARY KEY, -- 对应 users.id
    source TEXT NOT NULL, -- 来源渠道 (e.g., telegram, account)
    third_id INTEGER NOT NULL, -- 第三方平台用户ID (e.g., Telegram user ID)
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL DEFAULT '',
    register_ip TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registers_third_id ON user_registers(third_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_username ON user_registers(username);

-- orders 订单表
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_sn TEXT NOT NULL,
    uid TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_invoice_id TEXT NOT NULL,
    payment_json TEXT NOT NULL,
    crypto_receive_address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_sn ON orders(order_sn);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_invoice ON orders(payment_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(uid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
