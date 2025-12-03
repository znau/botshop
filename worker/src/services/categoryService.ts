import { and, asc, desc, eq } from 'drizzle-orm';
import { createDb } from '../db';
import { categories, products } from '../db/schema';
import { CacheKey } from '../enum/cacheKey';
import { KvCache } from '../utils/cache';
import type { AppContext, CatalogNode, CatalogPayload } from '@/types';
import { ProductService, serializeProduct } from './productService';

export type CategoryRecord = typeof categories.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type CategoryWithProducts = { category: CategoryRecord; products: ProductRecord[] };

/**
 * Centralizes category/catalog reads and keeps a KV cache in sync with the database.
 */
export class CategoryService {
    private readonly c: AppContext;
    private readonly db: ReturnType<typeof createDb>;
    private readonly cache: KvCache;
    private readonly productService: ProductService;

    /**
     * @param env Cloudflare bindings used for KV access.
     * @param db Drizzle instance targeting the BOTSHOP database.
     */
    constructor(c: AppContext) {
        this.c = c;
        this.db = createDb(c.env);
        this.cache = new KvCache(c.env.BOTSHOP_KV);
        this.productService = new ProductService(c);
    }

    /**
     * Returns all active categories ordered for storefront menus.
     * @returns Promise resolving to the active category list.
     */
    async getActiveCategories() {
        return this.cache.withCache<CategoryRecord[]>(
            CacheKey.CATALOG_CATEGORIES,
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
     *  Builds and returns the full catalog tree with active categories and products.
     * @returns 
     */
    async getCatalog(): Promise<CatalogPayload> {
        const [categoriesList, productRows] = await Promise.all([
            this.getActiveCategories(),
            this.db
                .select()
                .from(products)
                .where(eq(products.isActive, 1))
                .orderBy(asc(products.sort), desc(products.createdAt)),
        ]);
        return {
            generatedAt: new Date().toISOString(),
            categories: this.buildCatalogTree(categoriesList, productRows),
        };
    }



    /**
     * Loads a category with its active products, caching both structure and content.
     * @param categoryId Category id to load.
     * @returns Promise carrying the combined category/products payload or null.
     */
    async getCategoryWithProducts(categoryId: string) {
        return this.cache.withCache<CategoryWithProducts | null>(
            CacheKey.catalogCategory(categoryId),
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

    /**
     * 
     * @param categoriesList 
     * @param productRows 
     * @returns 
     */
    private buildCatalogTree(categoriesList: CategoryRecord[], productRows: ProductRecord[]): CatalogNode[] {
        const byParent = new Map<string | null, CategoryRecord[]>();
        const productsByCategory = new Map<string, ProductRecord[]>();

        for (const category of categoriesList) {
            const key = category.parentId ?? null;
            if (!byParent.has(key)) {
                byParent.set(key, []);
            }
            byParent.get(key)!.push(category);
        }

        for (const product of productRows) {
            const list = productsByCategory.get(product.categoryId) ?? [];
            list.push(product);
            productsByCategory.set(product.categoryId, list);
        }

        const roots = byParent.get(null) ?? [];
        const buildNode = (category: CategoryRecord): CatalogNode => {
            const children = byParent.get(category.id) ?? [];
            return {
                id: category.id,
                name: category.name,
                description: category.description,
                emoji: category.emoji,
                parentId: category.parentId,
                sort: category.sort,
                products: (productsByCategory.get(category.id) ?? []).map((item) =>  serializeProduct(item)),
                children: children.map(buildNode),
            };
        };
        return roots.map(buildNode);
    }

}
