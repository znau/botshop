import { ApiCode } from '@/enum/apiCodes';

class BizError extends Error {
	code: ApiCode;

	constructor(message: string, code: ApiCode = ApiCode.INTERNAL_ERROR) {
		super(message);
		this.code = code;
		this.name = 'BizError';
	}
}

export default BizError;
