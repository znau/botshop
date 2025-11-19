import { Hono } from "hono";
import { z } from "zod";
import type { AppContext, AppVariables } from "../types";
import {
	CategoryInputSchema,
	InventoryUploadSchema,
	OrderStatusSchema,
	OrderStatusUpdateSchema,
	ProductInputSchema,
} from "../types";
import { requireAdmin } from "../middleware/adminAuth";
import { CatalogService } from "../services/catalogService";
import { OrderService } from "../services/orderService";
import { UserService } from "../services/userService";
import { AdminAuthService, AdminSessionService } from "../services/adminAuthService";
import { MediaService } from "../services/mediaService";

export const adminRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const LoginSchema = z.object({
	username: z.string().min(3).max(64),
	password: z.string().min(6).max(128),
});

adminRouter.post("/auth/login", async (c: AppContext) => {
	const body = LoginSchema.safeParse(await c.req.json());
	if (!body.success) {
		return c.json({ error: "无效的登录参数" }, 400);
	}
	const auth = new AdminAuthService(c.env);
	const account = await auth.verifyCredentials(body.data.username, body.data.password);
	if (!account) {
		return c.json({ error: "用户名或密码错误" }, 401);
	}
	const sessions = new AdminSessionService(c.env);
	const token = await sessions.createToken(account.username);
	sessions.attachCookie(c, token);
	return c.json({ user: { username: account.username } });
});

adminRouter.post("/auth/logout", async (c: AppContext) => {
	const sessions = new AdminSessionService(c.env);
	sessions.clearCookie(c);
	return c.json({ success: true });
});

adminRouter.get("/auth/session", async (c: AppContext) => {
	const sessions = new AdminSessionService(c.env);
	const payload = await sessions.verifyToken(sessions.getTokenFromRequest(c));
	if (!payload) {
		return c.json({ authenticated: false }, 401);
	}
	return c.json({ authenticated: true, user: { username: payload.username } });
});

adminRouter.use("*", requireAdmin);

adminRouter.post("/media/upload", async (c: AppContext) => {
	const formData = await c.req.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		return c.json({ error: "缺少文件" }, 400);
	}
	const productId = formData.get("productId");
	const media = new MediaService(c.env);
	const asset = await media.uploadProductAsset(file, typeof productId === "string" && productId ? { productId } : undefined);
	return c.json({ asset });
});

adminRouter.get("/categories", async (c) => {
	const catalog = new CatalogService(c.env);
	return c.json({ categories: await catalog.listCategories() });
});

adminRouter.post("/categories", async (c) => {
	const payload = CategoryInputSchema.parse(await c.req.json());
	const catalog = new CatalogService(c.env);
	const category = await catalog.createCategory(payload);
	return c.json({ category }, 201);
});

adminRouter.put("/categories/:id", async (c) => {
	const payload = CategoryInputSchema.partial().parse(await c.req.json());
	const catalog = new CatalogService(c.env);
	const updated = await catalog.updateCategory(c.req.param("id"), payload);
	if (!updated) return c.json({ error: "Category not found" }, 404);
	return c.json({ category: updated });
});

adminRouter.delete("/categories/:id", async (c) => {
	const catalog = new CatalogService(c.env);
	await catalog.deleteCategory(c.req.param("id"));
	return c.json({ success: true });
});

adminRouter.get("/products", async (c) => {
	const catalog = new CatalogService(c.env);
	return c.json({ products: await catalog.listProducts() });
});

adminRouter.post("/products", async (c) => {
	const payload = ProductInputSchema.parse(await c.req.json());
	const catalog = new CatalogService(c.env);
	const product = await catalog.createProduct(payload);
	return c.json({ product }, 201);
});

adminRouter.put("/products/:id", async (c) => {
	const payload = ProductInputSchema.partial().parse(await c.req.json());
	const catalog = new CatalogService(c.env);
	const updated = await catalog.updateProduct(c.req.param("id"), payload);
	if (!updated) return c.json({ error: "Product not found" }, 404);
	return c.json({ product: updated });
});

adminRouter.delete("/products/:id", async (c) => {
	const catalog = new CatalogService(c.env);
	await catalog.deleteProduct(c.req.param("id"));
	return c.json({ success: true });
});

adminRouter.post("/products/:id/inventory", async (c) => {
	const payload = InventoryUploadSchema.parse(await c.req.json());
	const catalog = new CatalogService(c.env);
	const inventory = await catalog.uploadInventory(c.req.param("id"), payload);
	return c.json({ inventory });
});

adminRouter.get("/orders", async (c) => {
	const statusFilter = c.req.query("status");
	const orders = await new OrderService(c.env).listOrders();
	const filtered = statusFilter && OrderStatusSchema.safeParse(statusFilter).success
		? orders.filter((order) => order.status === statusFilter)
		: orders;
	return c.json({ orders: filtered });
});

adminRouter.get("/orders/:id", async (c) => {
	const order = await new OrderService(c.env).getOrder(c.req.param("id"));
	if (!order) return c.json({ error: "Order not found" }, 404);
	return c.json({ order });
});

adminRouter.post("/orders/:id/status", async (c) => {
	const payload = OrderStatusUpdateSchema.parse(await c.req.json());
	const orderService = new OrderService(c.env);
	const updated = await orderService.updateStatus(c.req.param("id"), payload.status, payload.note);
	if (!updated) return c.json({ error: "Order not found" }, 404);
	return c.json({ order: updated });
});

adminRouter.get("/users", async (c) => {
	const users = await new UserService(c.env).listUsers();
	return c.json({ users });
});

export default adminRouter;
