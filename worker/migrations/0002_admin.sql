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

INSERT INTO admin_roles (id, name, description, permissions, is_system, created_at, updated_at)
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

insert into admin_users (id, username, password, salt, nickname, avatar, role_id, is_active, created_at, updated_at)
values ('3e57a5b0-90bd-4559-9ce4-873fe29dbee0', 'admin', 'ce46522b34d274d36277b4bbe6ac0f26945e35dff7ccbfc183a9dc0cf06a1d04', 'd489ae21a53adda470e73e263fe3da1e', '超级管理员', '', 'ec5e666d-0db1-4144-9535-d96a1d154874', 1, datetime('now'), datetime('now'));
-- password is 'A@c123'


CREATE TABLE IF NOT EXISTS admin_menus (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES admin_menus(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    icon TEXT,
    component TEXT,
    permission TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_menus_parent ON admin_menus(parent_id);
