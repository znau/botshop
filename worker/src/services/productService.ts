import { and, asc, desc, eq, ne, or, like, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { createDb } from '../db';
import { categories, products } from '../db/schema';
import type { AppContext, ProductDetailPayload, SerializedProduct } from '@/types';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';
import { CacheKey } from '../enum/cacheKey';

export type ProductRecord = typeof products.$inferSelect;
type InventoryPayload = { codes: string[] } | string[] | null;
export type AdminProductInput = {
    slug: string;
    categoryId: string;
    title: string;
    description?: string | null;
    mediaUrl?: string | null;
    priceMap: Record<string, number>;
    defaultCurrency: string;
    stock: number;
    deliveryMode: 'code' | 'text' | 'manual';
    deliveryInstructions?: string | null;
    sort?: number;
    isActive?: boolean;
};

export type AdminProductListOptions = {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
};


/**
 * Keeps product lookup, pricing helpers, and inventory storage in one place.
 */
export class ProductService {
    private readonly c: AppContext;
    private readonly db: ReturnType<typeof createDb>;

    constructor(c: AppContext) {
        this.c = c;
        this.db = createDb(c.env);
    }

    /**
     * Reads a product by id and ensures it is still marked active.
     * @param productId Product identifier.
     * @returns Active product row or null.
     */
    async findActiveProduct(productId: string) {
        const [product] = await this.db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);
        if (!product || !product.isActive) {
            return null;
        }
        return product;
    }

    /**
     * Attempts to read the optional per-product attachment stored in R2.
     * @param productId Product identifier.
     * @returns Attachment text or null when missing.
     */
    async loadProductAttachment(productId: string) {
        try {
            const objectKey = `products/${productId}/readme.txt`;
            const object = await this.c.env.BOTSHOP_BUCKET.get(objectKey);
            if (!object) return null;
            const text = await object.text();
            return text.slice(0, 500);
        } catch (error) {
            console.warn('loadProductAttachment failed', error);
            return null;
        }
    }

    /**
     * Pops a single code from KV-managed inventory, returning null when depleted.
     * @param productId Product identifier.
     * @returns Code string or null.
     */
    async popInventoryCode(productId: string) {
        const key = `inventory:${productId}`;
        const payload = (await this.c.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes;
        if (!codes || !codes.length) {
            return null;
        }
        const code = codes.shift() ?? null;
        await this.c.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
        return code;
    }

    /**
     * Pushes a previously reserved code back into inventory for reuse.
     * @param productId Product identifier.
     * @param code Code to re-insert.
     */
    async pushInventoryCode(productId: string, code: string) {
        const key = `inventory:${productId}`;
        const payload = (await this.c.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes ?? [];
        codes.unshift(code);
        await this.c.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
    }

    /**
     * Fetches detailed product information along with related products.
     * @param productId 
     * @returns 
     */
    async getProductDetail(productId: string): Promise<ProductDetailPayload | null> {
        const [detail] = await this.db
            .select({ product: products, category: categories })
            .from(products)
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(
                and(
                    eq(products.isActive, 1),
                    or(eq(products.id, productId), eq(products.slug, productId)),
                ),
            )
            .limit(1);
        if (!detail) {
            return null;
        }
        const attachment = await this.loadProductAttachment(detail.product.id);

        const related = await this.db
            .select()
            .from(products)
            .where(
                and(
                    eq(products.categoryId, detail.product.categoryId),
                    eq(products.isActive, 1),
                    ne(products.id, detail.product.id),
                ),
            )
            .orderBy(desc(products.createdAt))
            .limit(4);

        return {
            product: {
                ...serializeProduct(detail.product),
                category: {
                    id: detail.category.id,
                    name: detail.category.name,
                    emoji: detail.category.emoji,
                },
                attachment,
            },
            related: related.map((item) => serializeProduct(item)),
        };
    }

    async findProductById(productId: string) {
        const [record] = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);
        return record ?? null;
    }

    async listProductsForAdmin(options: AdminProductListOptions = {}) {
        const page = Math.max(1, options.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
        const filters: SQL[] = [];
        if (options.categoryId) {
            filters.push(eq(products.categoryId, options.categoryId));
        }
        if (typeof options.isActive === 'boolean') {
            filters.push(eq(products.isActive, options.isActive ? 1 : 0));
        }
        if (options.search) {
            const keyword = `%${options.search.trim()}%`;
            filters.push(or(like(products.title, keyword), like(products.slug, keyword)));
        }
        const whereExpr = filters.length ? and(...filters) : undefined;

        let countQuery = this.db.select({ count: sql<number>`count(*)` }).from(products);
        if (whereExpr) {
            countQuery = countQuery.where(whereExpr);
        }
        const [countRow] = await countQuery;

        let listQuery = this.db
            .select({ product: products, category: categories })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .orderBy(desc(products.updatedAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);
        if (whereExpr) {
            listQuery = listQuery.where(whereExpr);
        }
        const rows = await listQuery;
        return {
            page,
            pageSize,
            total: countRow?.count ?? 0,
            items: rows.map((row) => ({
                ...serializeProduct(row.product),
                isActive: row.product.isActive === 1,
                category: row.category ? { id: row.category.id, name: row.category.name } : null,
            })),
        };
    }

    async createProduct(input: AdminProductInput) {
        await this.ensureCategoryExists(input.categoryId);
        await this.assertSlugUnique(input.slug);
        const payload = this.stringifyPriceMap(input.priceMap, input.defaultCurrency);
        const now = dayjs().toISOString();
        const id = uuidv4();
        await this.db.insert(products).values({
            id,
            slug: input.slug.trim(),
            categoryId: input.categoryId,
            title: input.title,
            description: input.description ?? null,
            mediaUrl: input.mediaUrl ?? null,
            price: payload,
            defaultCurrency: input.defaultCurrency.toUpperCase(),
            stock: input.stock,
            deliveryMode: input.deliveryMode,
            deliveryInstructions: input.deliveryInstructions ?? null,
            sort: input.sort ?? 0,
            isActive: input.isActive === false ? 0 : 1,
            createdAt: now,
            updatedAt: now,
        });
        await this.invalidateCatalogCache(input.categoryId);
        return this.findProductById(id);
    }

    async updateProduct(productId: string, input: Partial<AdminProductInput>) {
        const existing = await this.findProductById(productId);
        if (!existing) {
            throw new BizError('商品不存在', ApiCode.NOT_FOUND);
        }
        if (input.slug && input.slug.trim() !== existing.slug) {
            await this.assertSlugUnique(input.slug);
        }
        const targetCategory = input.categoryId ?? existing.categoryId;
        await this.ensureCategoryExists(targetCategory);
        const defaultCurrency = (input.defaultCurrency ?? existing.defaultCurrency).toUpperCase();
        const pricePayload = input.priceMap
            ? this.stringifyPriceMap(input.priceMap, defaultCurrency)
            : existing.price;
        const now = dayjs().toISOString();
        await this.db
            .update(products)
            .set({
                slug: input.slug ? input.slug.trim() : existing.slug,
                categoryId: targetCategory,
                title: input.title ?? existing.title,
                description: input.description ?? existing.description,
                mediaUrl: input.mediaUrl ?? existing.mediaUrl,
                price: pricePayload,
                defaultCurrency,
                stock: input.stock ?? existing.stock,
                deliveryMode: input.deliveryMode ?? existing.deliveryMode,
                deliveryInstructions: input.deliveryInstructions ?? existing.deliveryInstructions,
                sort: input.sort ?? existing.sort,
                isActive: input.isActive === undefined ? existing.isActive : input.isActive ? 1 : 0,
                updatedAt: now,
            })
            .where(eq(products.id, productId));
        await this.invalidateCatalogCache(targetCategory);
        return this.findProductById(productId);
    }

    async toggleProductStatus(productId: string, isActive: boolean) {
        const existing = await this.findProductById(productId);
        if (!existing) {
            throw new BizError('商品不存在', ApiCode.NOT_FOUND);
        }
        await this.db
            .update(products)
            .set({ isActive: isActive ? 1 : 0, updatedAt: dayjs().toISOString() })
            .where(eq(products.id, productId));
        await this.invalidateCatalogCache(existing.categoryId);
        return this.findProductById(productId);
    }

    private async assertSlugUnique(slug: string, ignoreId?: string) {
        const normalized = slug.trim();
        const [record] = await this.db.select().from(products).where(eq(products.slug, normalized)).limit(1);
        if (record && record.id !== ignoreId) {
            throw new BizError('Slug 已存在，请更换', ApiCode.CONFLICT);
        }
    }

    private stringifyPriceMap(priceMap: Record<string, number>, defaultCurrency: string) {
        const normalized = Object.entries(priceMap).reduce<Record<string, number>>((acc, [currency, value]) => {
            const amount = Number(value);
            if (!Number.isFinite(amount)) {
                return acc;
            }
            acc[currency.toUpperCase()] = Number(amount.toFixed(2));
            return acc;
        }, {});
        if (!Object.keys(normalized).length) {
            throw new BizError('至少设置一种币种价格', ApiCode.BAD_REQUEST);
        }
        const normalizedDefault = defaultCurrency.toUpperCase();
        if (!normalized[normalizedDefault]) {
            throw new BizError('默认币种必须设置价格', ApiCode.BAD_REQUEST);
        }
        return JSON.stringify(normalized);
    }

    private async ensureCategoryExists(categoryId: string) {
        const [record] = await this.db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.id, categoryId))
            .limit(1);
        if (!record) {
            throw new BizError('分类不存在', ApiCode.NOT_FOUND);
        }
    }

    private async invalidateCatalogCache(categoryId: string) {
        const kv = this.c.env.BOTSHOP_KV;
        if (!kv) {
            return;
        }
        try {
            await kv.delete(CacheKey.CATALOG_CATEGORIES);
            await kv.delete(CacheKey.catalogCategory(categoryId));
        } catch (error) {
            console.warn('product cache invalidation failed', error);
        }
    }
}


/**
 * Parses legacy price JSON blobs into a normalized currency map.
 * @param raw Stored JSON string/number.
 * @param fallbackCurrency Currency used when map lacks data.
 * @returns Normalized currency->amount map.
 */
export const parsePriceMap = (raw: string, fallbackCurrency: string) => {
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'number') {
            return { [fallbackCurrency]: parsed } as Record<string, number>;
        }
        if (typeof parsed === 'object' && parsed) {
            const entries = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                const num = Number(value);
                if (!Number.isNaN(num)) acc[key] = num;
                return acc;
            }, {});
            if (Object.keys(entries).length) {
                return entries;
            }
        }
    } catch (error) {
        console.warn('price parse failed', error);
    }
    const fallbackValue = Number(raw);
    return { [fallbackCurrency]: Number.isFinite(fallbackValue) ? fallbackValue : 0 };
}

/**
 * Serializes a product row into API-friendly format.
 * @param product 
 * @returns 
 */
export const serializeProduct = (product: ProductRecord): SerializedProduct => {
    const priceMap = parsePriceMap(product.price, product.defaultCurrency);
    return {
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        mediaUrl: product.mediaUrl,
        priceMap,
        priceLabel: formatPriceLabel(product),
        defaultCurrency: product.defaultCurrency,
        stock: product.stock,
        deliveryMode: product.deliveryMode,
        deliveryInstructions: product.deliveryInstructions,
        sort: product.sort,
        updatedAt: product.updatedAt,
    };
}

/**
 * Formats a user-facing price label in the default currency.
 * @param product Product row with price payload.
 * @returns String label like "USD 10.00".
 */
export const formatPriceLabel = (product: ProductRecord) => {
    const priceMap = parsePriceMap(product.price, product.defaultCurrency);
    const amount = priceMap[product.defaultCurrency] ?? Number(Object.values(priceMap)[0] ?? 0);
    return `${product.defaultCurrency} ${amount.toFixed(2)}`;
}
