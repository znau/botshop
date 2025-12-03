import { desc, eq } from 'drizzle-orm';
import { createDb } from '../db';
import { orders, products } from '../db/schema';
import { parsePriceMap, ProductService, serializeProduct } from './productService';
import { AppContext, CreateOrderInput, OrderCreationInput, OrderReceipt, OrderSummary } from '@/types';
import BizError from '@/utils/bizError';
import { ApiCode } from '@/enum/apiCodes';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

export type LatestOrderRow = {
    order: typeof orders.$inferSelect;
    productTitle: string;
};

/**
 * Wraps all persistence related to orders and fulfillment side-effects.
 */
export class OrderService {
    private readonly c: AppContext;
    private readonly db: ReturnType<typeof createDb>;
    private readonly productService: ProductService;

    constructor(c: AppContext) {
        this.c = c;
        this.db = createDb(c.env);
        this.productService = new ProductService(c);
    }

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
                uid: input.uid,
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


    /**
     * Creates a new order for the given user and product.
     * @param input 
     * @returns 
     */
    async createOrder(input: CreateOrderInput): Promise<OrderReceipt> {
        const product = await this.productService.findActiveProduct(input.productId);


        if (!product) {
            throw new BizError('商品不存在或已下架', ApiCode.NOT_FOUND);
        }
        if (product.stock < input.quantity) {
            throw new BizError('库存不足，请稍后再试', ApiCode.OUT_OF_STOCK);
        }
        const priceMap = parsePriceMap(product.price, product.defaultCurrency);
        const currencyCandidate = input.currency?.toUpperCase();
        const currency =
            currencyCandidate && Object.prototype.hasOwnProperty.call(priceMap, currencyCandidate)
                ? currencyCandidate
                : product.defaultCurrency;
        const unitAmount = priceMap[currency];
        if (typeof unitAmount !== 'number') {
            throw new BizError('暂不支持所选币种', ApiCode.UNPROCESSABLE);
        }
        const now = dayjs();
        const orderId = uuidv4();
        const suffixSeed = input.uid;
        const orderSn = `${now.format('YYYYMMDDHHmmssSSS')}-${suffixSeed}`;
        let reservedCode: string | null = null;
        try {
            if (product.deliveryMode === 'code') {
                reservedCode = await this.productService.popInventoryCode(product.id);
                if (!reservedCode) {
                    throw new BizError('库存密钥不足，请联系管理员', ApiCode.INVENTORY_EXHAUSTED);
                }
            }
            await this.createDeliveredOrder({
                orderId,
                orderSn,
                uid: input.uid,
                product,
                quantity: input.quantity,
                unitAmount,
                currency,
                paymentInvoiceId: `web-${orderId}`,
                paymentJson: JSON.stringify({
                    method: 'web',
                    paidAt: now.toISOString(),
                    currency,
                    amount: unitAmount * input.quantity,
                }),
                createdAt: now.toISOString(),
            });
        } catch (error) {
            if (reservedCode) {
                await this.productService.pushInventoryCode(product.id, reservedCode);
            }
            throw error;
        }
        const attachment = await this.productService.loadProductAttachment(product.id);
        return {
            orderSn,
            product: serializeProduct(product),
            currency,
            amount: unitAmount * input.quantity,
            code: reservedCode,
            instructions: product.deliveryInstructions,
            attachment,
        };
    }
}

export const serializeOrderRow = (row: LatestOrderRow): OrderSummary => ({
    id: row.order.id,
    orderSn: row.order.orderSn,
    productTitle: row.productTitle,
    currency: row.order.currency,
    amount: row.order.totalAmount,
    status: row.order.status,
    createdAt: row.order.createdAt,
});

