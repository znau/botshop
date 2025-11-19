#!/usr/bin/env node
import { webcrypto, randomUUID } from "node:crypto";
import process from "node:process";

const encoder = new TextEncoder();

const base64UrlEncode = (buffer) => Buffer.from(buffer)
	.toString("base64")
	.replace(/\+/g, "-")
	.replace(/\//g, "_")
	.replace(/=+$/g, "");

const parseArgs = () => {
	const args = {};
	const tokens = process.argv.slice(2);
	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (!token.startsWith("--")) continue;
		const [rawKey, rawValue] = token.split("=");
		const key = rawKey.replace(/^--/, "");
		if (rawValue !== undefined) {
			args[key] = rawValue;
		} else if (tokens[i + 1] && !tokens[i + 1].startsWith("--")) {
			args[key] = tokens[i + 1];
			i += 1;
		} else {
			args[key] = "";
		}
	}
	return args;
};

const usage = () => {
	console.error("Usage: node scripts/seedAdmin.mjs --username <name> --password <secret> [--salt <hex>]");
	process.exit(1);
};

const hashPassword = async (password, salt) => {
	const data = encoder.encode(`${salt}:${password}`);
	const digest = await webcrypto.subtle.digest("SHA-256", data);
	return base64UrlEncode(digest);
};

const main = async () => {
	const args = parseArgs();
	const username = args.username || args.u;
	const password = args.password || args.p;
	if (!username || !password) {
		usage();
	}
	const salt = (args.salt || randomUUID().replace(/-/g, "")).toString();
	const passwordHash = await hashPassword(password, salt);
	const now = new Date().toISOString();
	const account = {
		username,
		passwordHash,
		salt,
		createdAt: now,
		updatedAt: now,
	};
	process.stdout.write(`${JSON.stringify(account, null, 2)}\n`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
