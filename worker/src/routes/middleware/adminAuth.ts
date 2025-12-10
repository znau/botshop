import type { Next } from 'hono';

import result from '@/utils/result';
import type { AppContext } from '@/types';
import jwtUtils from '@/utils/jwt';
import { ApiCode } from '@/enum/apiCodes';
import { hasPermission, hasAllPermissions } from '@/utils/permission';

const AUTH_HEADER = 'authorization';

/**
 * 验证管理员登录状态
 */
export async function requireAdmin(c: AppContext, next: Next) {
	const authHeader = c.req.header(AUTH_HEADER) ?? c.req.header(AUTH_HEADER.toUpperCase());
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
	if (!token) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证缺失'), 401);
	}
	const claims = await jwtUtils.verifyToken(c, token, { scene: 'admin' });
	if (!claims || !claims.sub) {
		return c.json(result.fail(ApiCode.UNAUTHORIZED, '凭证无效或已过期'), 401);
	}
	c.set('adminUser', {
		id: claims.sub as string,
		username: (claims.username as string) ?? '',
		roleId: (claims.roleId as string) ?? '',
		permissions: Array.isArray(claims.permissions) ? (claims.permissions as string[]) : [],
	});
	await next();
}

/**
 * 验证管理员权限 (满足任意一个权限即可)
 * @param permission 单个权限或权限数组
 */
export const requirePermission = (permission: string | string[]) =>
	async (c: AppContext, next: Next) => {
		const admin = c.get('adminUser');
		if (!admin) {
			return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证缺失'), 401);
		}

		if (!hasPermission(admin.permissions, permission)) {
			return c.json(result.fail(ApiCode.FORBIDDEN, '没有权限执行该操作'), 403);
		}

		await next();
	};

/**
 * 验证管理员权限 (需要满足所有权限)
 * @param permissions 权限数组
 */
export const requireAllPermissions = (permissions: string[]) =>
	async (c: AppContext, next: Next) => {
		const admin = c.get('adminUser');
		if (!admin) {
			return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证缺失'), 401);
		}

		if (!hasAllPermissions(admin.permissions, permissions)) {
			return c.json(result.fail(ApiCode.FORBIDDEN, '没有权限执行该操作'), 403);
		}

		await next();
	};
