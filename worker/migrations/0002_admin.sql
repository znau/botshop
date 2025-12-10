-- Admin platform tables
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_roles (id, name, description, permissions, is_system, created_at, updated_at)
VALUES ('ec5e666d-0db1-4144-9535-d96a1d154874', '超级管理员', '拥有所有权限的管理员角色', '["*"]', 1, datetime('now'), datetime('now'));

CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_users (id, username, password, salt, nickname, avatar, role_id, is_active, created_at, updated_at)
VALUES ('3e57a5b0-90bd-4559-9ce4-873fe29dbee0', 'admin', 'ce46522b34d274d36277b4bbe6ac0f26945e35dff7ccbfc183a9dc0cf06a1d04', 'd489ae21a53adda470e73e263fe3da1e', '超级管理员', '', 'ec5e666d-0db1-4144-9535-d96a1d154874', 1, datetime('now'), datetime('now'));
-- password is 'A@c123'


CREATE TABLE IF NOT EXISTS admin_menus (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES admin_menus(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    menu_type TEXT NOT NULL DEFAULT 'menu',
    icon TEXT,
    component TEXT,
    permission TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- menu_type: 'directory' (目录), 'menu' (菜单), 'button' (按钮), 'iframe' (内嵌), 'link' (外链)

CREATE INDEX IF NOT EXISTS idx_admin_menus_parent ON admin_menus(parent_id);

-- 初始化菜单数据
INSERT OR IGNORE INTO admin_menus (id, parent_id, title, path, menu_type, icon, component, permission, sort, is_visible, created_at, updated_at) VALUES
-- ========== 一级菜单 ==========
('menu-dashboard', NULL, '工作台', '/dashboard', 'menu', 'carbon:dashboard', 'DashboardView', 'dashboard:view', 10, 1, datetime('now'), datetime('now')),
('menu-catalog', NULL, '商品中心', '/catalog', 'directory', 'carbon:catalog', NULL, NULL, 20, 1, datetime('now'), datetime('now')),
('menu-orders', NULL, '订单管理', '/orders', 'menu', 'carbon:order-details', 'OrdersView', 'orders:read', 30, 1, datetime('now'), datetime('now')),
('menu-users', NULL, '用户管理', '/users', 'menu', 'carbon:user-multiple', 'UsersView', 'users:read', 40, 1, datetime('now'), datetime('now')),
('menu-system', NULL, '系统管理', '/system', 'directory', 'carbon:settings', NULL, NULL, 50, 1, datetime('now'), datetime('now')),

-- ========== 商品中心子菜单 ==========
('menu-catalog-categories', 'menu-catalog', '分类管理', '/catalog/categories', 'menu', 'carbon:folder', 'CategoriesView', 'categories:read', 21, 1, datetime('now'), datetime('now')),
('menu-catalog-products', 'menu-catalog', '商品管理', '/catalog/products', 'menu', 'carbon:package', 'ProductsView', 'products:read', 22, 1, datetime('now'), datetime('now')),

-- ========== 系统管理子菜单 ==========
('menu-system-menus', 'menu-system', '菜单管理', '/system/menus', 'menu', 'carbon:menu', 'MenusView', 'menus:read', 51, 1, datetime('now'), datetime('now')),
('menu-system-roles', 'menu-system', '角色管理', '/system/roles', 'menu', 'carbon:user-role', 'RolesView', 'roles:read', 52, 1, datetime('now'), datetime('now')),
('menu-system-admins', 'menu-system', '管理员管理', '/system/admins', 'menu', 'carbon:user-admin', 'AdminAccountsView', 'admins:read', 53, 1, datetime('now'), datetime('now')),

-- ========== 订单管理按钮权限 ==========
('btn-orders-view', 'menu-orders', '查看订单详情', '/orders/:id', 'button', NULL, NULL, 'orders:view', 31, 0, datetime('now'), datetime('now')),
('btn-orders-update', 'menu-orders', '处理订单', '/orders/update', 'button', NULL, NULL, 'orders:update', 32, 0, datetime('now'), datetime('now')),
('btn-orders-delete', 'menu-orders', '删除订单', '/orders/delete', 'button', NULL, NULL, 'orders:delete', 33, 0, datetime('now'), datetime('now')),
('btn-orders-export', 'menu-orders', '导出订单', '/orders/export', 'button', NULL, NULL, 'orders:export', 34, 0, datetime('now'), datetime('now')),

-- ========== 用户管理按钮权限 ==========
('btn-users-view', 'menu-users', '查看用户详情', '/users/:id', 'button', NULL, NULL, 'users:view', 41, 0, datetime('now'), datetime('now')),
('btn-users-update', 'menu-users', '管理用户', '/users/update', 'button', NULL, NULL, 'users:update', 42, 0, datetime('now'), datetime('now')),
('btn-users-delete', 'menu-users', '删除用户', '/users/delete', 'button', NULL, NULL, 'users:delete', 43, 0, datetime('now'), datetime('now')),
('btn-users-export', 'menu-users', '导出用户', '/users/export', 'button', NULL, NULL, 'users:export', 44, 0, datetime('now'), datetime('now')),

-- ========== 分类管理按钮权限 ==========
('btn-categories-create', 'menu-catalog-categories', '创建分类', '/catalog/categories/create', 'button', NULL, NULL, 'categories:create', 211, 0, datetime('now'), datetime('now')),
('btn-categories-update', 'menu-catalog-categories', '编辑分类', '/catalog/categories/update', 'button', NULL, NULL, 'categories:update', 212, 0, datetime('now'), datetime('now')),
('btn-categories-delete', 'menu-catalog-categories', '删除分类', '/catalog/categories/delete', 'button', NULL, NULL, 'categories:delete', 213, 0, datetime('now'), datetime('now')),

-- ========== 商品管理按钮权限 ==========
('btn-products-create', 'menu-catalog-products', '创建商品', '/catalog/products/create', 'button', NULL, NULL, 'products:create', 221, 0, datetime('now'), datetime('now')),
('btn-products-update', 'menu-catalog-products', '编辑商品', '/catalog/products/update', 'button', NULL, NULL, 'products:update', 222, 0, datetime('now'), datetime('now')),
('btn-products-delete', 'menu-catalog-products', '删除商品', '/catalog/products/delete', 'button', NULL, NULL, 'products:delete', 223, 0, datetime('now'), datetime('now')),
('btn-products-export', 'menu-catalog-products', '导出商品', '/catalog/products/export', 'button', NULL, NULL, 'products:export', 224, 0, datetime('now'), datetime('now')),
('btn-products-import', 'menu-catalog-products', '导入商品', '/catalog/products/import', 'button', NULL, NULL, 'products:import', 225, 0, datetime('now'), datetime('now')),

-- ========== 菜单管理按钮权限 ==========
('btn-menus-create', 'menu-system-menus', '创建菜单', '/system/menus/create', 'button', NULL, NULL, 'menus:create', 511, 0, datetime('now'), datetime('now')),
('btn-menus-update', 'menu-system-menus', '编辑菜单', '/system/menus/update', 'button', NULL, NULL, 'menus:update', 512, 0, datetime('now'), datetime('now')),
('btn-menus-delete', 'menu-system-menus', '删除菜单', '/system/menus/delete', 'button', NULL, NULL, 'menus:delete', 513, 0, datetime('now'), datetime('now')),

-- ========== 角色管理按钮权限 ==========
('btn-roles-create', 'menu-system-roles', '创建角色', '/system/roles/create', 'button', NULL, NULL, 'roles:create', 521, 0, datetime('now'), datetime('now')),
('btn-roles-update', 'menu-system-roles', '编辑角色', '/system/roles/update', 'button', NULL, NULL, 'roles:update', 522, 0, datetime('now'), datetime('now')),
('btn-roles-delete', 'menu-system-roles', '删除角色', '/system/roles/delete', 'button', NULL, NULL, 'roles:delete', 523, 0, datetime('now'), datetime('now')),

-- ========== 管理员管理按钮权限 ==========
('btn-admins-create', 'menu-system-admins', '创建管理员', '/system/admins/create', 'button', NULL, NULL, 'admins:create', 531, 0, datetime('now'), datetime('now')),
('btn-admins-update', 'menu-system-admins', '编辑管理员', '/system/admins/update', 'button', NULL, NULL, 'admins:update', 532, 0, datetime('now'), datetime('now')),
('btn-admins-delete', 'menu-system-admins', '删除管理员', '/system/admins/delete', 'button', NULL, NULL, 'admins:delete', 533, 0, datetime('now'), datetime('now'));
