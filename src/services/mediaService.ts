export type UploadOptions = {
	productId?: string;
};

export type UploadedAsset = {
	key: string;
	url: string;
	size: number;
	contentType: string;
};

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "");

export class MediaService {
	constructor(private readonly env: Env) {}

	private ensureBucket() {
		if (!this.env.BOTSHOP_BUCKET) {
			throw new Error("BOTSHOP_BUCKET binding is missing");
		}
		return this.env.BOTSHOP_BUCKET;
	}

	private buildKey(filename: string, options?: UploadOptions) {
		const safeName = sanitizeFilename(filename) || "asset";
		const prefix = options?.productId ? `products/${options.productId}` : "uploads";
		return `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
	}

	private buildPublicUrl(key: string) {
		return this.env.MEDIA_PUBLIC_BASE ? `${this.env.MEDIA_PUBLIC_BASE.replace(/\/$/, "")}/${key}` : `/media/${key}`;
	}

	async uploadProductAsset(file: File, options?: UploadOptions): Promise<UploadedAsset> {
		const bucket = this.ensureBucket();
		const key = this.buildKey(file.name, options);
		const arrayBuffer = await file.arrayBuffer();
		const contentType = file.type || "application/octet-stream";
		await bucket.put(key, arrayBuffer, {
			httpMetadata: { contentType },
		});
		return {
			key,
			url: this.buildPublicUrl(key),
			size: file.size,
			contentType,
		};
	}

	async getObject(key: string) {
		return this.ensureBucket().get(key);
	}
}
