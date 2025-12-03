import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { userRegisters, users } from '../db/schema';
import type { AppContext, TelegramUserPayload } from '../types';
import type { SupportedLanguage } from '../i18n/i18n';
import { generatePassword, generateSalt, hashPassword } from '../utils/common';
import BizError from '../utils/bizError';
import { ApiCode } from '../enum/apiCodes';
import { sourceEnum, userNamePrefixEnum } from '@/enum/user';

export type LanguageCode = SupportedLanguage;
export const LANGUAGE_CODES = ['zh', 'en'] as const satisfies ReadonlyArray<LanguageCode>;
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export type UserProfile = {
    register: typeof userRegisters.$inferSelect;
    user: typeof users.$inferSelect;
};

export type UserCredentials = {
    uid: string;
    username: string;
    language: LanguageCode;
    isNew: boolean;
    plainPassword?: string;
};

export type TelegramRegistrationInput = {
    source: 'telegram';
    profile: TelegramUserPayload;
    preferredLang?: LanguageCode;
};

export type AccountRegistrationInput = {
    source: 'account';
    username: string;
    password: string;
    nickname?: string;
    language?: string;
    registerIp?: string;
    thirdId?: number;
};

export type UserRegistrationInput = TelegramRegistrationInput | AccountRegistrationInput;

const buildAvatarFromSeed = (seed: string) =>
    `https://api.dicebear.com/7.x/initials/svg?radius=50&bold=true&seed=${encodeURIComponent(seed)}`;

/**
 * Owns user onboarding, credential persistence, and language resolution.
 */
export class UserService {
    private readonly c: AppContext;
    private readonly db: ReturnType<typeof createDb>;

    constructor(c: AppContext) {
        this.c = c;
        this.db = createDb(c.env);
    }

    /**
     * Maps raw Telegram language hints into the supported enum.
     * @param input Telegram language code (possibly undefined).
     * @returns Normalized language or undefined when unsupported.
     */
    mapLanguage(input?: string | null): LanguageCode | undefined {
        if (!input) return undefined;
        const value = input.toLowerCase();
        if (value.startsWith('zh')) return 'zh';
        if (value.startsWith('en')) return 'en';
        return undefined;
    }

    /**
     * Guarantees a supported language, falling back to DEFAULT_LANGUAGE.
     * @param input Optional language hint.
     * @returns Supported language code.
     */
    normalizeLanguage(input?: string | null): LanguageCode {
        return this.mapLanguage(input) ?? DEFAULT_LANGUAGE;
    }

    /**
     * Determines the preferred language for a Telegram user by checking stored profile data.
     * @param user Telegram payload providing id and language_code.
     * @returns Supported language code.
     */
    async resolveLanguage(user?: TelegramUserPayload): Promise<LanguageCode> {
        if (!user) {
            return DEFAULT_LANGUAGE;
        }

        const profile = await this.fetchUserWithRegister(user.id);
        if (profile?.register.language) {
            return this.normalizeLanguage(profile.register.language);
        }

        return this.normalizeLanguage(user.language_code);
    }

    /**
     * Creates a user if one does not exist and updates metadata on every interaction.
     * @param profile Telegram user payload.
     * @param preferredLang Optional preferred language override.
     * @returns Credentials + language for downstream use.
     */
    async getOrCreateUser(input: UserRegistrationInput): Promise<UserCredentials> {
            switch (input.source) {
            case sourceEnum.TELEGRAM:
                return this.handleTelegramRegistration(input.profile, input.preferredLang);
            case sourceEnum.ACCOUNT:
                return this.createAccountUser(input);
            default:
                throw new BizError('Unsupported registration source', ApiCode.BAD_REQUEST);
        }
    }

