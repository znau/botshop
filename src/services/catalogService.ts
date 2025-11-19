import {
	Category,
	CategoryInput,
	CategoryInputSchema,
	CategorySchema,
	InventoryPool,
	InventoryPoolSchema,
	InventoryUpload,
	InventoryUploadSchema,
	Product,
	ProductInput,
	ProductInputSchema,
	ProductSchema,
	StorefrontCatalogResponse,
	StorefrontCategoryNode,
} from "../types";

const now = () => new Date().toISOString();

type CategoryRow = {
	id: string;
	name: string;
	description: string | null;
	emoji: string | null;
	sort_order: number;
	is_active: number;
	created_at: string;
	updated_at: string;
};

type ProductRow = {
	id: string;
	slug: string;
	category_id: string;
	title: string;
	description: string | null;
	media_url: string | null;
	price_map: string;
	default_currency: string;
	accepted_currencies: string;
	stock: number;
	delivery_mode: string;
	delivery_instructions: string | null;
	created_at: string;
	updated_at: string;
};

type InventoryRow = {
	id: string;
	code: string;
	status: string;
	order_id: string | null;
	delivered_at: string | null;
	created_at: string;
};

const parseBool = (value: number | boolean) => value === 1 || value === true;

export class CatalogService {
	constructor(private readonly env: Env) {}

