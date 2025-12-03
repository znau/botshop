import { z } from 'zod';

import app from '../hono';
import result from '@/utils/result';
import type { AppContext } from '@/types';
import { serializeProfile, ShopAuthService } from '@/services/shopAuthService';
import { LANGUAGE_CODES, type LanguageCode } from '@/services/userService';
import { ApiCode } from '@/enum/apiCodes';
import jwtUtils from '@/utils/jwt';
import BizError from '@/utils/bizError';
import { requireAuth } from '../middleware/userAuth';
import { getClientIpFromHeaders, getClientLanguageFromHeaders } from '@/utils/common';

import { CategoryService } from '@/services/categoryService';
import { ProductService } from '@/services/productService';
import { OrderService, serializeOrderRow } from '@/services/orderService';

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

// Orders are simple enough that we validate inline instead of pulling in the shared schema.
const orderInputSchema = z.object({
	productId: z.string().min(1),
	quantity: z.number().int().min(1).default(1),
	currency: z.string().min(2).max(10).optional(),
});

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

/**
 * Handles classic username/password authentication for the storefront and issues a user JWT.
 */
app.post('/api/shop/login', async (c: AppContext) => {
	const body = await c.req.json();
	const input = loginSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail(ApiCode.BAD_REQUEST, '账号或密码不正确'), 400);
	}
	const authService = new ShopAuthService(c);
	const record = await authService.accountLogin({
		username: input.data.username,
		password: input.data.password,
		loginIp: getClientIpFromHeaders(c.req),
	});
	if (!record) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '账号或密码不正确'), 401);
	}

	const ttl = TOKEN_TTL;
	const token = await jwtUtils.generateToken(
		c,
		{
			uid: record.register.uid,
			username: record.register.username,
		},
		{ scene: 'user', ttl },
	);

	return c.json(
		result.ok({
			auth: {
				uid: record.user.id,
				token,
			},
			user: {
				nickname: record.user.nickname,
				username: record.register.username,
				avatar: record.user.avatar,
				language: record.register.language,
			},
		}),
	);
});


/**
 * Allows visitors to create a storefront account, auto-login, and receive a JWT in one call.
 */
app.post('/api/shop/register', async (c: AppContext) => {
	const body = await c.req.json();
	const input = registerSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail(ApiCode.BAD_REQUEST, '注册信息不合法'), 400);
	}
	const authService = new ShopAuthService(c);
	const registerIp = getClientIpFromHeaders(c.req);
	// Respect caller-provided language first, then fall back to the Accept-Language header.
	const language = input.data.language
		?? getClientLanguageFromHeaders<LanguageCode>(c.req, {
			supported: LANGUAGE_CODES,
		});
	try {
		const record = await authService.accountRegister({
			username: input.data.username,
			password: input.data.password,
			nickname: input.data.nickname,
			language,
			registerIp,
		});

		const ttl = TOKEN_TTL;
		const token = await jwtUtils.generateToken(
			c,
			{
				uid: record.register.uid,
				username: record.register.username,
			},
			{ scene: 'user', ttl },
		);

		return c.json(
			result.ok({
				auth: {
					uid: record.user.id,
					token,
				},
				user: {
					nickname: record.user.nickname,
					username: record.register.username,
					avatar: record.user.avatar,
					language: record.register.language,
				},
			}),
		);
	} catch (error) {
		if (error instanceof BizError) {
			throw error;
		}
		console.error('account registration failed', error);
		return c.json(result.fail(ApiCode.INTERNAL_ERROR, '注册失败，请稍后再试'), 500);
	}
});


/**
 * Verifies Telegram WebApp init data and exchanges it for the standard storefront JWT session.
 */
app.post('/api/shop/login/telegram', async (c: AppContext) => {
	const body = await c.req.json();
	const input = telegramLoginSchema.safeParse(body);
	if (!input.success) {
		return c.json(result.fail(ApiCode.BAD_REQUEST, '缺少 Telegram 登录数据'), 400);
	}
	const authService = new ShopAuthService(c);
	try {
		const profile = await authService.loginWithTelegram(input.data.initData);
		const token = await jwtUtils.generateToken(
			c,
			{ uid: profile.register.uid, username: profile.register.username },
			{ scene: 'user', ttl: TOKEN_TTL },
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
		return c.json(result.fail(ApiCode.UNAUTHORIZED, 'Telegram 登录失败'), 401);
	}
});


// Catalog and product detail endpoints.
app.get('/api/shop/catalog', async (c: AppContext) => {
	const categoryService = new CategoryService(c);
	const catalog = await categoryService.getCatalog();
	return c.json(result.ok(catalog));
});

// Product detail endpoint.
app.get('/api/shop/products/:productId', async (c: AppContext) => {
	const productId = c.req.param('productId');
	const productService = new ProductService(c);
	const detail = await productService.getProductDetail(productId);
	if (!detail) {
		return c.json(result.fail(ApiCode.NOT_FOUND, '商品不存在或已下架'), 404);
	}
	return c.json(result.ok(detail));
});


// Logout endpoint.
app.post('/api/shop/logout', async (c: AppContext) => c.json(result.ok({ ok: true })));

// Profile endpoint.
app.get('/api/shop/profile', async (c: AppContext) => {
	const authUser = c.get('authUser');
	if (!authUser) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证无效'), 401);
	}
	const authService = new ShopAuthService(c);

	const profile = await authService.fetchProfileByUid(authUser.uid);
	if (!profile) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证无效'), 401);
	}

	const orderService = new OrderService(c);
	const orders = await orderService.listLatestOrdersByUid(profile.register.uid, 5);
	
	return c.json(result.ok({
		user: serializeProfile(profile),
		orders: orders.map((row) => serializeOrderRow(row)),
	}));
});

// Orders endpoints.
app.get('/api/shop/orders', async (c: AppContext) => {
	const authUser = c.get('authUser');
	if (!authUser) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证无效'), 401);
	}
	const orderService = new OrderService(c);
	const rows = await orderService.listLatestOrdersByUid(authUser.uid, 20);
	const orders = await rows.map((row) => serializeOrderRow(row));
	return c.json(result.ok({ orders }));
});

// Create order endpoint.
app.post('/api/shop/orders', async (c: AppContext) => {
	const authUser = c.get('authUser');
	if (!authUser) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证无效'), 401);
	}
	const body = await c.req.json();
	const parsed = orderInputSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(result.fail(ApiCode.BAD_REQUEST, '下单参数不合法'), 400);
	}

	const orderService = new OrderService(c);
	try {
		const receipt = await orderService.createOrder({
			uid: authUser.uid,
			productId: parsed.data.productId,
			quantity: parsed.data.quantity,
			currency: parsed.data.currency,
		});
		return c.json(result.ok(receipt));
	} catch (error) {
		if (error instanceof BizError) {
			return c.json(result.fail(error.code, error.message));
		}
		console.error('order creation failed', error);
		return c.json(result.fail(ApiCode.INTERNAL_ERROR, '下单失败，请稍后再试'), 500);
	}
});


