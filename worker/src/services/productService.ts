import { eq } from 'drizzle-orm';
import type { createDb } from '../db';
import { products } from '../db/schema';

export type ProductRecord = typeof products.$inferSelect;
type InventoryPayload = { codes: string[] } | string[] | null;

/**
 * Keeps product lookup, pricing helpers, and inventory storage in one place.
 */
export class ProductService {
    /**
     * @param env Cloudflare bindings (R2 + KV).
     * @param db Drizzle instance targeting products.
     */
    constructor(private readonly env: Env, private readonly db: ReturnType<typeof createDb>) {}

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
     * Parses legacy price JSON blobs into a normalized currency map.
     * @param raw Stored JSON string/number.
     * @param fallbackCurrency Currency used when map lacks data.
     * @returns Normalized currency->amount map.
     */
    parsePriceMap(raw: string, fallbackCurrency: string) {
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
     * Formats a user-facing price label in the default currency.
     * @param product Product row with price payload.
     * @returns String label like "USD 10.00".
     */
    formatPriceLabel(product: ProductRecord) {
        const priceMap = this.parsePriceMap(product.price, product.defaultCurrency);
        const amount = priceMap[product.defaultCurrency] ?? Number(Object.values(priceMap)[0] ?? 0);
        return `${product.defaultCurrency} ${amount.toFixed(2)}`;
    }

    /**
     * Attempts to read the optional per-product attachment stored in R2.
     * @param productId Product identifier.
     * @returns Attachment text or null when missing.
     */
    async loadProductAttachment(productId: string) {
        try {
            const objectKey = `products/${productId}/readme.txt`;
            const object = await this.env.BOTSHOP_BUCKET.get(objectKey);
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
        const payload = (await this.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes;
        if (!codes || !codes.length) {
            return null;
        }
        const code = codes.shift() ?? null;
        await this.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
        return code;
    }

    /**
     * Pushes a previously reserved code back into inventory for reuse.
     * @param productId Product identifier.
     * @param code Code to re-insert.
     */
    async pushInventoryCode(productId: string, code: string) {
        const key = `inventory:${productId}`;
        const payload = (await this.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes ?? [];
        codes.unshift(code);
        await this.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
    }
}
