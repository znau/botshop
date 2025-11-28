import type { Next } from 'hono';
import result from '../../utils/result';
import type { AppContext } from '../../types';
import jwtUtils from '../../utils/jwt';

const AUTH_HEADER = 'authorization';

export async function requireAuth(c: AppContext, next: Next) {
	const authHeader = c.req.header(AUTH_HEADER) ?? c.req.header(AUTH_HEADER.toUpperCase());
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
	if (!token) {
		return c.json(result.fail('未登录或凭证缺失', 401), 401);
	}
	const claims = await jwtUtils.verifyToken(c, token);
	if (!claims || !claims.uid) {
		return c.json(result.fail('凭证无效或已过期', 401), 401);
	}
	c.set('authUser', { uid: claims.uid, nickname: claims.nickname ?? '' });
	await next();
}