    /**
     * 
     * @param profile 
     * @param preferredLang 
     * @returns 
     */
    private async handleTelegramRegistration(
        profile: TelegramUserPayload,
        preferredLang?: LanguageCode,
    ): Promise<UserCredentials> {
        const existing = await this.fetchUserWithRegister(profile.id);
        if (existing) {
            const interactionAt = dayjs().toISOString();
            const storedLanguage = this.normalizeLanguage(existing.register.language);
            let language = storedLanguage;

            await this.db
                .update(users)
                .set({ lastInteractionAt: interactionAt, updatedAt: interactionAt })
                .where(eq(users.id, existing.user.id));

            if (preferredLang && preferredLang !== storedLanguage) {
                await this.db
                    .update(userRegisters)
                    .set({ language: preferredLang, updatedAt: interactionAt })
                    .where(eq(userRegisters.uid, existing.user.id));
                language = preferredLang;
            }

            return {
                uid: existing.user.id,
                username: existing.register.username,
                language,
                isNew: false,
            };
        }

        const uid = uuidv4();
        const now = dayjs().toISOString();
        const nickname = profile.first_name ?? profile.username ?? `Guest${profile.id}`;
        const avatar = profile.username
            ? `https://t.me/i/userpic/320/${profile.username}.jpg`
            : 'https://placehold.co/200x200';
        const username = userNamePrefixEnum[sourceEnum.TELEGRAM] + `${profile.id}`;
        const plainPassword = generatePassword(8);
        const salt = generateSalt();
        const password = await hashPassword(plainPassword, salt);
        const language = preferredLang ?? this.normalizeLanguage(profile.language_code);

        await this.db.insert(users).values({
            id: uid,
            nickname,
            avatar,
            isBlocked: 0,
            lastInteractionAt: now,
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(userRegisters).values({
            uid: uid,
            source: 'telegram',
            thirdId: profile.id,
            username,
            password,
            salt,
            registerIp: 'telegram',
            language,
            createdAt: now,
            updatedAt: now,
        });

        return { uid, username, plainPassword, language, isNew: true };
    }

    private async createAccountUser(input: AccountRegistrationInput): Promise<UserCredentials> {
        const normalizedUsername = input.username.trim().toLowerCase();
        if (!normalizedUsername) {
            throw new BizError('用户名不能为空', ApiCode.BAD_REQUEST);
        }

        const existing = await this.fetchUserByUsername(normalizedUsername);
        if (existing) {
            throw new BizError('用户名已存在', ApiCode.CONFLICT);
        }

        const uid = uuidv4();
        const now = dayjs().toISOString();
        const nickname = input.nickname?.trim() || normalizedUsername;
        const avatar = buildAvatarFromSeed(nickname || normalizedUsername);
        const language = input.language ?? DEFAULT_LANGUAGE;
        const salt = generateSalt();
        const password = await hashPassword(input.password, salt);
        const registerIp = input.registerIp ?? '';
        const thirdId = input.thirdId ?? Date.now();

        await this.db.insert(users).values({
            id: uid,
            nickname,
            avatar,
            isBlocked: 0,
            lastInteractionAt: now,
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(userRegisters).values({
            uid: uid,
            source: 'account',
            thirdId,
            username: normalizedUsername,
            password: password,
            salt,
            registerIp,
            language,
            createdAt: now,
            updatedAt: now,
        });

        return { uid, username: normalizedUsername, language, isNew: true };
    }

    /**
     * Loads both user and register rows for a Telegram account, or null when missing.
     * @param telegramId Telegram numeric user id.
     * @returns Combined profile or null.
     */
    async fetchUserWithRegister(telegramId: number): Promise<UserProfile | null> {
        const [record] = await this.db
            .select({
                register: userRegisters,
                user: users,
            })
            .from(userRegisters)
            .innerJoin(users, eq(userRegisters.uid, users.id))
            .where(eq(userRegisters.thirdId, telegramId))
            .limit(1);
        return record ?? null;
    }

    private async fetchUserByUsername(username: string): Promise<UserProfile | null> {
        const [record] = await this.db
            .select({ register: userRegisters, user: users })
            .from(userRegisters)
            .innerJoin(users, eq(userRegisters.uid, users.id))
            .where(eq(userRegisters.username, username))
            .limit(1);
        return record ?? null;
    }

}
