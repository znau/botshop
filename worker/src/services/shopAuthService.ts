import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { userRegisters, users } from '../db/schema';
import BizError from '../utils/bizError';
import type { AppContext, ShopProfileView, TelegramUserPayload } from '@/types';
import { UserService, type LanguageCode } from './userService';
import { hashPassword } from '../utils/common';
import { sourceEnum } from '@/enum/user';
import { ApiCode } from '../enum/apiCodes';

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
	Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

const TELEGRAM_INITDATA_MAX_AGE = 60 * 60; // 1 hour

export type ShopUserProfile = {
	user: typeof users.$inferSelect;
	register: typeof userRegisters.$inferSelect;
};

export type AccountLoginInput = {
	username: string;
	password: string;
	loginIp?: string;
	language?: LanguageCode;
};

export type AccountRegistrationInput = {
	username: string;
	password: string;
	nickname?: string;
	language?: string;
	registerIp?: string;
};

/**
 * Provides storefront authentication flows (password login, registration, Telegram auth).
 */
export class ShopAuthService {
	private readonly c: AppContext;
	private readonly db: ReturnType<typeof createDb>;
	private readonly userService: UserService;

	constructor(c: AppContext) {
		this.c = c;
		this.db = createDb(c.env);
		this.userService = new UserService(c);
	}

	/**
	 * Validates username/password credentials and returns the joined profile when correct.
	 */
	async accountLogin(input: AccountLoginInput): Promise<ShopUserProfile | null> {
		const normalized = input.username.trim().toLowerCase();
		const record = await this.fetchProfileByUsername(normalized);
		if (!record) {
			return null;
		}
		const hashed = await hashPassword(input.password, record.register.salt);
		if (hashed !== record.register.password) {
			return null;
		}
		return record;
	}

	/**
	 * Creates a new account-based user and eagerly loads the resulting profile.
	 */
	async accountRegister(input: AccountRegistrationInput): Promise<ShopUserProfile> {
		const credentials = await this.userService.getOrCreateUser({
			source: sourceEnum.ACCOUNT,
			username: input.username,
			password: input.password,
			nickname: input.nickname,
			language: input.language,
			registerIp: input.registerIp,
		});
		const record = await this.fetchProfileByUid(credentials.uid);
		if (!record) {
			throw new BizError('注册失败，请重试', ApiCode.INTERNAL_ERROR);
		}
		return record;
	}

	/**
	 * Verifies Telegram init data and returns the associated profile, creating it if needed.
	 */
	async loginWithTelegram(initData: string): Promise<ShopUserProfile> {
		const telegramUser = await this.parseTelegramInitData(initData);
		const credentials = await this.userService.getOrCreateUser({
			source: sourceEnum.TELEGRAM,
			profile: telegramUser,
		});
		const profile = await this.fetchProfileByUid(credentials.uid);
		if (!profile) {
			throw new BizError('用户不存在', ApiCode.NOT_FOUND);
		}
		return profile;
	}

	/**
	 * Fetches a combined user/register profile by user id.
	 */
	async fetchProfileByUid(uid: string): Promise<ShopUserProfile | null> {
		const [record] = await this.db
			.select({ register: userRegisters, user: users })
			.from(userRegisters)
			.innerJoin(users, eq(userRegisters.uid, users.id))
			.where(eq(userRegisters.uid, uid))
			.limit(1);
		return record ?? null;
	}

	/**
	 * Looks up a profile by normalized username for password logins.
	 */
	private async fetchProfileByUsername(username: string): Promise<ShopUserProfile | null> {
		const [record] = await this.db
			.select({ register: userRegisters, user: users })
			.from(userRegisters)
			.innerJoin(users, eq(userRegisters.uid, users.id))
			.where(eq(userRegisters.username, username))
			.limit(1);
		return record ?? null;
	}

	/**
	 * Parses and validates Telegram WebApp init data payloads.
	 */
	private async parseTelegramInitData(initData: string): Promise<TelegramUserPayload> {
		const botToken = this.c.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			throw new BizError('未配置 Telegram 机器人密钥', ApiCode.DEPENDENCY_MISSING);
		}
		const params = new URLSearchParams(initData);
		const fields: Record<string, string> = {};
		params.forEach((value, key) => {
			fields[key] = value;
		});
		const hash = fields.hash;
		if (!hash) {
			throw new BizError('缺少 Telegram 签名', ApiCode.BAD_REQUEST);
		}
		const authDate = Number(fields.auth_date ?? '0');
		if (!authDate || Date.now() / 1000 - authDate > TELEGRAM_INITDATA_MAX_AGE) {
			throw new BizError('Telegram 登录已过期', ApiCode.TELEGRAM_TOKEN_EXPIRED);
		}
		const dataCheckString = Object.keys(fields)
			.filter((key) => key !== 'hash')
			.sort()
			.map((key) => `${key}=${fields[key]}`)
			.join('\n');
		const expectedHash = await this.computeTelegramHash(botToken, dataCheckString);
		if (expectedHash !== hash.toLowerCase()) {
			throw new BizError('Telegram 签名验证失败', ApiCode.TELEGRAM_SIGNATURE_INVALID);
		}
		const rawUser = fields.user ? JSON.parse(fields.user) : null;
		if (!rawUser || typeof rawUser.id !== 'number') {
			throw new BizError('无法读取 Telegram 用户信息', ApiCode.BAD_REQUEST);
		}
		return rawUser as TelegramUserPayload;
	}

	/**
	 * Computes the expected Telegram hash using the two-stage HMAC flow.
	 */
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

export const serializeProfile = (profile: ShopUserProfile): ShopProfileView => ({
	id: profile.user.id,
	nickname: profile.user.nickname,
	username: profile.register.username,
	avatar: profile.user.avatar,
	language: profile.register.language,
});