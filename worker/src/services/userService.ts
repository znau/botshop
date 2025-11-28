import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import type { createDb } from '../db';
import { userRegisters, users } from '../db/schema';
import type { TelegramUserPayload } from '../types';
import type { SupportedLanguage } from '../i18n/i18n';

export type LanguageCode = SupportedLanguage;
export const LANGUAGE_CODES = ['zh', 'en'] as const satisfies ReadonlyArray<LanguageCode>;
export const DEFAULT_LANGUAGE: LanguageCode = 'zh';

export type UserProfile = {
    register: typeof userRegisters.$inferSelect;
    user: typeof users.$inferSelect;
};

export type UserCredentials = {
    userId: string;
    username: string;
    password: string;
    language: LanguageCode;
};

/**
 * Owns user onboarding, credential persistence, and language resolution.
 */
export class UserService {
    /**
     * @param db Drizzle instance for user tables.
     */
    constructor(private readonly db: ReturnType<typeof createDb>) {}

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
    async getOrCreateUser(profile: TelegramUserPayload, preferredLang?: LanguageCode): Promise<UserCredentials> {
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
                userId: existing.user.id,
                username: existing.register.username,
                password: existing.register.password,
                language,
            };
        }

        const userId = uuidv4();
        const now = dayjs().toISOString();
        const nickname = profile.first_name ?? profile.username ?? `Guest${profile.id}`;
        const avatar = profile.username ? `https://t.me/i/userpic/320/${profile.username}.jpg` : 'https://placehold.co/200x200';
        const username = profile.username ? profile.username.toLowerCase() : `user_${profile.id}`;
        const password = this.generatePassword();
        const language = preferredLang ?? this.normalizeLanguage(profile.language_code);

        await this.db.insert(users).values({
            id: userId,
            nickname,
            avatar,
            isBlocked: 0,
            lastInteractionAt: now,
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(userRegisters).values({
            uid: userId,
            source: 'telegram',
            thirdId: profile.id,
            username,
            password,
            registerIp: 'telegram',
            language,
            createdAt: now,
            updatedAt: now,
        });

        return { userId, username, password, language };
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

    /**
     * Generates a short random password that avoids ambiguous characters.
     * @param length Desired password length (default 10).
     * @returns New password string.
     */
    private generatePassword(length = 10) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    }
}