	private mapCategory(row: CategoryRow): Category {
		return CategorySchema.parse({
			id: row.id,
			name: row.name,
			description: row.description ?? undefined,
			emoji: row.emoji ?? undefined,
			sortOrder: row.sort_order,
			isActive: parseBool(row.is_active),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	}

	private mapProduct(row: ProductRow): Product {
		const accepted = JSON.parse(row.accepted_currencies ?? "[]");
		const priceMap = JSON.parse(row.price_map ?? "{}");
		return ProductSchema.parse({
			id: row.id,
			slug: row.slug,
			categoryId: row.category_id,
			title: row.title,
			description: row.description ?? undefined,
			mediaUrl: row.media_url ?? undefined,
			priceMap,
			defaultCurrency: row.default_currency,
			acceptedCurrencies: accepted,
			stock: row.stock,
			deliveryMode: row.delivery_mode as Product["deliveryMode"],
			deliveryInstructions: row.delivery_instructions ?? undefined,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	}

	async listCategories(): Promise<Category[]> {
		const { results } = await this.env.BOTSHOP_DB.prepare(
			"SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC",
		).all<CategoryRow>();
		return (results ?? []).map((row) => this.mapCategory(row));
	}

	async getCategory(id: string): Promise<Category | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM categories WHERE id = ? LIMIT 1").bind(id).first<CategoryRow>();
		return row ? this.mapCategory(row) : null;
	}

	async createCategory(payload: CategoryInput): Promise<Category> {
		const data = CategoryInputSchema.parse(payload);
		const category: Category = CategorySchema.parse({
			id: crypto.randomUUID(),
			createdAt: now(),
			updatedAt: now(),
			...data,
		});
		await this.env.BOTSHOP_DB.prepare(
			"INSERT INTO categories (id, name, description, emoji, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				category.id,
				category.name,
				category.description ?? null,
				category.emoji ?? null,
				category.sortOrder,
				category.isActive ? 1 : 0,
				category.createdAt,
				category.updatedAt,
			)
			.run();
		return category;
	}

	async updateCategory(id: string, payload: Partial<CategoryInput>): Promise<Category | null> {
		const existing = await this.getCategory(id);
		if (!existing) return null;
		const data = CategoryInputSchema.partial().parse(payload);
		const updated: Category = {
			...existing,
			...data,
			updatedAt: now(),
		};
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE categories SET name=?, description=?, emoji=?, sort_order=?, is_active=?, updated_at=? WHERE id=?",
		)
			.bind(
				updated.name,
				updated.description ?? null,
				updated.emoji ?? null,
				updated.sortOrder,
				updated.isActive ? 1 : 0,
				updated.updatedAt,
				id,
			)
			.run();
		return updated;
	}

	async deleteCategory(id: string): Promise<void> {
		await this.env.BOTSHOP_DB.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
	}

	async listProducts(filter?: { categoryId?: string; activeOnly?: boolean }): Promise<Product[]> {
		const conditions: string[] = [];
		const params: Array<string | number> = [];
		if (filter?.categoryId) {
			conditions.push("category_id = ?");
			params.push(filter.categoryId);
		}
		if (filter?.activeOnly) {
			conditions.push("stock > 0");
		}
		const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
		const stmt = this.env.BOTSHOP_DB.prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC`);
		const query = params.length ? stmt.bind(...params) : stmt;
		const { results } = await query.all<ProductRow>();
		return (results ?? []).map((row) => this.mapProduct(row));
	}

	async getProduct(id: string): Promise<Product | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(id).first<ProductRow>();
		return row ? this.mapProduct(row) : null;
	}

	async getProductBySlug(slug: string): Promise<Product | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1")
			.bind(slug)
			.first<ProductRow>();
		return row ? this.mapProduct(row) : null;
	}

	async createProduct(payload: ProductInput): Promise<Product> {
		const data = ProductInputSchema.parse(payload);
		const product: Product = ProductSchema.parse({
			id: crypto.randomUUID(),
			stock: data.stock ?? 0,
			createdAt: now(),
			updatedAt: now(),
			...data,
			acceptedCurrencies: Array.from(new Set(data.acceptedCurrencies)),
		});
		await this.env.BOTSHOP_DB.prepare(
			"INSERT INTO products (id, slug, category_id, title, description, media_url, price_map, default_currency, accepted_currencies, stock, delivery_mode, delivery_instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				product.id,
				product.slug,
				product.categoryId,
				product.title,
				product.description ?? null,
				product.mediaUrl ?? null,
				JSON.stringify(product.priceMap),
				product.defaultCurrency,
				JSON.stringify(product.acceptedCurrencies),
				product.stock,
				product.deliveryMode,
				product.deliveryInstructions ?? null,
				product.createdAt,
				product.updatedAt,
			)
			.run();
		return product;
	}

	async updateProduct(id: string, payload: Partial<ProductInput>): Promise<Product | null> {
		const existing = await this.getProduct(id);
		if (!existing) return null;
		const data = ProductInputSchema.partial().parse(payload);
		const merged = ProductSchema.parse({
			...existing,
			...data,
			acceptedCurrencies: data.acceptedCurrencies
				? Array.from(new Set(data.acceptedCurrencies))
				: existing.acceptedCurrencies,
			updatedAt: now(),
		});
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE products SET slug=?, category_id=?, title=?, description=?, media_url=?, price_map=?, default_currency=?, accepted_currencies=?, stock=?, delivery_mode=?, delivery_instructions=?, updated_at=? WHERE id=?",
		)
			.bind(
				merged.slug,
				merged.categoryId,
				merged.title,
				merged.description ?? null,
				merged.mediaUrl ?? null,
				JSON.stringify(merged.priceMap),
				merged.defaultCurrency,
				JSON.stringify(merged.acceptedCurrencies),
				merged.stock,
				merged.deliveryMode,
				merged.deliveryInstructions ?? null,
				merged.updatedAt,
				id,
			)
			.run();
		return merged;
	}

	async deleteProduct(id: string): Promise<void> {
		await this.env.BOTSHOP_DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
	}

	async uploadInventory(productId: string, payload: InventoryUpload): Promise<InventoryPool> {
		const data = InventoryUploadSchema.parse(payload);
		if (data.clearExisting) {
			await this.env.BOTSHOP_DB.prepare("DELETE FROM inventory_codes WHERE product_id=?").bind(productId).run();
		}
		const statements: D1PreparedStatement[] = [];
		for (const rawCode of data.codes) {
			const code = rawCode.trim();
			if (!code) continue;
			statements.push(
				this.env.BOTSHOP_DB.prepare(
					"INSERT OR IGNORE INTO inventory_codes (id, product_id, code, status, created_at) VALUES (?, ?, ?, 'available', ?)",
				).bind(crypto.randomUUID(), productId, code, now()),
			);
		}
		if (statements.length) {
			await this.env.BOTSHOP_DB.batch(statements);
		}
		await this.syncStockWithInventory(productId);
		return (await this.getInventory(productId)) ?? InventoryPoolSchema.parse({
			productId,
			available: [],
			used: [],
			updatedAt: now(),
		});
	}

	async consumeInventoryCode(productId: string, orderId: string): Promise<string | null> {
		const row = await this.env.BOTSHOP_DB.prepare(
			"SELECT id, code FROM inventory_codes WHERE product_id=? AND status='available' ORDER BY created_at ASC LIMIT 1",
		)
			.bind(productId)
			.first<{ id: string; code: string }>();
		if (!row) return null;
		const deliveredAt = now();
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE inventory_codes SET status='used', order_id=?, delivered_at=? WHERE id=?",
		)
			.bind(orderId, deliveredAt, row.id)
			.run();
		await this.syncStockWithInventory(productId);
		return row.code;
	}

	async getInventory(productId: string): Promise<InventoryPool | null> {
		const available = await this.env.BOTSHOP_DB.prepare(
			"SELECT code FROM inventory_codes WHERE product_id=? AND status='available' ORDER BY created_at ASC",
		)
			.bind(productId)
			.all<{ code: string }>();
		const used = await this.env.BOTSHOP_DB.prepare(
			"SELECT code, order_id, delivered_at FROM inventory_codes WHERE product_id=? AND status='used' ORDER BY delivered_at DESC",
		)
			.bind(productId)
			.all<{ code: string; order_id: string | null; delivered_at: string | null }>();
		const pool = InventoryPoolSchema.safeParse({
			productId,
			available: (available.results ?? []).map((row) => row.code),
			used: (used.results ?? []).map((row) => ({
				code: row.code,
				orderId: row.order_id ?? "",
				deliveredAt: row.delivered_at ?? now(),
			})),
			updatedAt: now(),
		});
		return pool.success ? pool.data : null;
	}

	private async syncStockWithInventory(productId: string): Promise<void> {
		await this.env.BOTSHOP_DB.prepare(
			"UPDATE products SET stock=(SELECT COUNT(1) FROM inventory_codes WHERE product_id=? AND status='available'), updated_at=? WHERE id=?",
		)
			.bind(productId, now(), productId)
			.run();
	}

	async getCatalogOverview(): Promise<StorefrontCatalogResponse> {
		const [categories, products] = await Promise.all([
			this.listCategories(),
			this.listProducts({ activeOnly: false }),
		]);
		const nodes: StorefrontCategoryNode[] = categories
			.filter((category) => category.isActive)
			.map((category) => ({
				category,
				products: products.filter((product) => product.categoryId === category.id && product.stock > 0),
			}))
			.filter((node) => node.products.length > 0);
		return {
			generatedAt: now(),
			categories: nodes,
		};
	}
}
