import { Hono } from 'hono';
const app = new Hono();

import result from '../utils/result';
import { cors } from 'hono/cors';
import { ApiCode, ApiMessage, apiCodeToHttpStatus } from '../enum/apiCodes';

app.use('*', cors());

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail(ApiCode.DEPENDENCY_MISSING, 'KV数据库未绑定<br>KV database not bound'), 502);
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail(ApiCode.DEPENDENCY_MISSING, 'KV数据库未绑定<br>KV database not bound'), 502);
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail(ApiCode.DEPENDENCY_MISSING, 'D1数据库未绑定<br>D1 database not bound'), 502);
	}

	const candidateCode = (err as { code?: number }).code;
	const apiCode =
		typeof candidateCode === 'number' && Object.prototype.hasOwnProperty.call(ApiMessage, candidateCode)
			? (candidateCode as ApiCode)
			: ApiCode.INTERNAL_ERROR;
	const status = apiCodeToHttpStatus(apiCode);
	return c.json(result.fail(apiCode, err.message ?? ApiMessage[apiCode]), status);
});

export default app;


