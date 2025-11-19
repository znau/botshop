import type { Next } from "hono";
import type { AppContext } from "../types";
import { AdminSessionService } from "../services/adminAuthService";

export const requireAdmin = async (c: AppContext, next: Next) => {
	const sessionService = new AdminSessionService(c.env);
	const payload = await sessionService.verifyToken(sessionService.getTokenFromRequest(c));
	if (!payload) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	c.set("adminUser", payload.username);
	await next();
};
