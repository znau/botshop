export const CacheKey = {
	CATALOG_CATEGORIES: 'catalog:categories',
	catalogCategory: (categoryId: string) => `catalog:category:${categoryId}`,
} as const;
