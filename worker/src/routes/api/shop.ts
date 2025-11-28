import { z } from 'zod';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, ne, or } from 'drizzle-orm';

import app from '../hono';
import result from '../../utils/result';
import { createDb } from '../../db';
import { CategoryService, type CategoryRecord } from '../../services/categoryService';
import { ProductService, type ProductRecord } from '../../services/productService';
import { OrderService } from '../../services/orderService';
import type { AppContext } from '../../types';
import { ShopAuthService } from '../../services/shopAuthService';
import type { LanguageCode } from '../../services/userService';
import jwtUtils from '../../utils/jwt';
import BizError from '../../utils/bizError';
import { categories, products } from '../../db/schema';
import { requireAuth } from '../middleware/userAuth';

const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

const loginSchema = z.object({
	username: z.string().toLowerCase().trim().min(3).max(64),
	password: z.string().min(6).max(128),
});

const telegramLoginSchema = z.object({
	initData: z.string().min(10),
});

const registerSchema = z.object({
	username: z.string().toLowerCase().trim().min(3).max(64),
	password: z.string().min(8).max(128),
	nickname: z.string().trim().min(2).max(64).optional(),
	language: z.string().trim().min(2).max(8).optional(),
});

const orderInputSchema = z.object({
	productId: z.string().min(1),
	quantity: z.number().int().min(1).max(1).default(1),
	currency: z.string().min(2).max(10).optional(),
});

type SerializedProduct = ReturnType<typeof serializeProduct>;

type CatalogNode = {
	id: string;
	name: string;
	description?: string | null;
	emoji?: string | null;
	parentId?: string | null;
	sort: number;
	products: SerializedProduct[];
	children: CatalogNode[];
};

type ShopProfile = NonNullable<Awaited<ReturnType<ShopAuthService['verifyPasswordLogin']>>>;

app.use('/api/shop/profile', requireAuth);
app.use('/api/shop/orders', requireAuth);

app.get('/api/shop/health', (c: AppContext) =>
	c.json(
		result.ok({
			status: 'ok',
			timestamp: new Date().toISOString(),
		}),
	),
);

app.post('/api/shop/login', async (c: AppContext) => {
	const body = await c.req.json();
	const input = loginSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail('账号或密码不正确', 400), 400);
	}
	const db = createDb(c.env);
	const authService = new ShopAuthService(c.env, db);
	const profile = await authService.verifyPasswordLogin(input.data.username, input.data.password);
	if (!profile) {
		return c.json(result.fail('账号或密码不正确', 401), 401);
	}
	const token = await jwtUtils.generateToken(
		c,
		{ uid: profile.register.uid, username: profile.register.username },
		TOKEN_TTL,
	);
	return c.json(
		result.ok({
			token,
			expiresIn: TOKEN_TTL,
			user: serializeProfile(profile),
		}),
	);
});


app.post('/api/shop/register', async (c: AppContext) => {
	const body = await c.req.json();
	const input = registerSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail('注册信息不合法', 400), 400);
	}
	const db = createDb(c.env);
	const authService = new ShopAuthService(c.env, db);
	const registerIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'web';
	try {
		const profile = await authService.registerAccount({
			username: input.data.username,
			password: input.data.password,
			nickname: input.data.nickname,
			language: input.data.language as LanguageCode | undefined,
			registerIp,
		});
		const token = await jwtUtils.generateToken(
			c,
			{ uid: profile.register.uid, username: profile.register.username },
			TOKEN_TTL,
		);
		return c.json(
			result.ok({
				token,
				expiresIn: TOKEN_TTL,
				user: serializeProfile(profile),
			}),
			201,
		);
	} catch (error) {
		if (error instanceof BizError) {
			throw error;
		}
		console.error('account registration failed', error);
		return c.json(result.fail('注册失败，请稍后再试', 500), 500);
	}
});



app.get('/api/shop/catalog', async (c: AppContext) => {
	const db = createDb(c.env);
	const categoryService = new CategoryService(c.env, db);
	const productService = new ProductService(c.env, db);
	const [categoriesList, productRows] = await Promise.all([
		categoryService.getActiveCategories(),
		db
			.select()
			.from(products)
			.where(eq(products.isActive, 1))
			.orderBy(asc(products.sort), desc(products.createdAt)),
	]);
	const catalog = buildCatalogTree(categoriesList, productRows, productService);
	return c.json(
		result.ok({
			generatedAt: new Date().toISOString(),
			categories: catalog,
		}),
	);
});

