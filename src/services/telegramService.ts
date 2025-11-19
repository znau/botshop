type MessageOptions = {
	parseMode?: "MarkdownV2" | "HTML" | "Markdown";
	replyMarkup?: unknown;
	disableWebPagePreview?: boolean;
};

const TELEGRAM_API_BASE = "https://api.telegram.org";

export class TelegramService {
	constructor(private readonly env: Env) {}

	private endpoint(method: string) {
		return `${TELEGRAM_API_BASE}/bot${this.env.TELEGRAM_BOT_TOKEN}/${method}`;
	}

	private async callTelegram(method: string, payload: unknown): Promise<void> {
		const response = await fetch(this.endpoint(method), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Telegram API ${method} failed`, errorText);
			throw new Error(`Telegram API ${method} failed with status ${response.status}`);
		}
	}

	async sendMessage(chatId: number, text: string, options?: MessageOptions): Promise<void> {
		const payload: Record<string, unknown> = {
			chat_id: chatId,
			text,
			parse_mode: options?.parseMode,
			disable_web_page_preview: options?.disableWebPagePreview ?? true,
			reply_markup: options?.replyMarkup,
		};
		await this.callTelegram("sendMessage", payload);
	}

	async answerCallbackQuery(callbackId: string, text?: string): Promise<void> {
		await this.callTelegram("answerCallbackQuery", {
			callback_query_id: callbackId,
			text,
			show_alert: false,
		});
	}

	async editMessageText(chatId: number, messageId: number, text: string, options?: MessageOptions): Promise<void> {
		await this.callTelegram("editMessageText", {
			chat_id: chatId,
			message_id: messageId,
			text,
			parse_mode: options?.parseMode,
			reply_markup: options?.replyMarkup,
		});
	}

	async editMessageReplyMarkup(chatId: number, messageId: number, replyMarkup: unknown): Promise<void> {
		await this.callTelegram("editMessageReplyMarkup", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: replyMarkup,
		});
	}
}
