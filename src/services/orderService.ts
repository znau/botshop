import {
	CreateOrderInput,
	DeliveryRecord,
	DeliveryRecordSchema,
	Order,
	OrderSchema,
	OrderStatus,
	OrderStatusSchema,
	PaymentInvoice,
} from "../types";

const now = () => new Date().toISOString();

const randomOrderNo = () => {
	const date = new Date();
	const stamp = `${date.getUTCFullYear()}${(date.getUTCMonth() + 1).toString().padStart(2, "0")}${date
		.getUTCDate()
		.toString()
		.padStart(2, "0")}`;
	const suffix = Math.random().toString(36).slice(-6).toUpperCase();
	return `${stamp}-${suffix}`;
};

type OrderRow = {
	id: string;
	order_no: string;
	user_id: string;
	telegram_chat_id: number;
	telegram_user_id: number;
	product_id: string;
	quantity: number;
	unit_amount: number;
	total_amount: number;
	currency: string;
	status: string;
	payment_invoice_id: string;
	payment_json: string;
	delivery_code: string | null;
	delivery_note: string | null;
	delivered_at: string | null;
	tx_hash: string | null;
	created_at: string;
	updated_at: string;
};

export class OrderService {
	constructor(private readonly env: Env) {}

	private mapOrder(row: OrderRow): Order {
		const delivery = row.delivery_code || row.delivery_note
			? {
				code: row.delivery_code ?? undefined,
				note: row.delivery_note ?? undefined,
				deliveredAt: row.delivered_at ?? row.updated_at,
			}
			: undefined;
		return OrderSchema.parse({
			id: row.id,
			orderNo: row.order_no,
			userId: row.user_id,
			telegramChatId: row.telegram_chat_id,
			telegramUserId: row.telegram_user_id,
			productId: row.product_id,
			quantity: row.quantity,
			unitAmount: row.unit_amount,
			totalAmount: row.total_amount,
			currency: row.currency,
			status: row.status as OrderStatus,
			payment: JSON.parse(row.payment_json ?? "{}"),
			delivery,
			txHash: row.tx_hash ?? undefined,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	}

	async listOrders(): Promise<Order[]> {
		const { results } = await this.env.BOTSHOP_DB.prepare(
			"SELECT * FROM orders ORDER BY created_at DESC",
		).all<OrderRow>();
		return (results ?? []).map((row) => this.mapOrder(row));
	}

	async listOrdersByUser(userId: string, limit = 5): Promise<Order[]> {
		const { results } = await this.env.BOTSHOP_DB.prepare(
			"SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
		)
			.bind(userId, limit)
			.all<OrderRow>();
		return (results ?? []).map((row) => this.mapOrder(row));
	}

	async getOrder(id: string): Promise<Order | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM orders WHERE id=? LIMIT 1")
			.bind(id)
			.first<OrderRow>();
		return row ? this.mapOrder(row) : null;
	}

	async getOrderIdByInvoice(invoiceId: string): Promise<string | null> {
		const record = await this.env.BOTSHOP_DB.prepare(
			"SELECT id FROM orders WHERE payment_invoice_id=? LIMIT 1",
		)
			.bind(invoiceId)
			.first<{ id: string }>();
		return record?.id ?? null;
	}

	async createOrder(input: CreateOrderInput): Promise<Order> {
		const { product, user, chatId, quantity, currency, invoice } = input;
		const unitAmount = product.priceMap[currency];
		if (!unitAmount) {
			throw new Error(`Product is not available in ${currency}`);
		}
		const order: Order = OrderSchema.parse({
			id: crypto.randomUUID(),
			orderNo: randomOrderNo(),
			userId: user.id,
			telegramChatId: chatId,
			telegramUserId: user.telegramId,
			productId: product.id,
			quantity,
			unitAmount,
			totalAmount: unitAmount * quantity,
			currency,
			status: "awaiting_payment",
			payment: invoice,
			createdAt: now(),
			updatedAt: now(),
		});
		await this.env.BOTSHOP_DB.prepare(
			"INSERT INTO orders (id, order_no, user_id, telegram_chat_id, telegram_user_id, product_id, quantity, unit_amount, total_amount, currency, status, payment_invoice_id, payment_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				order.id,
				order.orderNo,
				order.userId,
				order.telegramChatId,
				order.telegramUserId,
				order.productId,
				order.quantity,
				order.unitAmount,
				order.totalAmount,
				order.currency,
				order.status,
				invoice.invoiceId,
				JSON.stringify(order.payment),
				order.createdAt,
				order.updatedAt,
			)
			.run();
		return order;
	}

	async markPaid(orderId: string, txHash?: string | null, paidAmount?: number): Promise<Order | null> {
		const order = await this.getOrder(orderId);
		if (!order) return null;
		const payment: PaymentInvoice = {
			...order.payment,
			amount: paidAmount ?? order.payment.amount,
		};
		const updatedAt = now();
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE orders SET status='paid', tx_hash=?, payment_json=?, updated_at=? WHERE id=?",
		)
			.bind(txHash ?? order.txHash ?? null, JSON.stringify(payment), updatedAt, orderId)
			.run();
		return this.getOrder(orderId);
	}

	async updateStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order | null> {
		OrderStatusSchema.parse(status);
		const updatedAt = now();
		const deliveredAt = note ? updatedAt : null;
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE orders SET status=?, delivery_note=?, delivered_at=COALESCE(?, delivered_at), updated_at=? WHERE id=?",
		)
			.bind(status, note ?? null, deliveredAt, updatedAt, orderId)
			.run();
		return this.getOrder(orderId);
	}

	async attachDelivery(orderId: string, payload: DeliveryRecord): Promise<Order | null> {
		const delivery = DeliveryRecordSchema.parse(payload);
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE orders SET delivery_code=?, delivery_note=?, delivered_at=?, status='delivered', updated_at=? WHERE id=?",
		)
			.bind(
				delivery.code ?? null,
				delivery.note ?? null,
				delivery.deliveredAt,
				delivery.deliveredAt,
				orderId,
			)
			.run();
		return this.getOrder(orderId);
	}
}
