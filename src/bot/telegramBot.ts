import { CatalogService } from "../services/catalogService";
import { OrderService } from "../services/orderService";
import { PaymentGatewayService } from "../services/paymentGateway";
import { TelegramService } from "../services/telegramService";
import { UserService } from "../services/userService";
import type {
	Order,
	Product,
	StorefrontCategoryNode,
	TelegramCallbackQuery,
	TelegramMessage,
	TelegramUpdate,
	User,
} from "../types";

type InlineKeyboardButton = {
	text: string;
	callback_data?: string;
	url?: string;
};

type ViewPayload = {
	text: string;
	keyboard: InlineKeyboardButton[][];
};

type CatalogNode = StorefrontCategoryNode;
type CategoryRecord = Awaited<ReturnType<CatalogService["getCategory"]>>;
type ProductRecord = Product | null;
type OrderRecord = Order | null;

const chunkButtons = <T>(items: T[], perRow: number) => {
	const rows: T[][] = [];
	for (let i = 0; i < items.length; i += perRow) {
		rows.push(items.slice(i, i + perRow));
	}
	return rows;
};

const formatStatus = (status: string) => {
	const map: Record<string, string> = {
		awaiting_payment: "⏳ 待支付",
		paid: "✅ 已支付",
		delivering: "🚚 发货中",
		delivered: "📦 已完成",
		awaiting_stock: "🪫 缺货中",
		failed: "❌ 失败",
		refunded: "↩️ 已退款",
		expired: "⌛ 已过期",
		pending: "⌛ 处理中",
	};
	return map[status] ?? status;
};

export class TelegramBot {
	private readonly catalog: CatalogService;
	private readonly orders: OrderService;
	private readonly users: UserService;
	private readonly payments: PaymentGatewayService;
	private readonly telegram: TelegramService;

	constructor(private readonly env: Env) {
		this.catalog = new CatalogService(env);
		this.orders = new OrderService(env);
		this.users = new UserService(env);
		this.payments = new PaymentGatewayService(env);
		this.telegram = new TelegramService(env);
	}

	async handleUpdate(update: TelegramUpdate): Promise<void> {
		try {
			if (update.message) {
				await this.handleMessage(update.message);
			} else if (update.callback_query) {
				await this.handleCallback(update.callback_query);
			}
		} catch (error) {
			console.error("Telegram update failed", error);
		}
	}

	private async handleMessage(message: TelegramMessage) {
		const chatId = message.chat.id;
		const userPayload = message.from;
		if (!userPayload) {
			await this.telegram.sendMessage(chatId, "请先与机器人开始对话。");
			return;
		}
		const { user, isNew } = await this.users.upsertFromTelegram(userPayload);
		if (isNew) {
			await this.telegram.sendMessage(
				chatId,
				`🎉 已为你创建云端商店账户\nID: ${user.id}\nTelegram: ${user.username ?? "(无用户名)"}\n现在可以直接通过按钮浏览商品并创建订单。`,
			);
		}
		const text = (message.text ?? "").trim();

		if (text.startsWith("/start")) {
			await this.presentHome(chatId, user);
			return;
		}

		if (text.startsWith("/catalog")) {
			await this.showCatalog(chatId);
			return;
		}

		if (text.startsWith("/orders")) {
			await this.showOrders(chatId, user);
			return;
		}

		if (text.startsWith("/buy")) {
			const [, slug] = text.split(/\s+/, 2);
			if (!slug) {
				await this.telegram.sendMessage(chatId, "请提供商品 slug，比如 /buy premium-code");
				return;
			}
			const product = await this.catalog.getProductBySlug(slug);
			if (!product) {
				await this.telegram.sendMessage(chatId, "未找到该商品，输入 /catalog 查看全部分类。");
				return;
			}
			await this.showProduct(chatId, undefined, product.id);
			return;
		}

		if (text.startsWith("/profile")) {
			await this.showProfile(chatId, user);
			return;
		}

		await this.presentHome(chatId, user);
	}

