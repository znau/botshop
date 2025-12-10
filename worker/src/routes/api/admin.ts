import { z } from 'zod';
import { desc, sql } from 'drizzle-orm';

import app from '../hono';
import result from '@/utils/result';
import { ApiCode } from '@/enum/apiCodes';
import jwtUtils from '@/utils/jwt';
import type { AppContext } from '@/types';
import { OrderStatusSchema } from '@/types';
import { AdminAuthService, type AdminUserWithRole } from '@/services/adminAuthService';
import { AdminMenuService, type AdminMenuNode } from '@/services/adminMenuService';
import { AdminRoleService } from '@/services/adminRoleService';
import { CategoryService } from '@/services/categoryService';
import { ProductService, serializeProduct } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import { UserService } from '@/services/userService';
import { requireAdmin, requirePermission } from '../middleware/adminAuth';
import { AdminPermission } from '@/enum/adminPermission';
import { createDb } from '@/db';
import { categories, orders, products, users } from '@/db/schema';

const ADMIN_TOKEN_TTL = 60 * 60 * 8; // 8 hours

const registerSchema = z.object({
	username: z.string().min(3).max(64),
	password: z.string().min(8).max(128),
	nickname: z.string().min(2).max(64).optional(),
});

const loginSchema = z.object({
	username: z.string().min(3).max(64),
	password: z.string().min(6).max(128),
});

const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const categoryInputSchema = z.object({
	name: z.string().min(2).max(64),
	description: z.string().max(500).optional(),
	emoji: z.string().max(4).optional(),
	parentId: z.string().min(1).optional().nullable(),
	sort: z.number().int().optional(),
	isActive: z.boolean().optional(),
});

const productInputSchema = z.object({
	slug: z.string().min(2).max(64),
	categoryId: z.string().min(1),
	title: z.string().min(2).max(140),
	description: z.string().max(4000).optional(),
	mediaUrl: z.string().url().optional(),
	priceMap: z
		.record(z.number().positive())
		.refine((value) => Object.keys(value).length > 0, '至少设置一种币种价格'),
	defaultCurrency: z.string().min(2).max(10),
	stock: z.number().int().nonnegative(),
	deliveryMode: z.enum(['code', 'text', 'manual']),
	deliveryInstructions: z.string().max(1000).optional(),
	sort: z.number().int().optional(),
	isActive: z.boolean().optional(),
});

const menuInputSchema = z.object({
	title: z.string().min(2).max(64),
	path: z.string().min(1),
	menuType: z.enum(['directory', 'menu', 'button', 'iframe', 'link']).optional(),
	icon: z.string().optional(),
	component: z.string().optional(),
	permission: z.string().optional(),
	parentId: z.string().optional().nullable(),
	sort: z.number().int().optional(),
	isVisible: z.boolean().optional(),
});

const roleInputSchema = z.object({
	name: z.string().min(2).max(64),
	description: z.string().max(200).optional(),
	permissions: z.array(z.string().min(2)).default([]),
});

const adminAccountInputSchema = registerSchema.extend({
	roleId: z.string().min(1),
	isActive: z.boolean().optional(),
});

const toggleStatusSchema = z.object({ isActive: z.boolean() });
const blockInputSchema = z.object({ isBlocked: z.boolean() });
const orderStatusInputSchema = z.object({ status: OrderStatusSchema, note: z.string().max(500).optional() });

const productQuerySchema = paginationSchema.extend({
	search: z.string().optional(),
	categoryId: z.string().optional(),
	isActive: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.optional(),
});

const orderQuerySchema = paginationSchema.extend({
	status: OrderStatusSchema.optional(),
	search: z.string().optional(),
});

const userQuerySchema = paginationSchema.extend({ search: z.string().optional() });

app.get('/api/admin/health', (c) =>
	c.json(
		result.ok({
			status: 'ok',
			timestamp: new Date().toISOString(),
		}),
	),
);

app.post('/api/admin/login', async (c) => {
	const body = await c.req.json();
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(result.fail(ApiCode.BAD_REQUEST, '登录信息不合法'), 400);
	}
	const authService = new AdminAuthService(c);
	const record = await authService.login(parsed.data.username, parsed.data.password);
	if (!record) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '账号或密码不正确'), 401);
	}
	const token = await generateAdminToken(c, record);
	return c.json(result.ok({ token, admin: buildAdminResponse(record) }));
});

