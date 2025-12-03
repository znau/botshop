export enum ApiCode {
	SUCCESS = 0,

	BAD_REQUEST = 40001,
	UNAUTHORIZED = 40101,
	FORBIDDEN = 40301,
	NOT_FOUND = 40401,
	CONFLICT = 40901,
	UNPROCESSABLE = 42201,

	TELEGRAM_SIGNATURE_INVALID = 44001,
	TELEGRAM_TOKEN_EXPIRED = 44002,

	OUT_OF_STOCK = 46001,
	INVENTORY_EXHAUSTED = 46002,

	INTERNAL_ERROR = 50001,
	DEPENDENCY_MISSING = 50002,
}

export const ApiMessage: Record<ApiCode, string> = {
	[ApiCode.SUCCESS]: 'success',

	[ApiCode.BAD_REQUEST]: '请求参数不合法',
	[ApiCode.UNAUTHORIZED]: '未授权或凭证无效',
	[ApiCode.FORBIDDEN]: '没有访问权限',
	[ApiCode.NOT_FOUND]: '资源不存在',
	[ApiCode.CONFLICT]: '资源状态冲突',
	[ApiCode.UNPROCESSABLE]: '请求无法处理',

	[ApiCode.TELEGRAM_SIGNATURE_INVALID]: 'Telegram 签名验证失败',
	[ApiCode.TELEGRAM_TOKEN_EXPIRED]: 'Telegram 登录已过期',

	[ApiCode.OUT_OF_STOCK]: '库存不足，请稍后再试',
	[ApiCode.INVENTORY_EXHAUSTED]: '库存密钥不足，请联系管理员',

	[ApiCode.INTERNAL_ERROR]: '服务器开小差了，请稍后再试',
	[ApiCode.DEPENDENCY_MISSING]: '系统依赖缺失，请检查部署配置',
};

export function apiCodeToHttpStatus(code: ApiCode): number {
	switch (code) {
		case ApiCode.SUCCESS:
			return 200;
		case ApiCode.BAD_REQUEST:
			return 400;
		case ApiCode.UNPROCESSABLE:
			return 422;
		case ApiCode.UNAUTHORIZED:
		case ApiCode.TELEGRAM_SIGNATURE_INVALID:
		case ApiCode.TELEGRAM_TOKEN_EXPIRED:
			return 401;
		case ApiCode.FORBIDDEN:
			return 403;
		case ApiCode.NOT_FOUND:
			return 404;
		case ApiCode.CONFLICT:
		case ApiCode.OUT_OF_STOCK:
		case ApiCode.INVENTORY_EXHAUSTED:
			return 409;
		case ApiCode.DEPENDENCY_MISSING:
			return 502;
		case ApiCode.INTERNAL_ERROR:
		default:
			return 500;
	}
}
