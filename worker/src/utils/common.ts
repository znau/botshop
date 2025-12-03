const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
	Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password: string, salt: string) {
	const data = encoder.encode(`${salt}:${password}`);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toHex(digest);
}

export function generateSalt(length = 16) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';

export function generatePassword(length = 10) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

type HeaderAccessor = {
	header(name: string): string | null | undefined;
};

type HeaderSource = Headers | HeaderAccessor | { headers: Headers };

const hasHeaderMethod = (value: unknown): value is HeaderAccessor =>
	typeof value === 'object' && value !== null && typeof (value as HeaderAccessor).header === 'function';

const hasHeadersObject = (value: unknown): value is { headers: Headers } =>
	typeof value === 'object' &&
	value !== null &&
	'headers' in value &&
	(value as { headers?: Headers }).headers instanceof Headers;

const readHeader = (source: HeaderSource, name: string) => {
	if (hasHeaderMethod(source)) {
		const value = source.header(name);
		if (value) return value;
	}
	if (source instanceof Headers) {
		const value = source.get(name);
		if (value) return value;
	}
	if (hasHeadersObject(source)) {
		const value = source.headers.get(name);
		if (value) return value;
	}
	return null;
};

const CLEAN_IP_REGEX = /^\s*["[]?(.+?)[\]"]?\s*$/;

const extractIpCandidate = (raw?: string | null) => {
	if (!raw) return undefined;
	const first = raw.split(',')[0];
	if (!first) return undefined;
	const match = first.match(CLEAN_IP_REGEX);
	return match?.[1]?.trim();
};

const parseForwardedHeader = (raw?: string | null) => {
	if (!raw) return undefined;
	const segments = raw.split(',');
	for (const segment of segments) {
		const match = segment.match(/for=([^;]+)/i);
		if (match) {
			return extractIpCandidate(match[1]);
		}
	}
	return undefined;
};

const IP_HEADER_CANDIDATES = [
	'cf-connecting-ip',
	'x-real-ip',
	'new-relic-real-ip',
	'true-client-ip',
	'x-appengine-user-ip',
	'x-forwarded-for',
];

export function getClientIpFromHeaders(source: HeaderSource, fallback = '') {
	for (const header of IP_HEADER_CANDIDATES) {
		const candidate = extractIpCandidate(readHeader(source, header));
		if (candidate) {
			return candidate;
		}
	}
	const forwarded = parseForwardedHeader(readHeader(source, 'forwarded'));
	return forwarded ?? fallback;
}

const LANGUAGE_HEADER_CANDIDATES = [
	'x-user-language',
	'x-app-language',
	'x-preferred-language',
	'accept-language',
];

const extractLanguages = (raw?: string | null) => {
	if (!raw) return [] as string[];
	return raw
		.split(',')
		.map((segment) => segment.split(';')[0]?.trim())
		.filter((segment): segment is string => Boolean(segment));
};

type LanguageOptions<T extends string> = {
	supported?: ReadonlyArray<T>;
	fallback?: T | string;
};

export function getClientLanguageFromHeaders<T extends string = string>(
	source: HeaderSource,
	options?: LanguageOptions<T>,
): T | string | undefined {
	for (const header of LANGUAGE_HEADER_CANDIDATES) {
		const raw = readHeader(source, header);
		if (!raw) continue;
		const languages = extractLanguages(raw);
		for (const lang of languages) {
			const normalized = lang.toLowerCase();
			if (options?.supported?.length) {
				const matched = options.supported.find(
					(code) => normalized === code.toLowerCase() || normalized.startsWith(`${code.toLowerCase()}-`),
				);
				if (matched) {
					return matched;
				}
			} else {
				return normalized;
			}
		}
	}
	return options?.fallback;
}