app.get('/api/admin/profile', requireAdmin, async (c) => {
	const adminState = c.get('adminUser');
	const authService = new AdminAuthService(c);
	const profile = await authService.fetchById(adminState.id);
	if (!profile) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '凭证无效'), 401);
	}
	const menuService = new AdminMenuService(c);
	await menuService.ensureDefaultMenus();
	const menus = await menuService.listMenusForPermissions(adminState.permissions);
	return c.json(
		result.ok({
			admin: buildAdminResponse(profile),
			menus: menus.map(mapMenuNode),
			permissions: adminState.permissions,
		}),
	);
});

// Get all available permissions
app.get('/api/admin/permissions', requireAdmin, async (c: AppContext) => {
	const { PERMISSION_GROUPS } = await import('@/enum/adminPermission');
	return c.json(result.ok({ groups: PERMISSION_GROUPS }));
});

app.get('/api/admin/dashboard', requireAdmin, requirePermission(AdminPermission.DASHBOARD_VIEW), async (c: AppContext) => {
	const metrics = await buildDashboardMetrics(c);
	return c.json(result.ok(metrics));
});

// Category management
app.get(
	'/api/admin/categories',
	requireAdmin,
	requirePermission(AdminPermission.CATEGORIES_READ),
	async (c) => {
		const service = new CategoryService(c);
		const items = await service.listAllCategoriesFlat();
		return c.json(result.ok({ items }));
	},
);

app.post(
	'/api/admin/categories',
	requireAdmin,
	requirePermission(AdminPermission.CATEGORIES_CREATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = categoryInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '分类信息不合法'), 400);
		}
		const service = new CategoryService(c);
		const record = await service.createCategory(parsed.data);
		return c.json(result.ok(record));
	},
);

app.put(
	'/api/admin/categories/:categoryId',
	requireAdmin,
	requirePermission(AdminPermission.CATEGORIES_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = categoryInputSchema.partial().safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '分类信息不合法'), 400);
		}
		const service = new CategoryService(c);
		const record = await service.updateCategory(c.req.param('categoryId'), parsed.data);
		return c.json(result.ok(record));
	},
);

app.delete(
	'/api/admin/categories/:categoryId',
	requireAdmin,
	requirePermission(AdminPermission.CATEGORIES_DELETE),
	async (c) => {
		const service = new CategoryService(c);
		await service.deleteCategory(c.req.param('categoryId'));
		return c.json(result.ok({ ok: true }));
	},
);

// Product management
app.get(
	'/api/admin/products',
	requireAdmin,
	requirePermission(AdminPermission.PRODUCTS_READ),
	async (c) => {
		const parsed = productQuerySchema.safeParse(c.req.query());
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '查询参数不合法'), 400);
		}
		const service = new ProductService(c);
		const listing = await service.listProductsForAdmin(parsed.data);
		return c.json(result.ok(listing));
	},
);

app.post(
	'/api/admin/products',
	requireAdmin,
	requirePermission(AdminPermission.PRODUCTS_CREATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = productInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '商品信息不合法'), 400);
		}
		const service = new ProductService(c);
		const record = await service.createProduct(parsed.data);
		return c.json(result.ok(record ? serializeProduct(record) : null));
	},
);

app.put(
	'/api/admin/products/:productId',
	requireAdmin,
	requirePermission(AdminPermission.PRODUCTS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = productInputSchema.partial().safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '商品信息不合法'), 400);
		}
		const service = new ProductService(c);
		const record = await service.updateProduct(c.req.param('productId'), parsed.data);
		return c.json(result.ok(record ? serializeProduct(record) : null));
	},
);

app.patch(
	'/api/admin/products/:productId/status',
	requireAdmin,
	requirePermission(AdminPermission.PRODUCTS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = toggleStatusSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '状态参数不合法'), 400);
		}
		const service = new ProductService(c);
		const record = await service.toggleProductStatus(c.req.param('productId'), parsed.data.isActive);
		return c.json(result.ok(record ? serializeProduct(record) : null));
	},
);

// Orders
app.get(
	'/api/admin/orders',
	requireAdmin,
	requirePermission(AdminPermission.ORDERS_READ),
	async (c) => {
		const parsed = orderQuerySchema.safeParse(c.req.query());
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '查询参数不合法'), 400);
		}
		const service = new OrderService(c);
		const listing = await service.listOrdersForAdmin(parsed.data);
		return c.json(result.ok(listing));
	},
);

