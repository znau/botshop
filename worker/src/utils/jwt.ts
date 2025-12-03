const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encodes binary data using base64url (RFC 7515) so it can safely live inside JWT parts.
 * @param input Raw binary buffer or TypedArray.
 */
const base64url = (input: ArrayBuffer | ArrayBufferView) => {
	const str = btoa(String.fromCharCode(...new Uint8Array(input)));
	return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

/**
 * Decodes a base64url string back into a Uint8Array buffer.
 * @param str Base64url encoded string.
 */
const base64urlDecode = (str: string) => {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	while (str.length % 4) str += '=';
	return Uint8Array.from(atob(str), c => c.charCodeAt(0));
};

const DEFAULT_TOKEN_TTL = 60 * 60 * 24;

const SCENE_SECRET_KEY = {
	user: 'JWT_USER_SECRET',
	admin: 'JWT_ADMIN_SECRET',
} as const;

export type JwtScene = keyof typeof SCENE_SECRET_KEY;
export type JwtOptions = {
	scene?: JwtScene;
	ttl?: number;
};

/**
 * Resolves the secret for the requested JWT scene from the worker bindings.
 * @param c Hono context providing env bindings.
 * @param scene Logical token scene (user/admin).
 */
const resolveSecret = (c, scene: JwtScene = 'user') => c.env[SCENE_SECRET_KEY[scene]];

const jwtUtils = {

	/**
	 * Generates an HMAC-SHA256 JWT for the given payload and scene.
	 * @param c Hono context used to access secrets.
	 * @param payload Custom claims to embed in the token.
	 * @param options Optional overrides for scene and TTL.
	 */
	async generateToken(c, payload, options: JwtOptions = {}) {
		const scene = options.scene ?? 'user';
		const ttl = options.ttl ?? DEFAULT_TOKEN_TTL;

		const secret = resolveSecret(c, scene);
		if (!secret) {
			throw new Error(`Secret for context "${scene}" not configured`);
		}
		const header = { 
			alg: 'HS256',
			typ: 'JWT'
		};

		const now = Math.floor(Date.now() / 1000);
		const exp = now + ttl;

		const fullPayload = {
			...payload,
			iat: now,
			...(exp ? { exp } : {})
		};

		const headerStr = base64url(encoder.encode(JSON.stringify(header)));
		const payloadStr = base64url(encoder.encode(JSON.stringify(fullPayload)));
		const data = `${headerStr}.${payloadStr}`;

		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
		const signatureStr = base64url(signature);

		return `${data}.${signatureStr}`;
	},

	/**
	 * Verifies a JWT signature/expiration and returns claims when valid.
	 * @param c Hono context used to access secrets.
	 * @param token Raw JWT string passed by the caller.
	 * @param options Optional scene override (defaults to user tokens).
	 */
	async verifyToken(c, token: string, options: JwtOptions = {}) {
		const scene = options.scene ?? 'user';
		const secret = resolveSecret(c, scene);
		if (!secret) {
			return null;
		}
		try {
			const [headerB64, payloadB64, signatureB64] = token.split('.');

			if (!headerB64 || !payloadB64 || !signatureB64) return null;

			const data = `${headerB64}.${payloadB64}`;
			const key = await crypto.subtle.importKey(
				'raw',
				encoder.encode(secret),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['verify']
			);

			const valid = await crypto.subtle.verify(
				'HMAC',
				key,
				base64urlDecode(signatureB64),
				encoder.encode(data)
			);

			if (!valid) return null;

			const payloadJson = decoder.decode(base64urlDecode(payloadB64));
			const payload = JSON.parse(payloadJson);

			const now = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < now) return null;

			return payload;

		} catch (err) {
			console.log(err)
			return null;
		}
	}
};

export default jwtUtils;
