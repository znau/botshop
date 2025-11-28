import { TelegramBot } from '../utils/telegramBot';
import { createDb } from '../db';
import { categories, orders, products, userRegisters, users } from '../db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { t as translate, type SupportedLanguage } from '../i18n/i18n';
import type {
    TelegramUpdate,
    TelegramMessage,
    TelegramCallbackQuery,
    TelegramUserPayload,
} from '../types';

type InlineButton = { text: string; callback_data: string };
type InventoryPayload = { codes: string[] } | string[] | null;
type CategoryRecord = typeof categories.$inferSelect;
type ProductRecord = typeof products.$inferSelect;
type CategoryWithProducts = { category: CategoryRecord; products: ProductRecord[] };
type CacheEnvelope<T> = { payload: T; expiredAt: number };

const CALLBACK_SEPARATOR = '|';
const LANGUAGE_CODES = ['zh', 'en'] as const;
type LanguageCode = SupportedLanguage;
const DEFAULT_LANGUAGE: LanguageCode = 'zh';
const DEFAULT_CACHE_TTL = 60; // seconds

export class TelegramService {
    private readonly bot: TelegramBot;
    private readonly db: ReturnType<typeof createDb>;

    constructor(private readonly env: Env) {
        this.bot = new TelegramBot(env);
        this.db = createDb(env);
    }

