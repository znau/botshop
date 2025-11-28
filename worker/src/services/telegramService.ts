import { TelegramBot } from '../utils/telegramBot';
import { createDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { t as translate } from '../i18n/i18n';
import type {
    TelegramUpdate,
    TelegramMessage,
    TelegramCallbackQuery,
    TelegramUserPayload,
} from '../types';
import { CategoryService, type CategoryRecord } from './categoryService';
import { OrderService } from './orderService';
import { ProductService } from './productService';
import {
    UserService,
    DEFAULT_LANGUAGE,
    LANGUAGE_CODES,
    type LanguageCode,
} from './userService';

type InlineButton = { text: string; callback_data: string };

const CALLBACK_SEPARATOR = '|';

/**
 * Orchestrates Telegram webhook updates, delegating domain work to sub-services.
 */
export class TelegramService {
    private readonly bot: TelegramBot;
    private readonly db: ReturnType<typeof createDb>;
    private readonly userService: UserService;
    private readonly categoryService: CategoryService;
    private readonly productService: ProductService;
    private readonly orderService: OrderService;

    /**
     * @param env Cloudflare bindings passed to downstream services.
     */
    constructor(private readonly env: Env) {
        this.bot = new TelegramBot(env);
        this.db = createDb(env);
        this.userService = new UserService(this.db);
        this.categoryService = new CategoryService(env, this.db);
        this.productService = new ProductService(env, this.db);
        this.orderService = new OrderService(this.db);
    }

    /**
     * Entry point invoked by the worker route; dispatches message vs. callback updates.
     * @param update Telegram webhook payload.
     */
    async handleUpdate(update: TelegramUpdate) {
        if (update.message) {
            await this.handleMessage(update.message);
            return;
        }

        if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query);
        }
    }

    /**
     * Handles plain chat messages and dispatches /start or menu rendering.
     * @param message Telegram message object.
     */
    private async handleMessage(message: TelegramMessage) {
        if (!message.from) return;
        const text = message.text ?? '';
        const chatId = message.chat.id;

        if (text.startsWith('/start')) {
            await this.handleStart(chatId, message.from);
            return;
        }

        const lang = await this.userService.resolveLanguage(message.from);
        await this.showMainMenu(chatId, lang);
    }

    /**
     * Handles inline keyboard interactions and edits the originating message when possible.
     * @param query Telegram callback query payload.
     */
    private async handleCallbackQuery(query: TelegramCallbackQuery) {
        const chatId = query.message?.chat.id;
        const lang = query.from ? await this.userService.resolveLanguage(query.from) : DEFAULT_LANGUAGE;

        if (!chatId || !query.data) {
            if (query.id) {
                await this.bot.answerCallbackQuery(query.id, this.text('errors.invalidAction', lang));
            }
            return;
        }

        await this.bot.answerCallbackQuery(query.id);
        const payload = this.parseCallbackData(query.data);
        const originMessage = query.message;

        switch (payload.action) {
            case 'home':
            case 'shop_start':
                await this.showMainMenu(chatId, lang, originMessage);
                break;
            case 'categories':
                await this.showCategories(chatId, lang, undefined, undefined, originMessage);
                break;
            case 'category':
                await this.handleCategorySelection(chatId, lang, payload.args[0], originMessage);
                break;
            case 'category_products':
                await this.showProductsByCategory(chatId, lang, payload.args[0], originMessage);
                break;
            case 'product':
                await this.showProductDetail(chatId, lang, payload.args[0], originMessage);
                break;
            case 'buy':
                if (query.from) {
                    await this.handleBuy(chatId, query.from, payload.args[0], lang);
                }
                break;
            case 'orders':
                if (query.from) {
                    await this.showLatestOrders(chatId, query.from, lang, originMessage);
                }
                break;
            case 'account':
                if (query.from) {
                    await this.showAccount(chatId, query.from, lang, originMessage);
                }
                break;
            case 'support':
                await this.showSupport(chatId, lang, originMessage);
                break;
            case 'lang_menu':
                await this.showLanguageMenu(chatId, lang, originMessage);
                break;
            case 'lang_set':
                await this.setLanguage(chatId, query.from, payload.args[0], lang, originMessage);
                break;
            default:
                await this.showMainMenu(chatId, lang, originMessage);
        }
    }

    /**
     * Handles /start by creating an account on first contact then showing the menu.
     * @param chatId Telegram chat id.
     * @param telegramUser Telegram user payload.
     */
    private async handleStart(chatId: number, telegramUser: TelegramUserPayload) {
        const preferred = this.userService.mapLanguage(telegramUser.language_code) ?? DEFAULT_LANGUAGE;
        const credentials = await this.userService.getOrCreateUser(telegramUser, preferred);
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

    /**
     * Renders the root inline menu.
     * @param chatId Telegram chat id.
     * @param lang Language code for translations.
     * @param originMessage Optional message to edit.
     */
    private async showMainMenu(chatId: number, lang: LanguageCode, originMessage?: TelegramMessage) {
        const keyboard: InlineButton[][] = [
            [{ text: this.text('menu.buttons.shop', lang), callback_data: this.cb('categories') }],
            [
                { text: this.text('menu.buttons.orders', lang), callback_data: this.cb('orders') },
                { text: this.text('menu.buttons.account', lang), callback_data: this.cb('account') },
            ],
            [
                { text: this.text('menu.buttons.support', lang), callback_data: this.cb('support') },
                { text: this.text('menu.buttons.language', lang), callback_data: this.cb('lang_menu') },
            ],
        ];

        await this.renderMenu(chatId, this.text('menu.prompt', lang), keyboard, originMessage);
    }

    /**
     * Renders category tree navigation; reuses preloaded data to avoid duplicate queries.
     * @param chatId Telegram chat id.
     * @param lang Language code for translations.
     * @param parentId Optional parent category id.
     * @param preloaded Optional cached category list to reuse.
     * @param originMessage Optional message to edit inline.
     */
    private async showCategories(
        chatId: number,
        lang: LanguageCode,
        parentId?: string,
        preloaded?: CategoryRecord[],
        originMessage?: TelegramMessage,
    ) {
        const allCategories = preloaded ?? (await this.categoryService.getActiveCategories());
        const parent = parentId ? allCategories.find((item) => item.id === parentId) : undefined;
        if (parentId && !parent) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        const children = allCategories.filter((item) => (item.parentId ?? null) === (parentId ?? null));

        if (!children.length) {
            if (parent) {
                await this.showProductsByCategory(chatId, lang, parent.id, originMessage);
                return;
            }

            await this.renderMenu(
                chatId,
                this.text('categories.empty', lang),
                [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
                originMessage,
            );
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

        await this.renderMenu(chatId, title, keyboard, originMessage);
    }

    /**
     * Branches between showing subcategories or products for a selected node.
     * @param chatId Telegram chat id.
     * @param lang Language code for translations.
     * @param categoryId Selected category id.
     * @param originMessage Optional message to edit inline.
     */
    private async handleCategorySelection(
        chatId: number,
        lang: LanguageCode,
        categoryId?: string,
        originMessage?: TelegramMessage,
    ) {
        if (!categoryId) {
            await this.bot.sendMessage(chatId, this.text('errors.noCategory', lang));
            return;
        }

        const categories = await this.categoryService.getActiveCategories();
        const target = categories.find((item) => item.id === categoryId);

        if (!target) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        const children = categories.filter((item) => item.parentId === categoryId);
        if (children.length) {
            await this.showCategories(chatId, lang, categoryId, categories, originMessage);
            return;
        }

        await this.showProductsByCategory(chatId, lang, categoryId, originMessage);
    }

    /**
     * Lists products under a category and routes empty states appropriately.
     * @param chatId Telegram chat id.
     * @param lang Language code for translations.
     * @param categoryId Category to load.
     * @param originMessage Optional message to edit inline.
     */
    private async showProductsByCategory(
        chatId: number,
        lang: LanguageCode,
        categoryId?: string,
        originMessage?: TelegramMessage,
    ) {
        if (!categoryId) {
            await this.bot.sendMessage(chatId, this.text('errors.noCategory', lang));
            return;
        }

        const catalogNode = await this.categoryService.getCategoryWithProducts(categoryId);
        const category = catalogNode?.category;
        const list = catalogNode?.products ?? [];

        if (!category) {
            await this.bot.sendMessage(chatId, this.text('categories.unavailable', lang));
            return;
        }

        if (!list.length) {
            const emptyKeyboard: InlineButton[][] = [
                [{ text: this.text('navigation.backCategories', lang), callback_data: this.cb('categories') }],
                [{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }],
            ];
            await this.renderMenu(
                chatId,
                this.text('categories.noProducts', lang, { name: category.name }),
                emptyKeyboard,
                originMessage,
            );
            return;
        }

        const buttons = list.map((item) => ({
            text: `${item.title} · ${this.productService.formatPriceLabel(item)}`,
            callback_data: this.cb('product', item.id),
        }));

        const keyboard = this.chunkButtons(buttons, 1);
        keyboard.push([
            { text: this.text('navigation.backCategories', lang), callback_data: this.cb('categories') },
            { text: this.text('navigation.home', lang), callback_data: this.cb('home') },
        ]);

        await this.renderMenu(
            chatId,
            this.text('categories.title', lang, {
                emoji: category.emoji ?? '📁',
                name: category.name,
            }),
            keyboard,
            originMessage,
        );
    }

    /**
     * Displays product detail with attachments and buy button inline.
     * @param chatId Telegram chat id.
     * @param lang Language code.
     * @param productId Product id to show.
     * @param originMessage Optional message to edit inline.
     */
    private async showProductDetail(
        chatId: number,
        lang: LanguageCode,
        productId?: string,
        originMessage?: TelegramMessage,
    ) {
        if (!productId) {
            await this.bot.sendMessage(chatId, this.text('errors.productMissing', lang));
            return;
        }

        const product = await this.productService.findActiveProduct(productId);

        if (!product) {
            await this.bot.sendMessage(chatId, this.text('errors.productUnavailable', lang));
            return;
        }

        const attachment = await this.productService.loadProductAttachment(product.id);
        const infoLines = [
            this.text('product.title', lang, { title: product.title }),
            product.description
                ? this.text('product.description', lang, { description: product.description })
                : this.text('product.noDescription', lang),
            '',
            this.text('product.price', lang, { price: this.productService.formatPriceLabel(product) }),
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

        const keyboard: InlineButton[][] = [
            [{ text: this.text('product.buttons.buy', lang), callback_data: this.cb('buy', product.id) }],
            [
                { text: this.text('navigation.backCategories', lang), callback_data: this.cb('category', product.categoryId) },
                { text: this.text('navigation.home', lang), callback_data: this.cb('home') },
            ],
        ];

        await this.renderMenu(chatId, infoLines.join('\n'), keyboard, originMessage);
    }

    /**
     * Inline “buy” flow that reserves inventory, creates delivery records, and sends receipt.
     * @param chatId Telegram chat id.
     * @param telegramUser Telegram user initiating the purchase.
     * @param productId Product being purchased.
     * @param preferredLang Optional language override.
     */
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

        const profile = await this.userService.getOrCreateUser(telegramUser, preferredLang);
        const lang = profile.language;
        const product = await this.productService.findActiveProduct(productId);

        if (!product) {
            await this.bot.sendMessage(chatId, this.text('errors.productUnavailable', lang));
            return;
        }

        if (product.stock <= 0) {
            await this.bot.sendMessage(chatId, this.text('errors.outOfStock', lang));
            return;
        }

        const priceMap = this.productService.parsePriceMap(product.price, product.defaultCurrency);
        const unitAmount = priceMap[product.defaultCurrency] ?? Number(Object.values(priceMap)[0] ?? 0);
        const currency = product.defaultCurrency;
        const now = dayjs().toISOString();
        const quantity = 1;
        const orderId = uuidv4();
        const orderSn = `${dayjs().format('YYYYMMDDHHmmssSSS')}-${telegramUser.id}`;
        const paymentInvoiceId = `inline-${orderId}`;

        let reservedCode: string | null = null;
        if (product.deliveryMode === 'code') {
            reservedCode = await this.productService.popInventoryCode(product.id);
            if (!reservedCode) {
                await this.bot.sendMessage(chatId, this.text('errors.inventoryEmpty', lang));
                return;
            }
        }

        try {
            const paymentJson = JSON.stringify({
                method: 'inline',
                paidAt: now,
                currency,
                amount: unitAmount * quantity,
            });
            await this.orderService.createDeliveredOrder({
                orderId,
                orderSn,
                userId: profile.userId,
                product,
                quantity,
                unitAmount,
                currency,
                paymentInvoiceId,
                paymentJson,
                createdAt: now,
            });
        } catch (error) {
            console.error('order creation failed', error);
            if (reservedCode) {
                await this.productService.pushInventoryCode(product.id, reservedCode);
            }
            await this.bot.sendMessage(chatId, this.text('errors.orderFailed', lang));
            return;
        }

        const attachment = await this.productService.loadProductAttachment(product.id);
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

    /**
     * Renders the latest orders for the authenticated user.
     * @param chatId Telegram chat id.
     * @param telegramUser Telegram user payload.
     * @param lang Language code.
     * @param originMessage Optional message to edit.
     */
    private async showLatestOrders(
        chatId: number,
        telegramUser: TelegramUserPayload,
        lang: LanguageCode,
        originMessage?: TelegramMessage,
    ) {
        const profile = await this.userService.fetchUserWithRegister(telegramUser.id);
        if (!profile) {
            await this.bot.sendMessage(chatId, this.text('errors.accountMissing', lang));
            return;
        }

        const rows = await this.orderService.listLatestOrdersByUid(profile.register.uid, 5);

        if (!rows.length) {
            await this.renderMenu(
                chatId,
                this.text('orders.none', lang),
                [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
                originMessage,
            );
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

        await this.renderMenu(
            chatId,
            body,
            [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            originMessage,
        );
    }

    /**
     * Shows stored account credentials and metadata.
     * @param chatId Telegram chat id.
     * @param telegramUser Telegram user payload.
     * @param lang Language code.
     * @param originMessage Optional message to edit.
     */
    private async showAccount(
        chatId: number,
        telegramUser: TelegramUserPayload,
        lang: LanguageCode,
        originMessage?: TelegramMessage,
    ) {
        const profile = await this.userService.fetchUserWithRegister(telegramUser.id);
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

        await this.renderMenu(
            chatId,
            lines.join('\n'),
            [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            originMessage,
        );
    }

    /**
     * Shows support contact info.
     * @param chatId Telegram chat id.
     * @param lang Language code.
     * @param originMessage Optional message to edit.
     */
    private async showSupport(chatId: number, lang: LanguageCode, originMessage?: TelegramMessage) {
        const supportUrl = this.env.BASE_URL ? `${this.env.BASE_URL}/support` : 'https://t.me';
        const lines = [
            this.text('support.title', lang),
            this.text('support.body', lang, { url: supportUrl }),
        ];

        await this.renderMenu(
            chatId,
            lines.join('\n'),
            [[{ text: this.text('navigation.home', lang), callback_data: this.cb('home') }]],
            originMessage,
        );
    }

    /**
     * Renders the language selection menu.
     * @param chatId Telegram chat id.
     * @param lang Current language code.
     * @param originMessage Optional message to edit.
     */
    private async showLanguageMenu(chatId: number, lang: LanguageCode, originMessage?: TelegramMessage) {
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

        await this.renderMenu(chatId, lines.join('\n'), keyboard, originMessage);
    }

    /**
     * Persists a new preferred language before re-rendering the home menu.
     * @param chatId Telegram chat id.
     * @param telegramUser Telegram user payload (optional when missing context).
     * @param target Language code chosen via menu.
     * @param currentLang Fallback language when user unset.
     * @param originMessage Optional message to edit.
     */
    private async setLanguage(
        chatId: number,
        telegramUser: TelegramUserPayload | undefined,
        target?: string,
        currentLang: LanguageCode = DEFAULT_LANGUAGE,
        originMessage?: TelegramMessage,
    ) {
        if (!telegramUser) {
            await this.bot.sendMessage(chatId, this.text('errors.accountMissing', currentLang));
            return;
        }

        const preferred = this.userService.mapLanguage(target) ?? currentLang;
        const profile = await this.userService.getOrCreateUser(telegramUser, preferred);
        const lang = profile.language;
        const confirmation = this.text('language.updated', lang, {
            languageName: this.text(`language.options.${lang}`, lang),
        });

        await this.bot.sendMessage(chatId, confirmation);
        await this.showMainMenu(chatId, lang, originMessage);
    }

    /**
     * Convenience wrapper for the translator.
     * @param key Translation key.
     * @param lang Language code.
     * @param values Optional interpolation values.
     * @returns Localized string.
     */
    private text(key: string, lang: LanguageCode, values?: Record<string, unknown>) {
        return translate(key, lang, values);
    }

    /**
     * Parses callback data into action + args.
     * @param data Encoded callback string.
     * @returns Action + args tuple.
     */
    private parseCallbackData(data: string) {
        const [action, ...args] = data.split(CALLBACK_SEPARATOR).map((part) => decodeURIComponent(part));
        return { action, args };
    }

    /**
     * Encodes actions and args for callback_data.
     * @param action Action name.
     * @param args Optional arguments to encode.
     * @returns Encoded callback string.
     */
    private cb(action: string, ...args: Array<string | number>) {
        const chunk = [action, ...args.map((arg) => encodeURIComponent(String(arg)))];
        return chunk.join(CALLBACK_SEPARATOR);
    }

    /**
     * Attempts to edit the inline keyboard in place; falls back to sending a fresh message.
     * @param chatId Telegram chat id.
     * @param text Body text to render.
     * @param keyboard Inline keyboard layout.
     * @param originMessage Message to edit when available.
     */
    private async renderMenu(
        chatId: number,
        text: string,
        keyboard: InlineButton[][],
        originMessage?: TelegramMessage,
    ) {
        if (originMessage?.message_id) {
            try {
                await this.bot.editMessageText(chatId, originMessage.message_id, text, {
                    replyMarkup: { inline_keyboard: keyboard },
                });
                return;
            } catch (error) {
                console.warn('inline menu edit failed, falling back to sendMessage', error);
            }
        }

        await this.bot.sendMessage(chatId, text, {
            replyMarkup: { inline_keyboard: keyboard },
        });
    }

    /**
     * Breaks a flat button array into evenly sized rows for Telegram keyboards.
     * @param buttons Buttons to chunk.
     * @param size Row size.
     * @returns 2D keyboard array.
     */
    private chunkButtons(buttons: InlineButton[], size: number) {
        const keyboard: InlineButton[][] = [];
        for (let i = 0; i < buttons.length; i += size) {
            keyboard.push(buttons.slice(i, i + size));
        }
        return keyboard;
    }

    /**
     * Maps delivery mode enum to localized copy for receipts and detail pages.
     * @param mode Delivery mode string.
     * @param lang Language code.
     * @returns Localized label.
     */
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
}
