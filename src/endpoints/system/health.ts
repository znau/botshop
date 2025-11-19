import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class HealthCheckRoute extends OpenAPIRoute {
	schema = {
		tags: ["System"],
		summary: "Health probe",
		responses: {
			"200": {
				description: "Returns the worker health status",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							env: z.string(),
							timestamp: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c) {
		return {
			success: true,
			env: c.env.BASE_URL ?? "unset",
			timestamp: new Date().toISOString(),
		};
	}
}
