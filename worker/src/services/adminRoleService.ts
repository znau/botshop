import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { asc, eq, sql } from 'drizzle-orm';

import { createDb } from '../db';
import { adminRoles, adminUsers } from '../db/schema';
import type { AppContext } from '@/types';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';
import { ADMIN_PERMISSIONS } from '@/enum/adminPermission';
import { expandPermissions, mergePermissions } from '@/utils/permission';

export type AdminRoleRecord = typeof adminRoles.$inferSelect;
export type AdminRoleWithPermissions = AdminRoleRecord & { permissionsList: string[] };

export type AdminRoleInput = {
	name: string;
	description?: string;
	permissions: string[];
};

export class AdminRoleService {
	private readonly db: ReturnType<typeof createDb>;

	constructor(private readonly c: AppContext) {
		this.db = createDb(c.env);
	}

	async listRoles(): Promise<AdminRoleWithPermissions[]> {
		const rows = await this.db.select().from(adminRoles).orderBy(asc(adminRoles.createdAt));
		return rows.map((row) => ({ ...row, permissionsList: this.parsePermissions(row) }));
	}

	async getRoleById(id: string): Promise<AdminRoleWithPermissions | null> {
		const [row] = await this.db.select().from(adminRoles).where(eq(adminRoles.id, id)).limit(1);
		return row ? { ...row, permissionsList: this.parsePermissions(row) } : null;
	}

	async ensureDefaultRole(): Promise<AdminRoleWithPermissions> {
		const [existing] = await this.db.select().from(adminRoles).limit(1);
		if (existing) {
			return { ...existing, permissionsList: this.parsePermissions(existing) };
		}
		const now = dayjs().toISOString();
		const roleId = uuidv4();
		await this.db.insert(adminRoles).values({
			id: roleId,
			name: 'Super Admin',
			description: '拥有全部权限',
			permissions: JSON.stringify(['*']),  // 使用通配符表示所有权限
			isSystem: 1,
			createdAt: now,
			updatedAt: now,
		});
		const created = await this.getRoleById(roleId);
		if (!created) {
			throw new BizError('无法创建默认角色', ApiCode.INTERNAL_ERROR);
		}
		return created;
	}

	async createRole(input: AdminRoleInput) {
		const permissions = this.normalizePermissions(input.permissions);
		const now = dayjs().toISOString();
		const id = uuidv4();
		await this.db.insert(adminRoles).values({
			id,
			name: input.name,
			description: input.description ?? '',
			permissions: JSON.stringify(permissions),
			isSystem: 0,
			createdAt: now,
			updatedAt: now,
		});
		return this.getRoleById(id);
	}

	async updateRole(id: string, input: Partial<AdminRoleInput>) {
		const role = await this.getRoleById(id);
		if (!role) {
			throw new BizError('角色不存在', ApiCode.NOT_FOUND);
		}
		if (role.isSystem && input.permissions && !this.equalsPermissions(role.permissionsList, input.permissions)) {
			throw new BizError('系统角色无法修改权限', ApiCode.FORBIDDEN);
		}
		const now = dayjs().toISOString();
		await this.db
			.update(adminRoles)
			.set({
				name: input.name ?? role.name,
				description: input.description ?? role.description,
				permissions: input.permissions ? JSON.stringify(this.normalizePermissions(input.permissions)) : role.permissions,
				updatedAt: now,
			})
			.where(eq(adminRoles.id, id));
		return this.getRoleById(id);
	}

	async deleteRole(id: string) {
		const role = await this.getRoleById(id);
		if (!role) {
			throw new BizError('角色不存在', ApiCode.NOT_FOUND);
		}
		if (role.isSystem) {
			throw new BizError('系统角色无法删除', ApiCode.FORBIDDEN);
		}
		const [usage] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(adminUsers)
			.where(eq(adminUsers.roleId, id));
		if ((usage?.count ?? 0) > 0) {
			throw new BizError('存在绑定该角色的管理员，无法删除', ApiCode.CONFLICT);
		}
		await this.db.delete(adminRoles).where(eq(adminRoles.id, id));
	}

	private parsePermissions(row: AdminRoleRecord) {
		try {
			const parsed = JSON.parse(row.permissions ?? '[]');
			return Array.isArray(parsed) ? (parsed.filter((item) => typeof item === 'string') as string[]) : [];
		} catch (error) {
			console.warn('invalid role permissions payload', error);
			return [];
		}
	}

	/**
	 * 规范化权限列表
	 * 1. 验证权限是否合法
	 * 2. 合并冗余权限（有 manage 就移除其他同资源权限）
	 * 3. 去重并排序
	 */
	private normalizePermissions(permissions: string[]) {
		// 验证权限合法性
		const allowed = new Set(ADMIN_PERMISSIONS);
		const valid = permissions.filter((perm) => perm === '*' || allowed.has(perm));
		
		// 合并冗余权限
		const merged = mergePermissions(valid);
		
		// 去重
		return [...new Set(merged)];
	}

	private equalsPermissions(prev: string[], next: string[]) {
		if (prev.length !== next.length) return false;
		const set = new Set(prev);
		return next.every((item) => set.has(item));
	}
}