app.get('/api/shop/products/:productId', async (c: AppContext) => {
	const identifier = c.req.param('productId');
	const db = createDb(c.env);
	const productService = new ProductService(c.env, db);
	const [detail] = await db
		.select({ product: products, category: categories })
		.from(products)
		.innerJoin(categories, eq(products.categoryId, categories.id))
		.where(
			and(
				eq(products.isActive, 1),
				or(eq(products.id, identifier), eq(products.slug, identifier)),
			),
		)
		.limit(1);
	if (!detail) {
		return c.json(result.fail('商品不存在或已下架', 404), 404);
	}
	const attachment = await productService.loadProductAttachment(detail.product.id);
	const related = await db
		.select()
		.from(products)
		.where(
			and(
				eq(products.categoryId, detail.product.categoryId),
				eq(products.isActive, 1),
				ne(products.id, detail.product.id),
			),
		)
		.orderBy(desc(products.createdAt))
		.limit(4);
	return c.json(
		result.ok({
			product: {
				...serializeProduct(detail.product, productService),
				category: {
					id: detail.category.id,
					name: detail.category.name,
					emoji: detail.category.emoji,
				},
				attachment,
			},
			related: related.map((item) => serializeProduct(item, productService)),
		}),
	);
});



app.post('/api/shop/login/telegram', async (c: AppContext) => {
	const body = await c.req.json();
	const input = telegramLoginSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail('缺少 Telegram 登录数据', 400), 400);
	}
	const db = createDb(c.env);
	const authService = new ShopAuthService(c.env, db);
	try {
		const profile = await authService.loginWithTelegram(input.data.initData);
		const token = await jwtUtils.generateToken(
			c,
			{ uid: profile.register.uid, username: profile.register.username },
			TOKEN_TTL,
		);
		return c.json(
			result.ok({
				token,
				expiresIn: TOKEN_TTL,
				user: serializeProfile(profile),
			}),
		);
	} catch (error) {
		if (error instanceof BizError) {
			throw error;
		}
		console.error('Telegram login failed', error);
		return c.json(result.fail('Telegram 登录失败', 401), 401);
	}
});

app.post('/api/shop/logout', async (c: AppContext) => c.json(result.ok({ ok: true })));


app.get('/api/shop/profile', async (c: AppContext) => {
	const session = c.get('authUser');
	if (!session) {
		return c.json(result.fail('未登录或凭证无效', 401), 401);
	}
	const db = createDb(c.env);
	const authService = new ShopAuthService(c.env, db);
	const profile = await authService.fetchProfileByUid(session.uid);
	if (!profile) {
		return c.json(result.fail('用户不存在', 404), 404);
	}
	const orderService = new OrderService(db);
	const orders = await orderService.listLatestOrdersByUid(profile.register.uid, 5);
	return c.json(
		result.ok({
			user: serializeProfile(profile),
			orders: orders.map(serializeOrderRow),
		}),
	);
});


app.get('/api/shop/orders', async (c: AppContext) => {
	const session = c.get('authUser');
	if (!session) {
		return c.json(result.fail('未登录或凭证无效', 401), 401);
	}
	const db = createDb(c.env);
	const orderService = new OrderService(db);
	const rows = await orderService.listLatestOrdersByUid(session.uid, 20);
	return c.json(result.ok({ orders: rows.map(serializeOrderRow) }));
});


