type CacheEnvelope<T> = { payload: T; expiredAt: number };
const DEFAULT_CACHE_TTL = 60;

/**
 * Minimal KV-backed cache helper that stores JSON envelopes with TTL metadata.
 */
export class KvCache {
    constructor(private readonly kv: KVNamespace | undefined, private readonly defaultTtlSeconds = DEFAULT_CACHE_TTL) {}

    /**
     * Reads/writes JSON blobs from KV with a simple TTL-backed envelope.
     * @param key KV key to read/write.
     * @param loader Loader invoked when cache miss occurs.
     * @param ttlSeconds Cache lifetime in seconds.
     * @returns Value from cache or loader.
     */
    async withCache<T>(key: string, loader: () => Promise<T>, ttlSeconds = this.defaultTtlSeconds) {
        if (!this.kv) {
            return loader();
        }

        const now = Date.now();

        try {
            const cached = (await this.kv.get(key, { type: 'json' })) as CacheEnvelope<T> | null;
            if (cached && cached.expiredAt > now) {
                return cached.payload;
            }
        } catch (error) {
            console.warn(`cache read failed: ${key}`, error);
        }

        const payload = await loader();

        if (payload !== undefined) {
            const envelope: CacheEnvelope<T> = { payload, expiredAt: now + ttlSeconds * 1000 };
            try {
                await this.kv.put(key, JSON.stringify(envelope), { expirationTtl: ttlSeconds });
            } catch (error) {
                console.warn(`cache write failed: ${key}`, error);
            }
        }

        return payload;
    }
}