	private async handleCallback(callback: TelegramCallbackQuery) {
		const data = callback.data ?? "";
		if (!callback.message) return;
		const chatId = callback.message.chat.id;
		const messageId = callback.message.message_id;
		const { user } = await this.users.upsertFromTelegram(callback.from);
		await this.telegram.answerCallbackQuery(callback.id);

		const [scope, action, param, extra] = data.split(":");
		switch (`${scope}:${action}`) {
			case "nav:home":
				await this.presentHome(chatId, user, messageId);
				return;
			case "nav:catalog":
				await this.showCatalog(chatId, messageId);
				return;
			case "nav:orders":
				await this.showOrders(chatId, user, messageId);
				return;
			case "nav:profile":
				await this.showProfile(chatId, user, messageId);
				return;
			case "catalog:cat":
				if (param) {
					await this.showCategory(chatId, messageId, param);
				}
				return;
			case "catalog:product":
				if (param) {
					await this.showProduct(chatId, messageId, param);
				}
				return;
			case "order:detail":
				if (param) {
					await this.showOrderDetail(chatId, messageId, param);
				}
				return;
			case "buy:currency":
				if (param && extra) {
					await this.processOrderCreation(chatId, messageId, user, param, extra);
				}
				return;
			default:
				if (scope === "buy" && action && param) {
					await this.processOrderCreation(chatId, messageId, user, action, param);
					return;
				}
		}

		await this.presentHome(chatId, user, messageId);
	}

	private async presentHome(chatId: number, user: User, messageId?: number) {
		const view = this.buildHomeView(user);
		await this.presentView(chatId, view, messageId);
	}

	private async showCatalog(chatId: number, messageId?: number) {
		const catalog = await this.catalog.getCatalogOverview();
		const view = this.buildCatalogView(catalog.categories);
		await this.presentView(chatId, view, messageId);
	}

	private async showCategory(chatId: number, messageId: number | undefined, categoryId: string) {
		const category = await this.catalog.getCategory(categoryId);
		if (!category) {
			await this.presentView(chatId, this.buildErrorView("未找到该分类"), messageId);
			return;
		}
		const products = await this.catalog.listProducts({ categoryId, activeOnly: false });
		const view = this.buildCategoryView(category, products);
		await this.presentView(chatId, view, messageId);
	}

	private async showProduct(chatId: number, messageId: number | undefined, productId: string) {
		const product = await this.catalog.getProduct(productId);
		const view = this.buildProductView(product);
		await this.presentView(chatId, view, messageId);
	}

	private async showOrders(chatId: number, user: User, messageId?: number) {
		const orders = await this.orders.listOrdersByUser(user.id, 5);
		const view = this.buildOrdersView(orders);
		await this.presentView(chatId, view, messageId);
	}

	private async showOrderDetail(chatId: number, messageId: number | undefined, orderId: string) {
		const order = await this.orders.getOrder(orderId);
		const view = this.buildOrderDetailView(order);
		await this.presentView(chatId, view, messageId);
	}

	private async showProfile(chatId: number, user: User, messageId?: number) {
		const view = this.buildProfileView(user);
		await this.presentView(chatId, view, messageId);
	}

	private async processOrderCreation(
		chatId: number,
		messageId: number | undefined,
		user: User,
		productId: string,
		currency: string,
	) {
		const product = await this.catalog.getProduct(productId);
		if (!product) {
			await this.presentView(chatId, this.buildErrorView("未找到该商品"), messageId);
			return;
		}
		const price = product.priceMap[currency];
		if (!price) {
			await this.presentView(chatId, this.buildErrorView(`该商品不支持 ${currency} 支付`), messageId);
			return;
		}
		const invoice = await this.payments.createInvoice({
			amount: price,
			currency,
			supportedCurrencies: product.acceptedCurrencies,
			orderLabel: product.title,
			metadata: { productId: product.id, userId: user.id },
			successUrl: this.env.BASE_URL ? `${this.env.BASE_URL}/orders/${product.slug}` : undefined,
		});
		const order = await this.orders.createOrder({
			product,
			user,
			chatId,
			quantity: 1,
			currency,
			invoice,
		});
		const view = this.buildPaymentView(order, product);
		await this.presentView(chatId, view, messageId);
	}

