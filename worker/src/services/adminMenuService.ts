import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { asc, eq, sql } from 'drizzle-orm';

import { createDb } from '../db';
import { adminMenus } from '../db/schema';
import type { AppContext } from '@/types';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';
import { DEFAULT_ADMIN_MENUS, type AdminMenuSeed } from '@/constants/adminMenus';
import { hasPermission } from '@/utils/permission';

export type AdminMenuRecord = typeof adminMenus.$inferSelect;
export type AdminMenuNode = AdminMenuRecord & { children: AdminMenuNode[] };

export type AdminMenuInput = {
	parentId?: string | null;
	title: string;
	path: string;
	menuType?: 'directory' | 'menu' | 'button' | 'iframe' | 'link';
	icon?: string | null;
	component?: string | null;
	permission?: string | null;
	sort?: number;
	isVisible?: boolean;
};

export class AdminMenuService {
	private readonly db: ReturnType<typeof createDb>;

	constructor(private readonly c: AppContext) {
		this.db = createDb(c.env);
	}

	async ensureDefaultMenus() {
		const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(adminMenus);
		if ((row?.count ?? 0) > 0) {
			return;
		}
		const now = dayjs().toISOString();
		const records = this.flattenSeeds(DEFAULT_ADMIN_MENUS, null, now);
		if (records.length) {
			await this.db.insert(adminMenus).values(records);
		}
	}

	async listFlatMenus(): Promise<AdminMenuRecord[]> {
		return this.db
			.select()
			.from(adminMenus)
			.orderBy(asc(adminMenus.sort), asc(adminMenus.createdAt));
	}

	async listMenuTree(): Promise<AdminMenuNode[]> {
		const rows = await this.listFlatMenus();
		const byParent = new Map<string | null, AdminMenuRecord[]>();
		for (const row of rows) {
			const parent = row.parentId ?? null;
			if (!byParent.has(parent)) {
				byParent.set(parent, []);
			}
			byParent.get(parent)!.push(row);
		}
		const buildTree = (parent: string | null): AdminMenuNode[] => {
			return (byParent.get(parent) ?? [])
				.sort((a, b) => a.sort - b.sort)
				.map((item) => ({ ...item, children: buildTree(item.id) }));
		};
		return buildTree(null);
	}

	/**
	 * 根据用户权限过滤菜单树
	 * 使用增强的权限检查工具，支持权限依赖和通配符
	 */
	async listMenusForPermissions(permissions: string[]): Promise<AdminMenuNode[]> {
		const tree = await this.listMenuTree();
		
		const filterTree = (nodes: AdminMenuNode[]): AdminMenuNode[] =>
			nodes
				.map((node) => ({ ...node, children: filterTree(node.children) }))
				.filter((node) => {
					// 检查权限
					const hasRequiredPermission = !node.permission || hasPermission(permissions, node.permission);
					
					// 有子菜单或自己有权限才显示
					const hasVisibleChildren = node.children.length > 0;
					
					// 检查可见性
					const shouldDisplay = node.isVisible !== 0 || hasVisibleChildren;
					
					return shouldDisplay && (hasRequiredPermission || hasVisibleChildren);
				});
		
		return filterTree(tree);
	}

	async getMenuById(id: string) {
		const [record] = await this.db.select().from(adminMenus).where(eq(adminMenus.id, id)).limit(1);
		return record ?? null;
	}

	async createMenu(input: AdminMenuInput) {
		const now = dayjs().toISOString();
		const id = uuidv4();
		await this.db.insert(adminMenus).values({
			id,
			parentId: input.parentId ?? null,
			title: input.title,
			path: input.path,
			menuType: input.menuType ?? 'menu',
			icon: input.icon ?? null,
			component: input.component ?? null,
			permission: input.permission ?? null,
			sort: input.sort ?? 0,
			isVisible: input.isVisible === false ? 0 : 1,
			createdAt: now,
			updatedAt: now,
		});
		return this.getMenuById(id);
	}

	async updateMenu(id: string, input: AdminMenuInput) {
		const now = dayjs().toISOString();
		const existing = await this.getMenuById(id);
		if (!existing) {
			throw new BizError('菜单不存在', ApiCode.NOT_FOUND);
		}
		await this.db
			.update(adminMenus)
			.set({
				parentId: input.parentId ?? null,
				title: input.title,
				path: input.path,
				menuType: input.menuType ?? existing.menuType,
				icon: input.icon ?? null,
				component: input.component ?? null,
				permission: input.permission ?? null,
				sort: input.sort ?? existing.sort,
				isVisible: input.isVisible === false ? 0 : 1,
				updatedAt: now,
			})
			.where(eq(adminMenus.id, id));
		return this.getMenuById(id);
	}

	async deleteMenu(id: string) {
		const existing = await this.getMenuById(id);
		if (!existing) {
			throw new BizError('菜单不存在', ApiCode.NOT_FOUND);
		}
		await this.db.delete(adminMenus).where(eq(adminMenus.id, id));
	}

	private flattenSeeds(nodes: AdminMenuSeed[], parentId: string | null, now: string) {
		const records: typeof adminMenus.$inferInsert[] = [];
		nodes.forEach((node, index) => {
			const id = node.id ?? uuidv4();
			records.push({
				id,
				parentId,
				title: node.title,
				path: node.path,
				menuType: node.menuType ?? 'menu',
				icon: node.icon ?? null,
				component: node.component ?? null,
				permission: node.permission ?? null,
				sort: node.sort ?? index,
				isVisible: 1,
				createdAt: now,
				updatedAt: now,
			});
			if (node.children?.length) {
				records.push(...this.flattenSeeds(node.children, id, now));
			}
		});
		return records;
	}
}
