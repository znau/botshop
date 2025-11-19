import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { CatalogService } from "../../services/catalogService";

export class StoreCatalogRoute extends OpenAPIRoute {
	schema = {
		tags: ["Storefront"],
		summary: "List active categories and products",
		responses: {
			"200": {
				description: "Return active categories with their in-stock products",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							catalog: z.object({
								generatedAt: z.string(),
								categories: z
									.array(
										z.object({
											category: z.object({
												id: z.string(),
												name: z.string(),
												description: z.string().nullable().optional(),
												emoji: z.string().nullable().optional(),
												sortOrder: z.number().int(),
												isActive: z.boolean(),
												createdAt: z.string(),
												updatedAt: z.string(),
											}),
											products: z.array(
												z.object({
													id: z.string(),
													slug: z.string(),
													title: z.string(),
													description: z.string().nullable().optional(),
													mediaUrl: z.string().nullable().optional(),
													priceMap: z.record(z.string(), z.number()),
													defaultCurrency: z.string(),
													acceptedCurrencies: z.array(z.string()),
													stock: z.number().int(),
													deliveryMode: z.string(),
													deliveryInstructions: z.string().nullable().optional(),
													createdAt: z.string(),
													updatedAt: z.string(),
												}),
											),
										}),
									)
									.default([]),
							}),
						}),
					},
				},
			},
		},
	};

	async handle(c) {
		const catalogService = new CatalogService(c.env);
		const catalog = await catalogService.getCatalogOverview();
		return {
			success: true,
			catalog,
		};
	}
}
