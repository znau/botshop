import { and, asc, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { createDb } from '../db';
import { categories, products } from '../db/schema';
import { CacheKey } from '../enum/cacheKey';
import { KvCache } from '../utils/cache';
import type { AppContext, CatalogNode, CatalogPayload } from '@/types';
import { ProductService, serializeProduct } from './productService';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';

export type CategoryRecord = typeof categories.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type CategoryWithProducts = { category: CategoryRecord; products: ProductRecord[] };
export type AdminCategoryInput = {
    name: string;
    description?: string | null;
    emoji?: string | null;
    parentId?: string | null;
    sort?: number;
    isActive?: boolean;
};

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

    async listAllCategoriesFlat() {
        return this.db
            .select()
            .from(categories)
            .orderBy(asc(categories.sort), asc(categories.createdAt));
    }

    async getCategoryById(categoryId: string) {
        const [record] = await this.db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
        return record ?? null;
    }

    async createCategory(input: AdminCategoryInput) {
        const now = dayjs().toISOString();
        const id = uuidv4();
        await this.db.insert(categories).values({
            id,
            name: input.name,
            description: input.description ?? null,
            emoji: input.emoji ?? null,
            parentId: input.parentId ?? null,
            sort: input.sort ?? 0,
            isActive: input.isActive === false ? 0 : 1,
            createdAt: now,
            updatedAt: now,
        });
        await this.invalidateCatalogCache();
        return this.getCategoryById(id);
    }

    async updateCategory(categoryId: string, input: Partial<AdminCategoryInput>) {
        const existing = await this.getCategoryById(categoryId);
        if (!existing) {
            throw new BizError('分类不存在', ApiCode.NOT_FOUND);
        }
        const now = dayjs().toISOString();
        await this.db
            .update(categories)
            .set({
                name: input.name ?? existing.name,
                description: input.description ?? existing.description,
                emoji: input.emoji ?? existing.emoji,
                parentId: input.parentId ?? existing.parentId,
                sort: input.sort ?? existing.sort,
                isActive: input.isActive === undefined ? existing.isActive : input.isActive ? 1 : 0,
                updatedAt: now,
            })
            .where(eq(categories.id, categoryId));
        await this.invalidateCatalogCache(categoryId);
        return this.getCategoryById(categoryId);
    }

    async deleteCategory(categoryId: string) {
        const existing = await this.getCategoryById(categoryId);
        if (!existing) {
            throw new BizError('分类不存在', ApiCode.NOT_FOUND);
        }
        const [child] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(categories)
            .where(eq(categories.parentId, categoryId));
        if ((child?.count ?? 0) > 0) {
            throw new BizError('请先删除子分类', ApiCode.CONFLICT);
        }
        await this.db.delete(categories).where(eq(categories.id, categoryId));
        await this.invalidateCatalogCache(categoryId);
    }

    private async invalidateCatalogCache(categoryId?: string) {
        const kv = this.c.env.BOTSHOP_KV;
        if (!kv) {
            return;
        }
        try {
            await kv.delete(CacheKey.CATALOG_CATEGORIES);
            if (categoryId) {
                await kv.delete(CacheKey.catalogCategory(categoryId));
            }
        } catch (error) {
            console.warn('catalog cache invalidation failed', error);
        }
    }

}
