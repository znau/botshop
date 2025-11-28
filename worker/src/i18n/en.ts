const en = {
	errors: {
		invalidAction: 'Invalid action',
		noCategory: 'Category not specified.',
		categoryUnavailable: 'Category not found or inactive.',
		productMissing: 'Product not found.',
		productUnavailable: 'This product is unavailable.',
		outOfStock: 'Out of stock. Please pick another item.',
		inventoryEmpty: 'No redemption codes left. Please try later.',
		orderFailed: 'Order failed. Please try again shortly.',
		accountMissing: 'Account not found. Send /start to register first.',
	},
	welcome: {
		title: 'Welcome to BotShop 🛒',
		accountCreated: 'A dedicated account has been created for you. You can log in via any entry point.',
		credentials: 'Username: {{username}}\nPassword: {{password}}',
		returning: 'Welcome back! Jump right in using the menu below.',
		caution: 'Keep this information safe. Contact support anytime for resets.',
	},
	menu: {
		prompt: 'What would you like to do?',
		buttons: {
			shop: '🛍️ Browse Catalog',
			orders: '📦 My Orders',
			account: '👤 My Account',
			support: '🆘 Support',
			language: '🌐 Language',
		},
	},
	categories: {
		prompt: 'Pick a category:',
		empty: 'No categories are available right now. Please check back later.',
		unavailable: 'Category not found or inactive.',
		noProducts: '{{name}} has no products yet. Please try another category.',
		subPrompt: 'Pick a sub-category under {{name}}:',
		noChildren: '{{name}} has no child categories. Go straight to its products.',
		viewProducts: 'View {{name}} items',
		title: '{{emoji}} {{name}}',
	},
	navigation: {
		home: '🏠 Back to Home',
		backCategories: '🔙 Back to Categories',
		back: '🔙 Go Back',
		backParent: '⬅️ Back to Parent',
		continueShopping: 'Continue Shopping',
		viewOrders: 'View Orders',
	},
	product: {
		noDescription: 'No description yet.',
		title: 'Product: {{title}}',
		description: '{{description}}',
		price: 'Price: {{price}}',
		stock: 'Stock: {{stock}} pcs',
		delivery: 'Delivery: {{delivery}}',
		media: 'Preview: {{url}}',
		instructions: 'Notes: {{text}}',
		attachment: 'Attachment: {{text}}',
		buttons: {
			buy: '⚡ Buy Now',
		},
	},
	delivery: {
		code: 'Instant code delivery',
		text: 'Text instructions inside the order',
		manual: 'Manual processing',
		other: 'Other method',
	},
	purchase: {
		successTitle: '✅ Order completed and fulfilled instantly.',
		orderSn: 'Order #: {{orderSn}}',
		product: 'Product: {{title}}',
		amount: 'Amount: {{currency}} {{amount}}',
		delivery: 'Delivery: {{delivery}}',
		code: 'Code: {{code}}',
		instructions: 'Instructions: {{text}}',
		attachment: 'Attachment: {{text}}',
	},
	orders: {
		none: 'No orders yet. Grab something you like!',
		latestTitle: 'Latest Orders',
		item:
			'#{{orderSn}}\nProduct: {{product}}\nAmount: {{currency}} {{amount}}\nStatus: {{status}}\nTime: {{time}}',
	},
	orderStatus: {
		pending: 'Pending',
		awaiting_payment: 'Awaiting payment',
		paid: 'Paid',
		delivering: 'Delivering',
		delivered: 'Delivered',
		awaiting_stock: 'Awaiting stock',
		failed: 'Failed',
		refunded: 'Refunded',
		expired: 'Expired',
	},
	account: {
		title: '👤 Account Info',
		nickname: 'Nickname: {{nickname}}',
		username: 'Username: {{username}}',
		passwordHidden: 'Password: encrypted (contact support to reset).',
		registeredAt: 'Registered: {{time}}',
		lastActive: 'Last active: {{time}}',
	},
	support: {
		title: '📮 Support & Care',
		body:
			'• Need manual help, resends, or reset? Visit the link below.\n• Portal: {{url}}\n• Or just reply here and we will follow up soon.',
	},
	language: {
		prompt: 'Choose your preferred language:',
		current: 'Current language: {{languageName}}',
		updated: 'Language switched to {{languageName}}.',
		options: {
			zh: 'Chinese',
			en: 'English',
		},
	},
} as const;

export type EnTranslation = typeof en;

export default en;