app.get(
	'/api/admin/orders/:orderId',
	requireAdmin,
	requirePermission(AdminPermission.ORDERS_READ),
	async (c) => {
		const service = new OrderService(c);
		const detail = await service.getOrderDetailForAdmin(c.req.param('orderId'));
		if (!detail) {
			return c.json(result.fail(ApiCode.NOT_FOUND, '订单不存在'), 404);
		}
		return c.json(result.ok(detail));
	},
);

app.patch(
	'/api/admin/orders/:orderId/status',
	requireAdmin,
	requirePermission(AdminPermission.ORDERS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = orderStatusInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '订单状态不合法'), 400);
		}
		const service = new OrderService(c);
		const detail = await service.updateOrderStatus(c.req.param('orderId'), parsed.data.status);
		return c.json(result.ok(detail));
	},
);

// Users
app.get(
	'/api/admin/users',
	requireAdmin,
	requirePermission(AdminPermission.USERS_READ),
	async (c) => {
		const parsed = userQuerySchema.safeParse(c.req.query());
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '查询参数不合法'), 400);
		}
		const service = new UserService(c);
		const listing = await service.listUsersForAdmin(parsed.data);
		return c.json(result.ok(listing));
	},
);

app.patch(
	'/api/admin/users/:uid/block',
	requireAdmin,
	requirePermission(AdminPermission.USERS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = blockInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '参数不合法'), 400);
		}
		const service = new UserService(c);
		await service.toggleUserBlock(c.req.param('uid'), parsed.data.isBlocked);
		return c.json(result.ok({ ok: true }));
	},
);

// Menus
app.get(
	'/api/admin/menus',
	requireAdmin,
	requirePermission(AdminPermission.MENUS_READ),
	async (c) => {
		const service = new AdminMenuService(c);
		await service.ensureDefaultMenus();
		const menus = await service.listMenuTree();
		return c.json(result.ok(menus.map(mapMenuNode)));
	},
);

app.post(
	'/api/admin/menus',
	requireAdmin,
	requirePermission(AdminPermission.MENUS_CREATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = menuInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '菜单信息不合法'), 400);
		}
		const service = new AdminMenuService(c);
		const menu = await service.createMenu(parsed.data);
		return c.json(result.ok(menu));
	},
);

app.put(
	'/api/admin/menus/:menuId',
	requireAdmin,
	requirePermission(AdminPermission.MENUS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = menuInputSchema.partial().safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '菜单信息不合法'), 400);
		}
		const service = new AdminMenuService(c);
		const menu = await service.updateMenu(c.req.param('menuId'), parsed.data);
		return c.json(result.ok(menu));
	},
);

app.delete(
	'/api/admin/menus/:menuId',
	requireAdmin,
	requirePermission(AdminPermission.MENUS_DELETE),
	async (c) => {
		const service = new AdminMenuService(c);
		await service.deleteMenu(c.req.param('menuId'));
		return c.json(result.ok({ ok: true }));
	},
);

// Roles
app.get(
	'/api/admin/roles',
	requireAdmin,
	requirePermission(AdminPermission.ROLES_READ),
	async (c) => {
		const service = new AdminRoleService(c);
		const roles = await service.listRoles();
		return c.json(result.ok(roles));
	},
);

app.post(
	'/api/admin/roles',
	requireAdmin,
	requirePermission(AdminPermission.ROLES_CREATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = roleInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '角色信息不合法'), 400);
		}
		const service = new AdminRoleService(c);
		const role = await service.createRole(parsed.data);
		return c.json(result.ok(role));
	},
);

app.put(
	'/api/admin/roles/:roleId',
	requireAdmin,
	requirePermission(AdminPermission.ROLES_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = roleInputSchema.partial().safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '角色信息不合法'), 400);
		}
		const service = new AdminRoleService(c);
		const role = await service.updateRole(c.req.param('roleId'), parsed.data);
		return c.json(result.ok(role));
	},
);

app.delete(
	'/api/admin/roles/:roleId',
	requireAdmin,
	requirePermission(AdminPermission.ROLES_DELETE),
	async (c) => {
		const service = new AdminRoleService(c);
		await service.deleteRole(c.req.param('roleId'));
		return c.json(result.ok({ ok: true }));
	},
);

