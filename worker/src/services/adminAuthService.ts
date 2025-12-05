import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { asc, eq, sql } from 'drizzle-orm';

import { createDb } from '../db';
import { adminUsers, adminRoles } from '../db/schema';
import type { AppContext } from '@/types';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';
import { generateSalt, hashPassword } from '@/utils/common';
import { AdminRoleService, type AdminRoleWithPermissions } from './adminRoleService';
import { AdminMenuService } from './adminMenuService';

export type AdminUserRecord = typeof adminUsers.$inferSelect;
export type AdminUserWithRole = { user: AdminUserRecord; role: AdminRoleWithPermissions };

export type AdminRegisterInput = {
	username: string;
	password: string;
	nickname?: string;
};

export type AdminAccountInput = AdminRegisterInput & { roleId: string; isActive?: boolean };

const buildAvatar = (seed: string) =>
	`https://api.dicebear.com/7.x/initials/svg?radius=50&bold=true&seed=${encodeURIComponent(seed)}`;

export class AdminAuthService {
	private readonly db: ReturnType<typeof createDb>;
	private readonly roleService: AdminRoleService;
	private readonly menuService: AdminMenuService;

	constructor(private readonly c: AppContext) {
		this.db = createDb(c.env);
		this.roleService = new AdminRoleService(c);
		this.menuService = new AdminMenuService(c);
	}

	async isRegistrationOpen() {
		const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(adminUsers);
		return (row?.count ?? 0) === 0;
	}

	async register(input: AdminRegisterInput) {
		const open = await this.isRegistrationOpen();
		if (!open) {
			throw new BizError('已存在管理员账号，请直接登录', ApiCode.CONFLICT);
		}
		await this.menuService.ensureDefaultMenus();
		const role = await this.roleService.ensureDefaultRole();
		return this.createAdminAccount({ ...input, roleId: role.id });
	}

	async createAdminAccount(input: AdminAccountInput) {
		const role = await this.roleService.getRoleById(input.roleId);
		if (!role) {
			throw new BizError('角色不存在', ApiCode.NOT_FOUND);
		}
		const normalizedUsername = this.normalizeUsername(input.username);
		const existing = await this.fetchByUsername(normalizedUsername);
		if (existing) {
			throw new BizError('用户名已存在', ApiCode.CONFLICT);
		}
		const now = dayjs().toISOString();
		const id = uuidv4();
		const salt = generateSalt();
		const password = await hashPassword(input.password, salt);
		const nickname = input.nickname?.trim() || normalizedUsername;
		await this.db.insert(adminUsers).values({
			id,
			username: normalizedUsername,
			password,
			salt,
			nickname,
			avatar: buildAvatar(nickname),
			roleId: role.id,
			isActive: input.isActive === false ? 0 : 1,
			createdAt: now,
			updatedAt: now,
		});
		return this.fetchById(id);
	}

	async login(username: string, password: string) {
		const record = await this.fetchByUsername(this.normalizeUsername(username));
		if (!record || record.user.isActive === 0) {
			return null;
		}
		const hashed = await hashPassword(password, record.user.salt);
		if (hashed !== record.user.password) {
			return null;
		}
		const now = dayjs().toISOString();
		await this.db
			.update(adminUsers)
			.set({ lastLoginAt: now, updatedAt: now })
			.where(eq(adminUsers.id, record.user.id));
		return record;
	}

	async fetchById(id: string): Promise<AdminUserWithRole | null> {
		const [row] = await this.db
			.select({ user: adminUsers, role: adminRoles })
			.from(adminUsers)
			.innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
			.where(eq(adminUsers.id, id))
			.limit(1);
		return row ? this.mapRow(row.user, row.role) : null;
	}

	async fetchByUsername(username: string): Promise<AdminUserWithRole | null> {
		const [row] = await this.db
			.select({ user: adminUsers, role: adminRoles })
			.from(adminUsers)
			.innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
			.where(eq(adminUsers.username, username))
			.limit(1);
		return row ? this.mapRow(row.user, row.role) : null;
	}

	async listAdmins(): Promise<AdminUserWithRole[]> {
		const rows = await this.db
			.select({ user: adminUsers, role: adminRoles })
			.from(adminUsers)
			.innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
			.orderBy(asc(adminUsers.createdAt));
		return rows.map((row) => this.mapRow(row.user, row.role));
	}

	async updateAdminRole(userId: string, roleId: string) {
		const role = await this.roleService.getRoleById(roleId);
		if (!role) {
			throw new BizError('角色不存在', ApiCode.NOT_FOUND);
		}
		const now = dayjs().toISOString();
		const [target] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
		if (!target) {
			throw new BizError('管理员不存在', ApiCode.NOT_FOUND);
		}
		await this.db.update(adminUsers).set({ roleId, updatedAt: now }).where(eq(adminUsers.id, userId));
		return this.fetchById(userId);
	}

	async toggleAdminStatus(userId: string, isActive: boolean) {
		const [target] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
		if (!target) {
			throw new BizError('管理员不存在', ApiCode.NOT_FOUND);
		}
		if (!isActive) {
			const [activeCount] = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(adminUsers)
				.where(eq(adminUsers.isActive, 1));
			if ((activeCount?.count ?? 0) <= 1) {
				throw new BizError('至少保留一个启用的管理员账号', ApiCode.CONFLICT);
			}
		}
		const now = dayjs().toISOString();
		await this.db
			.update(adminUsers)
			.set({ isActive: isActive ? 1 : 0, updatedAt: now })
			.where(eq(adminUsers.id, userId));
		return this.fetchById(userId);
	}

	private normalizeUsername(username: string) {
		return username.trim().toLowerCase();
	}

	private mapRow(user: AdminUserRecord, roleRow: typeof adminRoles.$inferSelect): AdminUserWithRole {
		return {
			user,
			role: {
				...roleRow,
				permissionsList: this.parsePermissions(roleRow.permissions ?? '[]'),
			},
		};
	}

	private parsePermissions(raw: string) {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed.filter((item) => typeof item === 'string') as string[]) : [];
		} catch (error) {
			console.warn('invalid admin role permissions payload', error);
			return [];
		}
	}
}
