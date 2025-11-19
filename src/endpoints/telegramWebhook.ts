import type { AppContext, TelegramUpdate } from "../types";
import { TelegramBot } from "../bot/telegramBot";

export const handleTelegramWebhook = async (c: AppContext) => {
	const secret = c.req.header("x-telegram-bot-api-secret-token");
	if (!secret || secret !== c.env.TELEGRAM_SECRET_TOKEN) {
		return c.json({ error: "Invalid Telegram secret" }, 401);
	}

	const payload = (await c.req.json()) as TelegramUpdate;
	const bot = new TelegramBot(c.env);

	try {
		await bot.handleUpdate(payload);
	} catch (error) {
		console.error("Telegram webhook error", error);
	}

	return c.json({ ok: true });
};
