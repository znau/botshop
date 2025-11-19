import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { Next } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { StoreCatalogRoute } from "./endpoints/store/catalogList";
import { HealthCheckRoute } from "./endpoints/system/health";
import { handleTelegramWebhook } from "./endpoints/telegramWebhook";
import { handlePaymentWebhook } from "./endpoints/paymentWebhook";
import adminRouter from "./routes/admin";
import { MediaService } from "./services/mediaService";
import type { AppContext, AppVariables } from "./types";
import { AdminSessionService } from "./services/adminAuthService";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const adminAssetHandler = serveStatic({
	root: "./public",
});

const serveAdminFile = (filePath: string) =>
	serveStatic({
		root: "./public",
		path: filePath,
	});

app.use("/admin/assets/*", adminAssetHandler);

const openapi = fromHono(app, {
	docs_url: "/",
});

openapi.get("/api/health", HealthCheckRoute);
openapi.get("/api/store/catalog", StoreCatalogRoute);

const getSessionUsername = async (c: AppContext) => {
	const sessions = new AdminSessionService(c.env);
	const payload = await sessions.verifyToken(sessions.getTokenFromRequest(c));
	return payload?.username ?? null;
};

const requireAdminStatic = async (c: AppContext, next: Next) => {
	const username = await getSessionUsername(c);
	if (!username) {
		const url = new URL(c.req.url);
		const nextParam = encodeURIComponent(url.pathname + url.search);
		return c.redirect(`/admin/login?next=${nextParam}`);
	}
	c.set("adminUser", username);
	await next();
};

app.get("/admin", (c) => c.redirect("/admin/categories"));

app.get("/admin/login", async (c: AppContext, next) => {
	const username = await getSessionUsername(c);
	if (username) {
		const nextParam = c.req.query("next");
		const destination = nextParam && nextParam.startsWith("/") ? nextParam : "/admin/categories";
		return c.redirect(destination);
	}
	return serveAdminFile("/admin/login/index.html")(c, next);
});

const adminPageFiles: Array<{ path: string; file: string }> = [
	{ path: "/admin/categories", file: "/admin/categories/index.html" },
	{ path: "/admin/products", file: "/admin/products/index.html" },
	{ path: "/admin/orders", file: "/admin/orders/index.html" },
	{ path: "/admin/users", file: "/admin/users/index.html" },
];

for (const { path, file } of adminPageFiles) {
	app.get(path, requireAdminStatic, serveAdminFile(file));
}

app.route("/api/admin", adminRouter);
app.post("/api/telegram/webhook", handleTelegramWebhook);
app.post("/api/payments/webhook", handlePaymentWebhook);

app.get("/media/*", async (c) => {
	const key = c.req.path.replace(/^\/media\//, "");
	if (!key) return c.notFound();
	const media = new MediaService(c.env);
	const object = await media.getObject(key);
	if (!object || !object.body) {
		return c.notFound();
	}
	return new Response(object.body, {
		headers: {
			"content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
			"cache-control": "public, max-age=86400",
		},
	});
});

export default app;
