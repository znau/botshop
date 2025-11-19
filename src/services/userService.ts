import { TelegramUserPayload, User, UserSchema } from "../types";

const now = () => new Date().toISOString();

type UserRow = {
	id: string;
	telegram_id: number;
	username: string | null;
	first_name: string | null;
	last_name: string | null;
	language_code: string | null;
	is_blocked: number;
	created_at: string;
	updated_at: string;
	last_interaction_at: string;
};

const toBool = (value: number | boolean) => value === 1 || value === true;

export class UserService {
	constructor(private readonly env: Env) {}

	private mapUser(row: UserRow): User {
		return UserSchema.parse({
			id: row.id,
			telegramId: row.telegram_id,
			username: row.username,
			firstName: row.first_name,
			lastName: row.last_name,
			languageCode: row.language_code,
			isBlocked: toBool(row.is_blocked),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			lastInteractionAt: row.last_interaction_at,
		});
	}

	async listUsers(): Promise<User[]> {
		const { results } = await this.env.BOTSHOP_DB.prepare(
			"SELECT * FROM users ORDER BY last_interaction_at DESC",
		).all<UserRow>();
		return (results ?? []).map((row) => this.mapUser(row));
	}

	async getById(id: string): Promise<User | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM users WHERE id=? LIMIT 1")
			.bind(id)
			.first<UserRow>();
		return row ? this.mapUser(row) : null;
	}

	async getByTelegramId(telegramId: number): Promise<User | null> {
		const row = await this.env.BOTSHOP_DB.prepare("SELECT * FROM users WHERE telegram_id=? LIMIT 1")
			.bind(telegramId)
			.first<UserRow>();
		return row ? this.mapUser(row) : null;
	}

	async upsertFromTelegram(payload: TelegramUserPayload): Promise<{ user: User; isNew: boolean }> {
		const existing = await this.getByTelegramId(payload.id);
		if (existing) {
			const updatedAt = now();
			await this.env.BOTSHOP_DB.prepare(
				"UPDATE users SET username=?, first_name=?, last_name=?, language_code=?, last_interaction_at=?, updated_at=? WHERE id=?",
			)
				.bind(
					payload.username ?? existing.username,
					payload.first_name ?? existing.firstName,
					payload.last_name ?? existing.lastName,
					payload.language_code ?? existing.languageCode,
					updatedAt,
					updatedAt,
					existing.id,
				)
				.run();
			const user = (await this.getById(existing.id)) as User;
			return { user, isNew: false };
		}

		const user: User = UserSchema.parse({
			id: crypto.randomUUID(),
			telegramId: payload.id,
			username: payload.username ?? null,
			firstName: payload.first_name ?? null,
			lastName: payload.last_name ?? null,
			languageCode: payload.language_code ?? null,
			isBlocked: false,
			createdAt: now(),
			updatedAt: now(),
			lastInteractionAt: now(),
		});
		await this.env.BOTSHOP_DB.prepare(
			"INSERT INTO users (id, telegram_id, username, first_name, last_name, language_code, is_blocked, created_at, updated_at, last_interaction_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
		)
			.bind(
				user.id,
				user.telegramId,
				user.username,
				user.firstName,
				user.lastName,
				user.languageCode,
				user.createdAt,
				user.updatedAt,
				user.lastInteractionAt,
			)
			.run();
		return { user, isNew: true };
	}
}