    async handleUpdate(update: TelegramUpdate) {
        if (update.message) {
            await this.handleMessage(update.message);
            return;
        }

        if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query);
        }
    }

    private async handleMessage(message: TelegramMessage) {
        if (!message.from) return;
        const text = message.text ?? '';
        const chatId = message.chat.id;

        if (text.startsWith('/start')) {
            await this.handleStart(chatId, message.from);
            return;
        }

        const lang = await this.resolveLanguage(message.from);
        await this.showMainMenu(chatId, lang);
    }

    private async handleCallbackQuery(query: TelegramCallbackQuery) {
        const chatId = query.message?.chat.id;
        const lang = query.from ? await this.resolveLanguage(query.from) : DEFAULT_LANGUAGE;

        if (!chatId || !query.data) {
            if (query.id) {
                await this.bot.answerCallbackQuery(query.id, this.text('errors.invalidAction', lang));
            }
            return;
        }

        await this.bot.answerCallbackQuery(query.id);
        const payload = this.parseCallbackData(query.data);

        switch (payload.action) {
            case 'home':
            case 'shop_start':
                await this.showMainMenu(chatId, lang);
                break;
            case 'categories':
                await this.showCategories(chatId, lang);
                break;
            case 'category':
                await this.handleCategorySelection(chatId, lang, payload.args[0]);
                break;
            case 'category_products':
                await this.showProductsByCategory(chatId, lang, payload.args[0]);
                break;
            case 'product':
                await this.showProductDetail(chatId, lang, payload.args[0]);
                break;
            case 'buy':
                if (query.from) {
                    await this.handleBuy(chatId, query.from, payload.args[0], lang);
                }
                break;
            case 'orders':
                if (query.from) {
                    await this.showLatestOrders(chatId, query.from, lang);
                }
                break;
            case 'account':
                if (query.from) {
                    await this.showAccount(chatId, query.from, lang);
                }
                break;
            case 'support':
                await this.showSupport(chatId, lang);
                break;
            case 'lang_menu':
                await this.showLanguageMenu(chatId, lang);
                break;
            case 'lang_set':
                await this.setLanguage(chatId, query.from, payload.args[0], lang);
                break;
            default:
                await this.showMainMenu(chatId, lang);
        }
    }

    private async handleStart(chatId: number, telegramUser: TelegramUserPayload) {
        const preferred = this.mapLanguage(telegramUser.language_code) ?? DEFAULT_LANGUAGE;
        const credentials = await this.getOrCreateUser(telegramUser, preferred);
        const lang = credentials.language;
        const welcomeLines = [
            this.text('welcome.title', lang),
            this.text('welcome.accountCreated', lang),
            '',
            this.text('welcome.credentials', lang, {
                username: credentials.username,
                password: credentials.password,
            }),
            '',
            this.text('welcome.caution', lang),
        ];

        await this.bot.sendMessage(chatId, welcomeLines.join('\n'));
        await this.showMainMenu(chatId, lang);
    }

    private async showMainMenu(chatId: number, lang: LanguageCode) {
        await this.bot.sendMessage(chatId, this.text('menu.prompt', lang), {
            replyMarkup: {
                inline_keyboard: [
                    [{ text: this.text('menu.buttons.shop', lang), callback_data: this.cb('categories') }],
                    [
                        { text: this.text('menu.buttons.orders', lang), callback_data: this.cb('orders') },
                        { text: this.text('menu.buttons.account', lang), callback_data: this.cb('account') },
                    ],
                    [
                        { text: this.text('menu.buttons.support', lang), callback_data: this.cb('support') },
                        { text: this.text('menu.buttons.language', lang), callback_data: this.cb('lang_menu') },
                    ],
                ],
            },
        });
    }

    private async showCategories(
        chatId: number,
        lang: LanguageCode,
        parentId?: string,
        preloaded?: CategoryRecord[],
    ) {
        const allCategories = preloaded ?? (await this.getActiveCategories());
        const parent = parentId ? allCategories.find((item) => item.id === parentId) : undefined;
        if (parentId && !parent) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        const children = allCategories.filter((item) => (item.parentId ?? null) === (parentId ?? null));

        if (!children.length) {
            if (parent) {
                await this.bot.sendMessage(
                    chatId,
                    this.text('categories.noChildren', lang, { name: parent.name }),
                );
                await this.showProductsByCategory(chatId, lang, parent.id);
                return;
            }

            await this.bot.sendMessage(chatId, this.text('categories.empty', lang));
            return;
        }

        const buttons = children.map((item) => ({
            text: `${item.emoji ?? '📁'} ${item.name}`,
            callback_data: this.cb('category', item.id),
        }));

        const keyboard = this.chunkButtons(buttons, 2);

        if (parent) {
            keyboard.push([
                {
                    text: this.text('categories.viewProducts', lang, { name: parent.name }),
                    callback_data: this.cb('category_products', parent.id),
                },
            ]);
            keyboard.push([
                {
                    text: this.text('navigation.backParent', lang),
                    callback_data: parent.parentId
                        ? this.cb('category', parent.parentId)
                        : this.cb('categories'),
                },
                { text: this.text('navigation.home', lang), callback_data: this.cb('home') },
            ]);
        } else {
            keyboard.push([{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]);
        }

        const title = parent
            ? this.text('categories.subPrompt', lang, { name: parent.name })
            : this.text('categories.prompt', lang);

        await this.bot.sendMessage(chatId, title, {
            replyMarkup: { inline_keyboard: keyboard },
        });
    }

    private async handleCategorySelection(
        chatId: number,
        lang: LanguageCode,
        categoryId?: string,
    ) {
        if (!categoryId) {
            await this.bot.sendMessage(chatId, this.text('errors.noCategory', lang));
            return;
        }

        const categories = await this.getActiveCategories();
        const target = categories.find((item) => item.id === categoryId);

        if (!target) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        const children = categories.filter((item) => item.parentId === categoryId);
        if (children.length) {
            await this.showCategories(chatId, lang, categoryId, categories);
            return;
        }

        await this.showProductsByCategory(chatId, lang, categoryId);
    }

    private async showProductsByCategory(chatId: number, lang: LanguageCode, categoryId?: string) {
        if (!categoryId) {
            await this.bot.sendMessage(chatId, this.text('errors.noCategory', lang));
            return;
        }

        const catalogNode = await this.getCategoryWithProducts(categoryId);
        const category = catalogNode?.category;
        const list = catalogNode?.products ?? [];

        if (!category) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        if (!list.length) {
            await this.bot.sendMessage(chatId, this.text('categories.noProducts', lang, { name: category.name }), {
                replyMarkup: {
                    inline_keyboard: [
                        [{ text: this.text('navigation.backCategories', lang), callback_data: this.cb('categories') }],
                        [{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }],
                    ],
                },
            });
            return;
        }

        const buttons = list.map((item) => ({
            text: `${item.title} · ${this.formatPriceLabel(item)}`,
            callback_data: this.cb('product', item.id),
        }));

        const keyboard = this.chunkButtons(buttons, 1);
        keyboard.push([
            { text: this.text('navigation.backCategories', lang), callback_data: this.cb('categories') },
            { text: this.text('navigation.home', lang), callback_data: this.cb('home') },
        ]);

        await this.bot.sendMessage(
            chatId,
            this.text('categories.title', lang, {
                emoji: category.emoji ?? '📁',
                name: category.name,
            }),
            {
                replyMarkup: { inline_keyboard: keyboard },
            },
        );
    }

    private async showProductDetail(chatId: number, lang: LanguageCode, productId?: string) {
        if (!productId) {
            await this.bot.sendMessage(chatId, this.text('errors.productMissing', lang));
            return;
        }

        const [product] = await this.db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

        if (!product || !product.isActive) {
            await this.bot.sendMessage(chatId, this.text('errors.productUnavailable', lang));
            return;
        }

        const attachment = await this.loadProductAttachment(product.id);
        const infoLines = [
            this.text('product.title', lang, { title: product.title }),
            product.description
                ? this.text('product.description', lang, { description: product.description })
                : this.text('product.noDescription', lang),
            '',
            this.text('product.price', lang, { price: this.formatPriceLabel(product) }),
            this.text('product.stock', lang, { stock: product.stock }),
            this.text('product.delivery', lang, {
                delivery: this.describeDelivery(product.deliveryMode, lang),
            }),
        ];

        if (product.mediaUrl) {
            infoLines.push(this.text('product.media', lang, { url: product.mediaUrl }));
        }

        if (product.deliveryInstructions) {
            infoLines.push('', this.text('product.instructions', lang, { text: product.deliveryInstructions }));
        } else if (attachment) {
            infoLines.push('', this.text('product.attachment', lang, { text: attachment }));
        }

        const keyboard = [
            [{ text: this.text('product.buttons.buy', lang), callback_data: this.cb('buy', product.id) }],
            [
                { text: this.text('navigation.backCategories', lang), callback_data: this.cb('category', product.categoryId) },
                { text: this.text('navigation.home', lang), callback_data: this.cb('home') },
            ],
        ];

        await this.bot.sendMessage(chatId, infoLines.join('\n'), {
            replyMarkup: { inline_keyboard: keyboard },
        });
    }

    private async handleBuy(
        chatId: number,
        telegramUser: TelegramUserPayload,
        productId?: string,
        preferredLang?: LanguageCode,
    ) {
        if (!productId) {
            await this.bot.sendMessage(chatId, this.text('errors.productMissing', preferredLang ?? DEFAULT_LANGUAGE));
            return;
        }

        const profile = await this.getOrCreateUser(telegramUser, preferredLang);
        const lang = profile.language;
        const [product] = await this.db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

        if (!product || !product.isActive) {
            await this.bot.sendMessage(chatId, this.text('errors.productUnavailable', lang));
            return;
        }

        if (product.stock <= 0) {
            await this.bot.sendMessage(chatId, this.text('errors.outOfStock', lang));
            return;
        }

        const priceMap = this.parsePriceMap(product.price, product.defaultCurrency);
        const unitAmount = priceMap[product.defaultCurrency] ?? Number(Object.values(priceMap)[0] ?? 0);
        const currency = product.defaultCurrency;
        const now = dayjs().toISOString();
        const quantity = 1;
        const orderId = uuidv4();
        const orderSn = `${dayjs().format('YYYYMMDDHHmmssSSS')}-${telegramUser.id}`;
        const paymentInvoiceId = `inline-${orderId}`;

        let reservedCode: string | null = null;
        if (product.deliveryMode === 'code') {
            reservedCode = await this.popInventoryCode(product.id);
            if (!reservedCode) {
                await this.bot.sendMessage(chatId, this.text('errors.inventoryEmpty', lang));
                return;
            }
        }

        try {
            await this.db.transaction(async (tx) => {
                await tx
                    .update(products)
                    .set({ stock: product.stock - quantity, updatedAt: now })
                    .where(eq(products.id, product.id));

                await tx.insert(orders).values({
                    id: orderId,
                    orderSn,
                    uid: profile.userId,
                    productId: product.id,
                    quantity,
                    unitAmount,
                    totalAmount: unitAmount * quantity,
                    currency,
                    status: 'delivered',
                    paymentInvoiceId,
                    paymentJson: JSON.stringify({
                        method: 'inline',
                        paidAt: now,
                        currency,
                        amount: unitAmount * quantity,
                    }),
                    cryptoReceiveAddress: null,
                    createdAt: now,
                    updatedAt: now,
                });
            });
        } catch (error) {
            console.error('order creation failed', error);
            if (reservedCode) {
                await this.pushInventoryCode(product.id, reservedCode);
            }
            await this.bot.sendMessage(chatId, this.text('errors.orderFailed', lang));
            return;
        }

        const attachment = await this.loadProductAttachment(product.id);
        const lines = [
            this.text('purchase.successTitle', lang),
            this.text('purchase.orderSn', lang, { orderSn }),
            this.text('purchase.product', lang, { title: product.title }),
            this.text('purchase.amount', lang, { currency, amount: unitAmount.toFixed(2) }),
            this.text('purchase.delivery', lang, {
                delivery: this.describeDelivery(product.deliveryMode, lang),
            }),
        ];

        if (reservedCode) {
            lines.push('', this.text('purchase.code', lang, { code: reservedCode }));
        }

        if (product.deliveryMode === 'text' && product.deliveryInstructions) {
            lines.push('', this.text('purchase.instructions', lang, { text: product.deliveryInstructions }));
        }

        if (attachment) {
            lines.push('', this.text('purchase.attachment', lang, { text: attachment }));
        }

        await this.bot.sendMessage(chatId, lines.join('\n'), {
            replyMarkup: {
                inline_keyboard: [
                    [{ text: this.text('navigation.continueShopping', lang), callback_data: this.cb('categories') }],
                    [{ text: this.text('navigation.viewOrders', lang), callback_data: this.cb('orders') }],
                ],
            },
        });
    }

    private async showLatestOrders(chatId: number, telegramUser: TelegramUserPayload, lang: LanguageCode) {
        const profile = await this.fetchUserWithRegister(telegramUser.id);
        if (!profile) {
            await this.bot.sendMessage(chatId, this.text('errors.accountMissing', lang));
            return;
        }

        const rows = await this.db
            .select({
                order: orders,
                productTitle: products.title,
            })
            .from(orders)
            .innerJoin(products, eq(orders.productId, products.id))
            .where(eq(orders.uid, profile.register.uid))
            .orderBy(desc(orders.createdAt))
            .limit(5);

        if (!rows.length) {
            await this.bot.sendMessage(chatId, this.text('orders.none', lang));
            return;
        }

        const text = rows
            .map((row) => {
                const statusLabel = this.text(`orderStatus.${row.order.status}`, lang);
                return this.text('orders.item', lang, {
                    orderSn: row.order.orderSn,
                    product: row.productTitle,
                    currency: row.order.currency,
                    amount: row.order.totalAmount.toFixed(2),
                    status: statusLabel,
                    time: row.order.createdAt,
                });
            })
            .join('\n\n');

        const body = [this.text('orders.latestTitle', lang), '', text].join('\n');

        await this.bot.sendMessage(chatId, body, {
            replyMarkup: {
                inline_keyboard: [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            },
        });
    }

    private async showAccount(chatId: number, telegramUser: TelegramUserPayload, lang: LanguageCode) {
        const profile = await this.fetchUserWithRegister(telegramUser.id);
        if (!profile) {
            await this.bot.sendMessage(chatId, this.text('errors.accountMissing', lang));
            return;
        }

        const lines = [
            this.text('account.title', lang),
            this.text('account.nickname', lang, { nickname: profile.user.nickname }),
            this.text('account.username', lang, { username: profile.register.username }),
            this.text('account.password', lang, { password: profile.register.password }),
            this.text('account.registeredAt', lang, { time: profile.register.createdAt }),
            this.text('account.lastActive', lang, { time: profile.user.lastInteractionAt }),
        ];

        await this.bot.sendMessage(chatId, lines.join('\n'), {
            replyMarkup: {
                inline_keyboard: [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            },
        });
    }

    private async showSupport(chatId: number, lang: LanguageCode) {
        const supportUrl = this.env.BASE_URL ? `${this.env.BASE_URL}/support` : 'https://t.me';
        const lines = [
            this.text('support.title', lang),
            this.text('support.body', lang, { url: supportUrl }),
        ];

        await this.bot.sendMessage(chatId, lines.join('\n'), {
            replyMarkup: {
                inline_keyboard: [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            },
        });
    }

    private async showLanguageMenu(chatId: number, lang: LanguageCode) {
        const currentName = this.text(`language.options.${lang}`, lang);
        const lines = [
            this.text('language.prompt', lang),
            this.text('language.current', lang, { languageName: currentName }),
        ];

        const keyboard = LANGUAGE_CODES.map((code) => [
            {
                text: `${code === lang ? '• ' : ''}${this.text(`language.options.${code}`, lang)}`,
                callback_data: this.cb('lang_set', code),
            },
        ]);
        keyboard.push([{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]);

        await this.bot.sendMessage(chatId, lines.join('\n'), {
            replyMarkup: { inline_keyboard: keyboard },
        });
    }

    private async setLanguage(
        chatId: number,
        telegramUser: TelegramUserPayload | undefined,
        target?: string,
        currentLang: LanguageCode = DEFAULT_LANGUAGE,
    ) {
        if (!telegramUser) {
            await this.bot.sendMessage(chatId, this.text('errors.accountMissing', currentLang));
            return;
        }

        const preferred = this.mapLanguage(target) ?? currentLang;
        const profile = await this.getOrCreateUser(telegramUser, preferred);
        const lang = profile.language;
        const confirmation = this.text('language.updated', lang, {
            languageName: this.text(`language.options.${lang}`, lang),
        });

        await this.bot.sendMessage(chatId, confirmation);
        await this.showMainMenu(chatId, lang);
    }

    private async getActiveCategories() {
        return this.withCache<CategoryRecord[]>(
            'catalog:categories',
            async () =>
                this.db
                    .select()
                    .from(categories)
                    .where(eq(categories.isActive, 1))
                    .orderBy(asc(categories.sort)),
            300,
        );
    }

    private async getCategoryWithProducts(categoryId: string) {
        return this.withCache<CategoryWithProducts | null>(
            `catalog:category:${categoryId}`,
            async () => {
                const [category] = await this.db
                    .select()
                    .from(categories)
                    .where(eq(categories.id, categoryId))
                    .limit(1);

                if (!category) {
                    return null;
                }

                const list = await this.db
                    .select()
                    .from(products)
                    .where(and(eq(products.categoryId, categoryId), eq(products.isActive, 1)))
                    .orderBy(asc(products.sort), desc(products.createdAt));

                return { category, products: list } as CategoryWithProducts;
            },
            120,
        );
    }

    private async withCache<T>(key: string, loader: () => Promise<T>, ttlSeconds = DEFAULT_CACHE_TTL) {
        if (!this.env.BOTSHOP_KV) {
            return loader();
        }

        const now = Date.now();

        try {
            const cached = (await this.env.BOTSHOP_KV.get(key, { type: 'json' })) as CacheEnvelope<T> | null;
            if (cached && cached.expiredAt > now) {
                return cached.payload;
            }
        } catch (error) {
            console.warn(`cache read failed: ${key}`, error);
        }

        const payload = await loader();

        if (payload !== undefined) {
            const envelope: CacheEnvelope<T> = { payload, expiredAt: now + ttlSeconds * 1000 };
            try {
                await this.env.BOTSHOP_KV.put(key, JSON.stringify(envelope), { expirationTtl: ttlSeconds });
            } catch (error) {
                console.warn(`cache write failed: ${key}`, error);
            }
        }

        return payload;
    }

    private text(key: string, lang: LanguageCode, values?: Record<string, unknown>) {
        return translate(key, lang, values);
    }

    private mapLanguage(input?: string | null): LanguageCode | undefined {
        if (!input) return undefined;
        const value = input.toLowerCase();
        if (value.startsWith('zh')) return 'zh';
        if (value.startsWith('en')) return 'en';
        return undefined;
    }

    private normalizeLanguage(input?: string | null): LanguageCode {
        return this.mapLanguage(input) ?? DEFAULT_LANGUAGE;
    }

    private async resolveLanguage(user?: TelegramUserPayload) {
        if (!user) {
            return DEFAULT_LANGUAGE;
        }

        const profile = await this.fetchUserWithRegister(user.id);
        if (profile?.register.language) {
            return this.normalizeLanguage(profile.register.language);
        }

        return this.normalizeLanguage(user.language_code);
    }

    private parseCallbackData(data: string) {
        const [action, ...args] = data.split(CALLBACK_SEPARATOR).map((part) => decodeURIComponent(part));
        return { action, args };
    }

    private cb(action: string, ...args: Array<string | number>) {
        const chunk = [action, ...args.map((arg) => encodeURIComponent(String(arg)))];
        return chunk.join(CALLBACK_SEPARATOR);
    }

    private chunkButtons(buttons: InlineButton[], size: number) {
        const keyboard: InlineButton[][] = [];
        for (let i = 0; i < buttons.length; i += size) {
            keyboard.push(buttons.slice(i, i + size));
        }
        return keyboard;
    }

    private parsePriceMap(raw: string, fallbackCurrency: string) {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'number') {
                return { [fallbackCurrency]: parsed } as Record<string, number>;
            }
            if (typeof parsed === 'object' && parsed) {
                const entries = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                    const num = Number(value);
                    if (!Number.isNaN(num)) acc[key] = num;
                    return acc;
                }, {});
                if (Object.keys(entries).length) {
                    return entries;
                }
            }
        } catch (error) {
            console.warn('price parse failed', error);
        }
        const fallbackValue = Number(raw);
        return { [fallbackCurrency]: Number.isFinite(fallbackValue) ? fallbackValue : 0 };
    }

    private formatPriceLabel(product: ProductRecord) {
        const priceMap = this.parsePriceMap(product.price, product.defaultCurrency);
        const amount = priceMap[product.defaultCurrency] ?? Number(Object.values(priceMap)[0] ?? 0);
        return `${product.defaultCurrency} ${amount.toFixed(2)}`;
    }

    private describeDelivery(mode: string, lang: LanguageCode) {
        switch (mode) {
            case 'code':
                return this.text('delivery.code', lang);
            case 'text':
                return this.text('delivery.text', lang);
            case 'manual':
                return this.text('delivery.manual', lang);
            default:
                return this.text('delivery.other', lang);
        }
    }

    private async loadProductAttachment(productId: string) {
        try {
            const objectKey = `products/${productId}/readme.txt`;
            const object = await this.env.BOTSHOP_BUCKET.get(objectKey);
            if (!object) return null;
            const text = await object.text();
            return text.slice(0, 500);
        } catch (error) {
            console.warn('loadProductAttachment failed', error);
            return null;
        }
    }

    private async popInventoryCode(productId: string) {
        const key = `inventory:${productId}`;
        const payload = (await this.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes;
        if (!codes || !codes.length) {
            return null;
        }
        const code = codes.shift() ?? null;
        await this.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
        return code;
    }

    private async pushInventoryCode(productId: string, code: string) {
        const key = `inventory:${productId}`;
        const payload = (await this.env.BOTSHOP_KV.get(key, { type: 'json' })) as InventoryPayload;
        const codes = Array.isArray(payload) ? payload : payload?.codes ?? [];
        codes.unshift(code);
        await this.env.BOTSHOP_KV.put(key, JSON.stringify({ codes }));
    }

    private async getOrCreateUser(profile: TelegramUserPayload, preferredLang?: LanguageCode) {
        const existing = await this.fetchUserWithRegister(profile.id);
        if (existing) {
            const interactionAt = dayjs().toISOString();
            const storedLanguage = this.normalizeLanguage(existing.register.language);
            let language = storedLanguage;

            await this.db
                .update(users)
                .set({ lastInteractionAt: interactionAt, updatedAt: interactionAt })
                .where(eq(users.id, existing.user.id));

            if (preferredLang && preferredLang !== storedLanguage) {
                await this.db
                    .update(userRegisters)
                    .set({ language: preferredLang, updatedAt: interactionAt })
                    .where(eq(userRegisters.uid, existing.user.id));
                language = preferredLang;
            }

            return {
                userId: existing.user.id,
                username: existing.register.username,
                password: existing.register.password,
                language,
            };
        }

        const userId = uuidv4();
        const now = dayjs().toISOString();
        const nickname = profile.first_name ?? profile.username ?? `Guest${profile.id}`;
        const avatar = profile.username ? `https://t.me/i/userpic/320/${profile.username}.jpg` : 'https://placehold.co/200x200';
        const username = profile.username ? profile.username.toLowerCase() : `user_${profile.id}`;
        const password = this.generatePassword();
        const language = preferredLang ?? this.normalizeLanguage(profile.language_code);

        await this.db.insert(users).values({
            id: userId,
            nickname,
            avatar,
            isBlocked: 0,
            lastInteractionAt: now,
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(userRegisters).values({
            uid: userId,
            source: 'telegram',
            thirdId: profile.id,
            username,
            password,
            registerIp: 'telegram',
            language,
            createdAt: now,
            updatedAt: now,
        });

        return { userId, username, password, language };
    }

    private async fetchUserWithRegister(telegramId: number) {
        const [record] = await this.db
            .select({
                register: userRegisters,
                user: users,
            })
            .from(userRegisters)
            .innerJoin(users, eq(userRegisters.uid, users.id))
            .where(eq(userRegisters.thirdId, telegramId))
            .limit(1);
        return record ?? null;
    }

    private generatePassword(length = 10) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    }
}
