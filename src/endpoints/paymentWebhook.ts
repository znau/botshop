import { DeliveryService } from "../services/deliveryService";
import { OrderService } from "../services/orderService";
import { PaymentGatewayService } from "../services/paymentGateway";
import type { AppContext } from "../types";
import { PaymentWebhookSchema } from "../types";

export const handlePaymentWebhook = async (c: AppContext) => {
	const signature = c.req.header("x-signature");
	const rawBody = await c.req.text();
	const gateway = new PaymentGatewayService(c.env);
	const verified = await gateway.verifyWebhookSignature(rawBody, signature);
	if (!verified) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	const payload = PaymentWebhookSchema.parse(JSON.parse(rawBody));
	const orderService = new OrderService(c.env);
	const orderId = payload.orderId ?? (await orderService.getOrderIdByInvoice(payload.invoiceId));
	if (!orderId) {
		return c.json({ ok: true, message: "No matching order" });
	}

	const order = await orderService.getOrder(orderId);
	if (!order) {
		return c.json({ ok: true, message: "Order removed" });
	}

	switch (payload.status) {
		case "PAID": {
			const paidOrder = await orderService.markPaid(orderId, payload.txHash, payload.paidAmount);
			if (paidOrder) {
				await new DeliveryService(c.env).deliver(paidOrder);
			}
			break;
		}
		case "FAILED":
			await orderService.updateStatus(orderId, "failed", "链上支付失败");
			break;
		case "EXPIRED":
			await orderService.updateStatus(orderId, "expired", "支付超时");
			break;
		default:
			break;
	}

	return c.json({ ok: true });
};