app.post('/api/shop/orders', async (c: AppContext) => {
	const session = c.get('authUser');
	if (!session) {
		return c.json(result.fail('未登录或凭证无效', 401), 401);
	}
	const body = await c.req.json();
	const parsed = orderInputSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(result.fail('下单参数不合法', 400), 400);
	}
	const db = createDb(c.env);
	const productService = new ProductService(c.env, db);
	const orderService = new OrderService(db);
	const product = await productService.findActiveProduct(parsed.data.productId);
	if (!product) {
		return c.json(result.fail('商品不存在或已下架', 404), 404);
	}
	if (product.stock < parsed.data.quantity) {
		return c.json(result.fail('库存不足，请稍后再试', 409), 409);
	}
	const priceMap = productService.parsePriceMap(product.price, product.defaultCurrency);
	const currencyCandidate = parsed.data.currency?.toUpperCase();
	const currency =
		currencyCandidate && Object.prototype.hasOwnProperty.call(priceMap, currencyCandidate)
			? currencyCandidate
			: product.defaultCurrency;
	const unitAmount = priceMap[currency];
	if (typeof unitAmount !== 'number') {
		return c.json(result.fail('暂不支持所选币种', 400), 400);
	}
	const now = dayjs();
	const orderId = uuidv4();
	const orderSn = `${now.format('YYYYMMDDHHmmssSSS')}-${session.username}`;
	let reservedCode: string | null = null;
	try {
		if (product.deliveryMode === 'code') {
			reservedCode = await productService.popInventoryCode(product.id);
			if (!reservedCode) {
				return c.json(result.fail('库存密钥不足，请联系管理员', 409), 409);
			}
		}
		await orderService.createDeliveredOrder({
			orderId,
			orderSn,
			userId: session.uid,
			product,
			quantity: parsed.data.quantity,
			unitAmount,
			currency,
			paymentInvoiceId: `web-${orderId}`,
			paymentJson: JSON.stringify({
				method: 'web',
				paidAt: now.toISOString(),
				currency,
				amount: unitAmount * parsed.data.quantity,
			}),
			createdAt: now.toISOString(),
		});
	} catch (error) {
		console.error('order creation failed', error);
		if (reservedCode) {
			await productService.pushInventoryCode(product.id, reservedCode);
		}
		throw error;
	}
	const attachment = await productService.loadProductAttachment(product.id);
	return c.json(
		result.ok({
			orderSn,
			product: serializeProduct(product, productService),
			currency,
			amount: unitAmount * parsed.data.quantity,
			code: reservedCode,
			instructions: product.deliveryInstructions,
			attachment,
		}),
	);
});

function buildCatalogTree(categoriesList: CategoryRecord[], productRows: ProductRecord[], productService: ProductService) {
	const byParent = new Map<string | null, CategoryRecord[]>();
	const productsByCategory = new Map<string, ProductRecord[]>();
	for (const category of categoriesList) {
		const key = category.parentId ?? null;
		if (!byParent.has(key)) {
			byParent.set(key, []);
		}
		byParent.get(key)!.push(category);
	}
	for (const product of productRows) {
		const list = productsByCategory.get(product.categoryId) ?? [];
		list.push(product);
		productsByCategory.set(product.categoryId, list);
	}
	const roots = byParent.get(null) ?? [];
	const buildNode = (category: CategoryRecord): CatalogNode => {
		const children = byParent.get(category.id) ?? [];
		return {
			id: category.id,
			name: category.name,
			description: category.description,
			emoji: category.emoji,
			parentId: category.parentId,
			sort: category.sort,
			products: (productsByCategory.get(category.id) ?? []).map((item) => serializeProduct(item, productService)),
			children: children.map(buildNode),
		};
	};
	return roots.map(buildNode);
}

function serializeProduct(product: ProductRecord, productService: ProductService) {
	const priceMap = productService.parsePriceMap(product.price, product.defaultCurrency);
	return {
		id: product.id,
		slug: product.slug,
		title: product.title,
		description: product.description,
		mediaUrl: product.mediaUrl,
		priceMap,
		priceLabel: productService.formatPriceLabel(product),
		defaultCurrency: product.defaultCurrency,
		stock: product.stock,
		deliveryMode: product.deliveryMode,
		deliveryInstructions: product.deliveryInstructions,
		sort: product.sort,
		updatedAt: product.updatedAt,
	};
}

function serializeProfile(profile: ShopProfile) {
	return {
		id: profile.user.id,
		nickname: profile.user.nickname,
		username: profile.register.username,
		avatar: profile.user.avatar,
		language: profile.register.language,
	};
}

function serializeOrderRow(row: Awaited<ReturnType<OrderService['listLatestOrdersByUid']>>[number]) {
	return {
		id: row.order.id,
		orderSn: row.order.orderSn,
		productTitle: row.productTitle,
		currency: row.order.currency,
		amount: row.order.totalAmount,
		status: row.order.status,
		createdAt: row.order.createdAt,
	};
}


