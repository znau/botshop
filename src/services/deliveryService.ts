import { CatalogService } from "./catalogService";
import { OrderService } from "./orderService";
import { TelegramService } from "./telegramService";
import { Order } from "../types";

const now = () => new Date().toISOString();

export class DeliveryService {
	private readonly catalog: CatalogService;
	private readonly orders: OrderService;
	private readonly telegram: TelegramService;

	constructor(private readonly env: Env) {
		this.catalog = new CatalogService(env);
		this.orders = new OrderService(env);
		this.telegram = new TelegramService(env);
	}

	async deliver(order: Order): Promise<Order | null> {
		const code = await this.catalog.consumeInventoryCode(order.productId, order.id);
		if (!code) {
			await this.orders.updateStatus(order.id, "awaiting_stock", "库存不足，等待补货");
			await this.telegram.sendMessage(
				order.telegramChatId,
				`⚠️ 您的订单 ${order.orderNo} 已付款，但暂时缺货。我们会在补货后第一时间推送兑换信息。`,
			);
			return null;
		}

		const updated = await this.orders.attachDelivery(order.id, {
			code,
			deliveredAt: now(),
		});

		const product = await this.catalog.getProduct(order.productId);

		await this.telegram.sendMessage(
			order.telegramChatId,
			`✅ 订单 ${order.orderNo} 已自动发货\n商品：${product?.title ?? order.productId}\n兑换码：${code}`,
		);

		return updated;
	}
}
