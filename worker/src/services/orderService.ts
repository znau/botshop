import { desc, eq } from 'drizzle-orm';
import type { createDb } from '../db';
import { orders, products } from '../db/schema';
import type { ProductRecord } from './productService';

export type LatestOrderRow = {
    order: typeof orders.$inferSelect;
    productTitle: string;
};

export type OrderCreationInput = {
    orderId: string;
    orderSn: string;
    userId: string;
    product: ProductRecord;
    quantity: number;
    unitAmount: number;
    currency: string;
    paymentInvoiceId: string;
    paymentJson: string;
    createdAt: string;
    status?: string;
};

/**
 * Wraps all persistence related to orders and fulfillment side-effects.
 */
export class OrderService {
    /**
     * @param db Drizzle instance used to mutate/read order data.
     */
    constructor(private readonly db: ReturnType<typeof createDb>) {}

    /**
     * Creates a delivered order and decrements product stock within one transaction.
     * @param input Fully resolved order payload including product snapshot.
     */
    async createDeliveredOrder(input: OrderCreationInput) {
        const totalAmount = input.unitAmount * input.quantity;
        await this.db.transaction(async (tx) => {
            await tx
                .update(products)
                .set({ stock: input.product.stock - input.quantity, updatedAt: input.createdAt })
                .where(eq(products.id, input.product.id));

            await tx.insert(orders).values({
                id: input.orderId,
                orderSn: input.orderSn,
                uid: input.userId,
                productId: input.product.id,
                quantity: input.quantity,
                unitAmount: input.unitAmount,
                totalAmount,
                currency: input.currency,
                status: input.status ?? 'delivered',
                paymentInvoiceId: input.paymentInvoiceId,
                paymentJson: input.paymentJson,
                cryptoReceiveAddress: null,
                createdAt: input.createdAt,
                updatedAt: input.createdAt,
            });
        });
    }

    /**
     * Fetches recent orders plus product names for UI display.
     * @param uid Internal user id to filter by.
     * @param limit Optional max rows to return (default 5).
     * @returns Latest orders with joined product titles.
     */
    async listLatestOrdersByUid(uid: string, limit = 5) {
        return this.db
            .select({
                order: orders,
                productTitle: products.title,
            })
            .from(orders)
            .innerJoin(products, eq(orders.productId, products.id))
            .where(eq(orders.uid, uid))
            .orderBy(desc(orders.createdAt))
            .limit(limit);
    }
}
