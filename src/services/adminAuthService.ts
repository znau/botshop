import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppContext, AdminAccount } from "../types";
import { AdminAccountSchema } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlEncode = (input: Uint8Array | ArrayBuffer) => {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	let binary = "";
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (value: string) => {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padLength = (4 - (normalized.length % 4)) % 4;
	const padded = normalized + "=".repeat(padLength);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

export type AdminSessionPayload = {
	username: string;
	exp: number;
	iat: number;
};

export class AdminSessionService {
	static COOKIE_NAME = "admin_session";
	static DEFAULT_TTL_SECONDS = 60 * 60 * 8;

	constructor(private readonly env: Env) {}

	private async importKey() {
		const secret = this.env.ADMIN_SESSION_SECRET;
		if (!secret) {
			throw new Error("ADMIN_SESSION_SECRET is missing");
		}
		return crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign", "verify"],
		);
	}

	async createToken(username: string, ttl = AdminSessionService.DEFAULT_TTL_SECONDS) {
		const now = Date.now();
		const payload: AdminSessionPayload = {
			username,
			iat: now,
			exp: now + ttl * 1000,
		};
		const payloadBytes = encoder.encode(JSON.stringify(payload));
		const payloadB64 = base64UrlEncode(payloadBytes);
		const signatureBytes = await crypto.subtle.sign("HMAC", await this.importKey(), encoder.encode(payloadB64));
		const signature = base64UrlEncode(signatureBytes);
		return `${payloadB64}.${signature}`;
	}

	async verifyToken(token: string | undefined | null): Promise<AdminSessionPayload | null> {
		if (!token) return null;
		const [payloadB64, signatureB64] = token.split(".");
		if (!payloadB64 || !signatureB64) return null;
		const key = await this.importKey();
		const isValid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlDecode(signatureB64),
			encoder.encode(payloadB64),
		);
		if (!isValid) return null;
		const payloadBytes = base64UrlDecode(payloadB64);
		const payload = JSON.parse(decoder.decode(payloadBytes)) as AdminSessionPayload;
		if (payload.exp < Date.now()) {
			return null;
		}
		return payload;
	}

	attachCookie(c: AppContext, token: string) {
		setCookie(c, AdminSessionService.COOKIE_NAME, token, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: AdminSessionService.DEFAULT_TTL_SECONDS,
		});
	}

	clearCookie(c: AppContext) {
		deleteCookie(c, AdminSessionService.COOKIE_NAME, { path: "/" });
	}

	getTokenFromRequest(c: AppContext) {
		return getCookie(c, AdminSessionService.COOKIE_NAME);
	}
}

export class AdminAuthService {
	constructor(private readonly env: Env) {}

	private keyFor(username: string) {
		return `admin:${username}`;
	}

	async getAccount(username: string): Promise<AdminAccount | null> {
		const raw = await this.env.BOTSHOP_KV.get(this.keyFor(username));
		if (!raw) return null;
		const parsed = AdminAccountSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	}

	private async hashPassword(password: string, salt?: string) {
		const saltValue = salt ?? crypto.randomUUID().replace(/-/g, "");
		const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${saltValue}:${password}`));
		return {
			salt: saltValue,
			hash: base64UrlEncode(buffer),
		};
	}

	async verifyCredentials(username: string, password: string) {
		const account = await this.getAccount(username);
		if (!account) return null;
		const hashed = await this.hashPassword(password, account.salt);
		return hashed.hash === account.passwordHash ? account : null;
	}

	async setPassword(username: string, password: string) {
		const hashed = await this.hashPassword(password);
		const now = new Date().toISOString();
		const account: AdminAccount = {
			username,
			passwordHash: hashed.hash,
			salt: hashed.salt,
			createdAt: now,
			updatedAt: now,
		};
		await this.env.BOTSHOP_KV.put(this.keyFor(username), JSON.stringify(account));
		return account;
	}
}