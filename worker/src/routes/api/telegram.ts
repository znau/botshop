import app from '../hono';
import type { AppContext, TelegramUpdate } from "../../types";
import { TelegramService } from '../../services/telegramService';

app.get('/api/telegram/webhook', (c: AppContext) => c.json({ ok: true }));

app.post('/api/telegram/webhook', async (c: AppContext) => {
	const secret = c.req.header("x-telegram-bot-api-secret-token");
	if (!secret || secret !== c.env.TELEGRAM_SECRET_TOKEN) {
		return c.json({ error: "Invalid Telegram secret" }, 401);
	}

	const payload = (await c.req.json()) as TelegramUpdate;
	const bot = new TelegramService(c.env);

	try {
		await bot.handleUpdate(payload);
	} catch (error) {
		console.error("Telegram webhook error", error);
	}

	return c.json({ ok: true });
});

