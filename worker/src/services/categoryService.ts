import { and, asc, desc, eq } from 'drizzle-orm';
import type { createDb } from '../db';
import { categories, products } from '../db/schema';
import { KvCache } from '../utils/cache';

export type CategoryRecord = typeof categories.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type CategoryWithProducts = { category: CategoryRecord; products: ProductRecord[] };

/**
 * Centralizes category/catalog reads and keeps a KV cache in sync with the database.
 */
export class CategoryService {
    private readonly cache: KvCache;

    /**
     * @param env Cloudflare bindings used for KV access.
     * @param db Drizzle instance targeting the BOTSHOP database.
     */
    constructor(env: Env, private readonly db: ReturnType<typeof createDb>, cache?: KvCache) {
        this.cache = cache ?? new KvCache(env.BOTSHOP_KV);
    }

    /**
     * Returns all active categories ordered for storefront menus.
     * @returns Promise resolving to the active category list.
     */
    async getActiveCategories() {
        return this.cache.withCache<CategoryRecord[]>(
            'catalog:categories',
            async () =>
                this.db
                    .select()
                    .from(categories)
                    .where(eq(categories.isActive, 1))
                    .orderBy(asc(categories.sort)),
            300,
        );
    }

    /**
     * Loads a category with its active products, caching both structure and content.
     * @param categoryId Category id to load.
     * @returns Promise carrying the combined category/products payload or null.
     */
    async getCategoryWithProducts(categoryId: string) {
        return this.cache.withCache<CategoryWithProducts | null>(
            `catalog:category:${categoryId}`,
            async () => {
                const [category] = await this.db
                    .select()
                    .from(categories)
                    .where(eq(categories.id, categoryId))
                    .limit(1);

                if (!category) {
                    return null;
                }

                const list = await this.db
                    .select()
                    .from(products)
                    .where(and(eq(products.categoryId, categoryId), eq(products.isActive, 1)))
                    .orderBy(asc(products.sort), desc(products.createdAt));

                return { category, products: list } satisfies CategoryWithProducts;
            },
            120,
        );
    }

}
