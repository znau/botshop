import type { Next } from 'hono';

import result from '@/utils/result';
import type { AppContext } from '@/types';
import jwtUtils from '@/utils/jwt';
import { ApiCode } from '@/enum/apiCodes';

const AUTH_HEADER = 'authorization';

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

export const requirePermission = (permission: string | string[]) =>
	async (c: AppContext, next: Next) => {
		const admin = c.get('adminUser');
		if (!admin) {
			return c.json(result.fail(ApiCode.UNAUTHORIZED, '未登录或凭证缺失'), 401);
		}
		const required = Array.isArray(permission) ? permission : [permission];
		const allowed = new Set(admin.permissions);
		const hasPermission = required.some((perm) => allowed.has(perm));
		if (!hasPermission) {
			return c.json(result.fail(ApiCode.FORBIDDEN, '没有权限执行该操作'), 403);
		}
		await next();
	};
