import { ApiCode, ApiMessage } from '@/enum/apiCodes';

const result = {
	ok<Data = unknown>(data?: Data | null) {
		return {
			code: ApiCode.SUCCESS,
			message: ApiMessage[ApiCode.SUCCESS],
			data: data ?? null,
		};
	},
	fail(code: ApiCode, message?: string) {
		return {
			code,
			message: message ?? ApiMessage[code],
		};
	},
};

export default result;
