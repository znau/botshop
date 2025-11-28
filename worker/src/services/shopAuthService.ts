import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { userRegisters, users } from '../db/schema';
import BizError from '../utils/bizError';
import type { TelegramUserPayload } from '../types';
import { UserService, type LanguageCode } from './userService';
import { hashPassword } from '../utils/common';

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
	Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

const TELEGRAM_INITDATA_MAX_AGE = 60 * 60; // 1 hour

export type ShopUserProfile = {
	user: typeof users.$inferSelect;
	register: typeof userRegisters.$inferSelect;
};

export type AccountRegistrationInput = {
	username: string;
	password: string;
	nickname?: string;
	language?: LanguageCode;
	registerIp?: string;
};

export class ShopAuthService {
	private readonly db: ReturnType<typeof createDb>;
	private readonly userService: UserService;

	constructor(private readonly env: Env, db?: ReturnType<typeof createDb>) {
		this.db = db ?? createDb(env);
		this.userService = new UserService(this.db);
	}

	async verifyPasswordLogin(username: string, password: string): Promise<ShopUserProfile | null> {
		const normalized = username.trim().toLowerCase();
		const record = await this.fetchProfileByUsername(normalized);
		if (!record) {
			return null;
		}
		const hashed = await hashPassword(password, record.register.salt);
		if (hashed !== record.register.password) {
			return null;
		}
		return record;
	}

	async registerAccount(input: AccountRegistrationInput): Promise<ShopUserProfile> {
		const credentials = await this.userService.getOrCreateUser({
			source: 'account',
			username: input.username,
			password: input.password,
			nickname: input.nickname,
			language: input.language,
			registerIp: input.registerIp,
		});
		const profile = await this.fetchProfileByUid(credentials.userId);
		if (!profile) {
			throw new BizError('注册失败，请重试', 500);
		}
		return profile;
	}

	async loginWithTelegram(initData: string): Promise<ShopUserProfile> {
		const telegramUser = await this.parseTelegramInitData(initData);
		const credentials = await this.userService.getOrCreateUser({
			source: 'telegram',
			profile: telegramUser,
		});
		const profile = await this.fetchProfileByUid(credentials.userId);
		if (!profile) {
			throw new BizError('用户不存在', 404);
		}
		return profile;
	}

	async fetchProfileByUid(uid: string): Promise<ShopUserProfile | null> {
		const [record] = await this.db
			.select({ register: userRegisters, user: users })
			.from(userRegisters)
			.innerJoin(users, eq(userRegisters.uid, users.id))
			.where(eq(userRegisters.uid, uid))
			.limit(1);
		return record ?? null;
	}

	private async fetchProfileByUsername(username: string): Promise<ShopUserProfile | null> {
		const [record] = await this.db
			.select({ register: userRegisters, user: users })
			.from(userRegisters)
			.innerJoin(users, eq(userRegisters.uid, users.id))
			.where(eq(userRegisters.username, username))
			.limit(1);
		return record ?? null;
	}

	private async parseTelegramInitData(initData: string): Promise<TelegramUserPayload> {
		const botToken = this.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			throw new BizError('未配置 Telegram 机器人密钥', 500);
		}
		const params = new URLSearchParams(initData);
		const fields: Record<string, string> = {};
		params.forEach((value, key) => {
			fields[key] = value;
		});
		const hash = fields.hash;
		if (!hash) {
			throw new BizError('缺少 Telegram 签名', 400);
		}
		const authDate = Number(fields.auth_date ?? '0');
		if (!authDate || Date.now() / 1000 - authDate > TELEGRAM_INITDATA_MAX_AGE) {
			throw new BizError('Telegram 登录已过期', 401);
		}
		const dataCheckString = Object.keys(fields)
			.filter((key) => key !== 'hash')
			.sort()
			.map((key) => `${key}=${fields[key]}`)
			.join('\n');
		const expectedHash = await this.computeTelegramHash(botToken, dataCheckString);
		if (expectedHash !== hash.toLowerCase()) {
			throw new BizError('Telegram 签名验证失败', 401);
		}
		const rawUser = fields.user ? JSON.parse(fields.user) : null;
		if (!rawUser || typeof rawUser.id !== 'number') {
			throw new BizError('无法读取 Telegram 用户信息', 400);
		}
		return rawUser as TelegramUserPayload;
	}

	private async computeTelegramHash(botToken: string, dataCheckString: string) {
		const keyForSecret = await crypto.subtle.importKey(
			'raw',
			encoder.encode(botToken),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const secretBuffer = await crypto.subtle.sign('HMAC', keyForSecret, encoder.encode('WebAppData'));
		const secretKey = await crypto.subtle.importKey(
			'raw',
			secretBuffer,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
		return toHex(signature).toLowerCase();
	}
}
