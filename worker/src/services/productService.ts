import { and, asc, desc, eq, ne, or } from 'drizzle-orm';
import { createDb } from '../db';
import { categories, products } from '../db/schema';
import type { AppContext, ProductDetailPayload, SerializedProduct } from '@/types';

export type ProductRecord = typeof products.$inferSelect;
type InventoryPayload = { codes: string[] } | string[] | null;


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