	private buildHomeView(user: User): ViewPayload {
		const name = user.firstName ?? user.username ?? `UID ${user.telegramId}`;
		const text = `👋 你好 ${name}\n选择下方按钮开始购物。\n\n提示：所有操作都会在同一条消息内更新。`;
		return {
			text,
			keyboard: [
				[{ text: "🛍 浏览商品", callback_data: "nav:catalog" }],
				[{ text: "📦 我的订单", callback_data: "nav:orders" }],
				[{ text: "👤 个人信息", callback_data: "nav:profile" }],
			],
		};
	}

	private buildCatalogView(nodes: CatalogNode[]): ViewPayload {
		if (!nodes.length) {
			return {
				text: "🛍 暂无上架商品，稍后再来看看吧",
				keyboard: [[{ text: "🏠 返回首页", callback_data: "nav:home" }]],
			};
		}
		const lines = nodes.map((node, index) => {
			const category = node.category;
			const label = category?.name ?? "未命名";
			const emoji = category?.emoji ?? "🛒";
			return `${index + 1}. ${emoji} ${label} (${node.products.length})`;
		});
		const buttons = nodes
			.map((node) => {
				const category = node.category;
				if (!category?.id) return null;
				return {
					text: category.name ?? "未命名",
					callback_data: `catalog:cat:${category.id}`,
				};
			})
			.filter(Boolean) as InlineKeyboardButton[];
		const keyboard = buttons.length ? chunkButtons(buttons, 2) : [];
		keyboard.push([{ text: "🏠 返回首页", callback_data: "nav:home" }]);
		return {
			text: `🛍 商品分类\n\n${lines.join("\n")}`,
			keyboard,
		};
	}

	private buildCategoryView(category: CategoryRecord, products: Product[]): ViewPayload {
		if (!category) {
			return this.buildErrorView("未找到该分类");
		}
		const lines = products.length
			? products.map((product, index) => `${index + 1}. ${product.title} (${product.stock})`)
			: ["暂无商品"];
		const productButtons = products.map((product) => ({
			text: product.title,
			callback_data: `catalog:product:${product.id}`,
		}));
		const keyboard = productButtons.length ? chunkButtons(productButtons, 1) : [];
		keyboard.push([
			{ text: "⬅️ 分类", callback_data: "nav:catalog" },
			{ text: "🏠 首页", callback_data: "nav:home" },
		]);
		return {
			text: `${category.emoji ?? "🛒"} ${category.name}\n${category.description ?? ""}\n\n${lines.join("\n")}`,
			keyboard,
		};
	}

	private buildProductView(product: ProductRecord): ViewPayload {
		if (!product) {
			return this.buildErrorView("未找到该商品");
		}
		const priceLines = product.acceptedCurrencies
			.map((currency) => `${currency}: ${product.priceMap[currency] ?? product.priceMap[product.defaultCurrency]}`)
			.join("\n");
		const keyboard = chunkButtons(
			product.acceptedCurrencies.map((currency) => ({
				text: `${currency} 支付`,
				callback_data: `buy:${product.id}:${currency}`,
			})),
			2,
		);
		keyboard.push([
			{ text: "⬅️ 返回分类", callback_data: `catalog:cat:${product.categoryId}` },
			{ text: "🏠 首页", callback_data: "nav:home" },
		]);
		return {
			text: `【${product.title}】\n库存：${product.stock}\n支持币种：${product.acceptedCurrencies.join(", ")}\n价格：\n${priceLines}\n\n${product.description ?? ""}`,
			keyboard,
		};
	}