// Admin accounts
app.get(
	'/api/admin/admins',
	requireAdmin,
	requirePermission(AdminPermission.ADMINS_READ),
	async (c) => {
		const service = new AdminAuthService(c);
		const admins = await service.listAdmins();
		return c.json(result.ok(admins.map(buildAdminResponse)));
	},
);

app.post(
	'/api/admin/admins',
	requireAdmin,
	requirePermission(AdminPermission.ADMINS_CREATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = adminAccountInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '管理员信息不合法'), 400);
		}
		const service = new AdminAuthService(c);
		const record = await service.createAdminAccount(parsed.data);
		return c.json(result.ok(record ? buildAdminResponse(record) : null));
	},
);

app.patch(
	'/api/admin/admins/:adminId/role',
	requireAdmin,
	requirePermission(AdminPermission.ADMINS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = z.object({ roleId: z.string().min(1) }).safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '角色参数不合法'), 400);
		}
		const service = new AdminAuthService(c);
		const record = await service.updateAdminRole(c.req.param('adminId'), parsed.data.roleId);
		return c.json(result.ok(record ? buildAdminResponse(record) : null));
	},
);

app.patch(
	'/api/admin/admins/:adminId/status',
	requireAdmin,
	requirePermission(AdminPermission.ADMINS_UPDATE),
	async (c) => {
		const body = await c.req.json();
		const parsed = toggleStatusSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(result.fail(ApiCode.BAD_REQUEST, '状态参数不合法'), 400);
		}
		const service = new AdminAuthService(c);
		const record = await service.toggleAdminStatus(c.req.param('adminId'), parsed.data.isActive);
		return c.json(result.ok(record ? buildAdminResponse(record) : null));
	},
);

function buildAdminResponse(record: AdminUserWithRole) {
	return {
		id: record.user.id,
		username: record.user.username,
		nickname: record.user.nickname,
		avatar: record.user.avatar,
		role: {
			id: record.role.id,
			name: record.role.name,
			permissions: record.role.permissionsList,
		},
		isActive: record.user.isActive === 1,
		lastLoginAt: record.user.lastLoginAt,
		createdAt: record.user.createdAt,
	};
}

function mapMenuNode(node: AdminMenuNode) {
	return {
		id: node.id,
		title: node.title,
		path: node.path,
		menuType: node.menuType,
		icon: node.icon,
		component: node.component,
		permission: node.permission,
		sort: node.sort,
		isVisible: node.isVisible !== 0,
		children: node.children.map(mapMenuNode),
	};
}

async function generateAdminToken(c: AppContext, record: AdminUserWithRole) {
	return jwtUtils.generateToken(
		c,
		{
			sub: record.user.id,
			username: record.user.username,
			roleId: record.role.id,
			permissions: record.role.permissionsList,
		},
		{ scene: 'admin', ttl: ADMIN_TOKEN_TTL },
	);
}

async function buildDashboardMetrics(c: AppContext) {
	const db = createDb(c.env);
	const [[categoryCount], [productCount], [orderCount], [userCount], [revenueRow], latestOrders, latestUsers] = await Promise.all([
		db.select({ value: sql<number>`count(*)` }).from(categories),
		db.select({ value: sql<number>`count(*)` }).from(products),
		db.select({ value: sql<number>`count(*)` }).from(orders),
		db.select({ value: sql<number>`count(*)` }).from(users),
		db.select({ value: sql<number>`ifnull(sum(total_amount), 0)` }).from(orders),
		db
			.select({ orderSn: orders.orderSn, status: orders.status, totalAmount: orders.totalAmount, createdAt: orders.createdAt })
			.from(orders)
			.orderBy(desc(orders.createdAt))
			.limit(5),
		db
			.select({ id: users.id, nickname: users.nickname, createdAt: users.createdAt })
			.from(users)
			.orderBy(desc(users.createdAt))
			.limit(5),
	]);
	return {
		stats: {
			categories: categoryCount?.value ?? 0,
			products: productCount?.value ?? 0,
			orders: orderCount?.value ?? 0,
			users: userCount?.value ?? 0,
			revenue: revenueRow?.value ?? 0,
		},
		latestOrders,
		latestUsers,
	};
}


