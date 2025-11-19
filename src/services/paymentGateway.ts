import { PaymentInvoice } from "../types";

const generateExpiry = (minutes = 15) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const toHex = (buffer: ArrayBuffer) =>
	Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

export type InvoiceRequest = {
	amount: number;
	currency: string;
	supportedCurrencies: string[];
	orderLabel: string;
	metadata?: Record<string, unknown>;
	successUrl?: string;
	cancelUrl?: string;
};

export class PaymentGatewayService {
	constructor(private readonly env: Env) {}

	async createInvoice(request: InvoiceRequest): Promise<PaymentInvoice> {
		if (this.env.PAYMENT_GATEWAY_URL && this.env.PAYMENT_API_KEY) {
			try {
				const response = await fetch(this.env.PAYMENT_GATEWAY_URL, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						authorization: `Bearer ${this.env.PAYMENT_API_KEY}`,
					},
					body: JSON.stringify(request),
				});
				if (response.ok) {
					const payload = await response.json();
					return this.normalizeInvoice(payload, request);
				}
				console.error("Payment gateway responded with", response.status, await response.text());
			} catch (error) {
				console.error("Payment gateway request failed", error);
			}
		}
		return this.buildMockInvoice(request);
	}

	private normalizeInvoice(payload: any, request: InvoiceRequest): PaymentInvoice {
		return {
			invoiceId: payload.invoiceId ?? payload.id ?? crypto.randomUUID(),
			paymentUrl: payload.paymentUrl ?? payload.checkout_url ?? payload.url ?? request.successUrl ?? "",
			amount: Number(payload.amount ?? request.amount),
			currency: payload.currency ?? request.currency,
			address: payload.address ?? undefined,
			expiresAt: payload.expiresAt ?? generateExpiry(),
			supportedCurrencies: payload.supportedCurrencies ?? request.supportedCurrencies,
			blockchain: payload.blockchain ?? payload.network,
			memo: payload.memo ?? undefined,
		};
	}

	private buildMockInvoice(request: InvoiceRequest): PaymentInvoice {
		const base = this.env.BASE_URL ?? "https://botshop.dev";
		return {
			invoiceId: crypto.randomUUID(),
			paymentUrl: `${base}/mock-pay/${crypto.randomUUID()}`,
			amount: request.amount,
			currency: request.currency,
			expiresAt: generateExpiry(),
			supportedCurrencies: request.supportedCurrencies,
			blockchain: "mocknet",
		};
	}

	async verifyWebhookSignature(rawBody: string, signature?: string | null): Promise<boolean> {
		if (!this.env.PAYMENT_WEBHOOK_SECRET) return false;
		if (!signature) return false;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(this.env.PAYMENT_WEBHOOK_SECRET),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
		return toHex(digest) === signature.trim().toLowerCase();
	}
}