	private buildOrdersView(orders: Order[]): ViewPayload {
		if (!orders.length) {
			return {
				text: "📦 暂无订单，先去逛逛商品吧",
				keyboard: [
					[{ text: "🛍 浏览商品", callback_data: "nav:catalog" }],
					[{ text: "🏠 返回首页", callback_data: "nav:home" }],
				],
			};
		}
		const lines = orders.map((order) => `#${order.orderNo} · ${formatStatus(order.status)} · ${order.totalAmount} ${order.currency}`);
		const buttons = orders.map((order) => ({
			text: order.orderNo,
			callback_data: `order:detail:${order.id}`,
		}));
		const keyboard = chunkButtons(buttons, 1);
		keyboard.push([
			{ text: "🛍 浏览商品", callback_data: "nav:catalog" },
			{ text: "🏠 返回首页", callback_data: "nav:home" },
		]);
		return {
			text: `📦 我的订单\n\n${lines.join("\n")}`,
			keyboard,
		};
	}

	private buildOrderDetailView(order: OrderRecord): ViewPayload {
		if (!order) {
			return this.buildErrorView("未找到该订单");
		}
		const deliveryText = order.delivery
			? `发货：${order.delivery.code ?? order.delivery.note ?? "已完成"}`
			: "发货：待处理";
		const text = `🧾 订单 ${order.orderNo}\n状态：${formatStatus(order.status)}\n金额：${order.totalAmount} ${order.currency}\n下单时间：${order.createdAt}\n${deliveryText}`;
		const keyboard: InlineKeyboardButton[][] = [];
		if (order.status === "awaiting_payment") {
			keyboard.push([{ text: "💳 去支付", url: order.payment.paymentUrl }]);
		}
		keyboard.push([{ text: "🔄 刷新订单", callback_data: `order:detail:${order.id}` }]);
		keyboard.push([{ text: "📦 返回订单列表", callback_data: "nav:orders" }]);
		keyboard.push([{ text: "🏠 返回首页", callback_data: "nav:home" }]);
		return { text, keyboard };
	}

	private buildProfileView(user: User): ViewPayload {
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "未设置";
		const text = `👤 个人信息\nID: ${user.id}\nTelegram ID: ${user.telegramId}\n用户名: ${user.username ?? "无"}\n姓名: ${name}\n语言: ${user.languageCode ?? "未设置"}`;
		return {
			text,
			keyboard: [
				[{ text: "📦 我的订单", callback_data: "nav:orders" }],
				[{ text: "🏠 返回首页", callback_data: "nav:home" }],
			],
		};
	}

	private buildPaymentView(order: Order, product: Product): ViewPayload {
		const text = `🧾 订单 ${order.orderNo}\n商品：${product.title}\n数量：${order.quantity}\n应付：${order.payment.amount} ${order.payment.currency}\n支付链接有效至：${order.payment.expiresAt}\n支付完成后点击“刷新订单状态”即可同步结果。`;
		return {
			text,
			keyboard: [
				[{ text: "💳 去支付", url: order.payment.paymentUrl }],
				[{ text: "🔄 刷新订单状态", callback_data: `order:detail:${order.id}` }],
				[{ text: "📦 我的订单", callback_data: "nav:orders" }],
				[{ text: "🏠 返回首页", callback_data: "nav:home" }],
			],
		};
	}

	private buildErrorView(message: string): ViewPayload {
		return {
			text: `⚠️ ${message}`,
			keyboard: [[{ text: "🏠 返回首页", callback_data: "nav:home" }]],
		};
	}

	private async presentView(chatId: number, view: ViewPayload, messageId?: number) {
		if (messageId) {
			await this.telegram.editMessageText(chatId, messageId, view.text);
			await this.telegram.editMessageReplyMarkup(chatId, messageId, {
				inline_keyboard: view.keyboard,
			});
			return;
		}
		await this.telegram.sendMessage(chatId, view.text, {
			replyMarkup: { inline_keyboard: view.keyboard },
		});
	}
}
