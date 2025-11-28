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
