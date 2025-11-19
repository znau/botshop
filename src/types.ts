import type { Context } from "hono";
import { z } from "zod";

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Env {
		BOTSHOP_DB: D1Database;
		TELEGRAM_BOT_TOKEN: string;
		TELEGRAM_SECRET_TOKEN: string;
		ADMIN_SESSION_SECRET: string;
		BOTSHOP_KV: KVNamespace;
		BOTSHOP_BUCKET: R2Bucket;
		PAYMENT_GATEWAY_URL?: string;
		PAYMENT_API_KEY?: string;
		PAYMENT_WEBHOOK_SECRET: string;
		BASE_URL?: string;
		MEDIA_PUBLIC_BASE?: string;
	}
}

export type AppVariables = {
	adminUser?: string;
};

export type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

export const StatusEnum = [
	"pending",
	"awaiting_payment",
	"paid",
	"delivering",
	"delivered",
	"awaiting_stock",
	"failed",
	"refunded",
	"expired",
] as const;

export const OrderStatusSchema = z.enum(StatusEnum);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const CategorySchema = z.object({
	id: z.string(),
	name: z.string().min(2).max(64),
	description: z.string().max(500).optional(),
	emoji: z.string().max(4).optional(),
	sortOrder: z.number().int().default(0),
	isActive: z.boolean().default(true),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const CategoryInputSchema = z.object({
	name: z.string().min(2).max(64),
	description: z.string().max(500).optional(),
	emoji: z.string().max(4).optional(),
	sortOrder: z.number().int().default(0),
	isActive: z.boolean().default(true),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export const PriceMapSchema = z.record(z.string(), z.number().positive());

export const ProductSchema = z.object({
	id: z.string(),
	slug: z.string().min(2).max(64),
	categoryId: z.string(),
	title: z.string().min(2).max(140),
	description: z.string().max(4000).optional(),
	mediaUrl: z.string().url().optional(),
	priceMap: PriceMapSchema,
	defaultCurrency: z.string().min(2).max(10),
	acceptedCurrencies: z.array(z.string().min(2).max(10)).min(1),
	stock: z.number().int().nonnegative(),
	deliveryMode: z.enum(["code", "text", "manual"]).default("code"),
	deliveryInstructions: z.string().max(1000).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const ProductInputSchema = z.object({
	slug: z.string().min(2).max(64),
	categoryId: z.string(),
	title: z.string().min(2).max(140),
	description: z.string().max(4000).optional(),
	mediaUrl: z.string().url().optional(),
	priceMap: PriceMapSchema.refine(
		(value) => Object.keys(value).length > 0,
		"至少需要一种币种价格",
	),
	defaultCurrency: z.string().min(2).max(10),
	acceptedCurrencies: z.array(z.string().min(2).max(10)).min(1),
	stock: z.number().int().nonnegative().default(0),
	deliveryMode: z.enum(["code", "text", "manual"]).default("code"),
	deliveryInstructions: z.string().max(1000).optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const InventoryPoolSchema = z.object({
	productId: z.string(),
	available: z.array(z.string()),
	used: z.array(
		z.object({
			code: z.string(),
			orderId: z.string(),
			deliveredAt: z.string(),
		}),
	),
	updatedAt: z.string(),
});

export type InventoryPool = z.infer<typeof InventoryPoolSchema>;

export const PaymentInvoiceSchema = z.object({
	invoiceId: z.string(),
	paymentUrl: z.string().url(),
	amount: z.number().positive(),
	currency: z.string().min(2).max(10),
	address: z.string().optional(),
	expiresAt: z.string(),
	supportedCurrencies: z.array(z.string().min(2).max(10)),
	blockchain: z.string().optional(),
	memo: z.string().optional(),
});

export type PaymentInvoice = z.infer<typeof PaymentInvoiceSchema>;

export const DeliveryRecordSchema = z.object({
	code: z.string().optional(),
	note: z.string().max(1000).optional(),
	deliveredAt: z.string(),
});

export type DeliveryRecord = z.infer<typeof DeliveryRecordSchema>;

export const OrderSchema = z.object({
	id: z.string(),
	orderNo: z.string(),
	userId: z.string(),
	telegramChatId: z.number(),
	telegramUserId: z.number(),
	productId: z.string(),
	quantity: z.number().int().positive(),
	unitAmount: z.number().positive(),
	totalAmount: z.number().positive(),
	currency: z.string().min(2).max(10),
	status: OrderStatusSchema,
	payment: PaymentInvoiceSchema,
	delivery: DeliveryRecordSchema.optional(),
	txHash: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type Order = z.infer<typeof OrderSchema>;

export const OrderStatusUpdateSchema = z.object({
	status: OrderStatusSchema,
	note: z.string().max(500).optional(),
});

export const InventoryUploadSchema = z.object({
	codes: z.array(z.string().min(1)).min(1),
	clearExisting: z.boolean().optional(),
});

export type InventoryUpload = z.infer<typeof InventoryUploadSchema>;

export const AdminAccountSchema = z.object({
	username: z.string().min(3).max(64),
	passwordHash: z.string().min(10),
	salt: z.string().min(8),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type AdminAccount = z.infer<typeof AdminAccountSchema>;

export const UserSchema = z.object({
	id: z.string(),
	telegramId: z.number(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	languageCode: z.string().nullable(),
	isBlocked: z.boolean().default(false),
	createdAt: z.string(),
	updatedAt: z.string(),
	lastInteractionAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export type StorefrontCategoryNode = {
	category: Category;
	products: Product[];
};

export type StorefrontCatalogResponse = {
	generatedAt: string;
	categories: StorefrontCategoryNode[];
};

export type TelegramUserPayload = {
	id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
	language_code?: string;
};

export type TelegramMessage = {
	message_id: number;
	chat: { id: number };
	text?: string;
	from?: TelegramUserPayload;
};

export type TelegramCallbackQuery = {
	id: string;
	from: TelegramUserPayload;
	message?: TelegramMessage;
	data?: string;
};

export type TelegramUpdate = {
	update_id: number;
	message?: TelegramMessage;
	callback_query?: TelegramCallbackQuery;
};

export const PaymentWebhookSchema = z.object({
	invoiceId: z.string(),
	status: z.enum(["PENDING", "PAID", "FAILED", "EXPIRED"]),
	currency: z.string().min(2).max(10),
	paidAmount: z.number().nonnegative().optional(),
	txHash: z.string().optional(),
	orderId: z.string().optional(),
});

export type PaymentWebhookPayload = z.infer<typeof PaymentWebhookSchema>;

export type CreateOrderInput = {
	product: Product;
	user: User;
	chatId: number;
	quantity: number;
	currency: string;
	invoice: PaymentInvoice;
};
