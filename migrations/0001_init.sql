-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    price_map TEXT NOT NULL,
    default_currency TEXT NOT NULL,
    accepted_currencies TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    delivery_mode TEXT NOT NULL,
    delivery_instructions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Inventory codes for automatic delivery
CREATE TABLE IF NOT EXISTS inventory_codes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available','used')),
    order_id TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(product_id, code),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_status ON inventory_codes(product_id, status);

-- Telegram users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id INTEGER NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_interaction_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_last_interaction ON users(last_interaction_at DESC);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL,
    user_id TEXT NOT NULL,
    telegram_chat_id INTEGER NOT NULL,
    telegram_user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_invoice_id TEXT NOT NULL,
    payment_json TEXT NOT NULL,
    delivery_code TEXT,
    delivery_note TEXT,
    delivered_at TEXT,
    tx_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_invoice ON orders(payment_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
