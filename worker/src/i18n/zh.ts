const zh = {
	errors: {
		invalidAction: '无效操作',
		noCategory: '未找到对应分类。',
		categoryUnavailable: '分类不存在或已下架。',
		productMissing: '未找到该商品。',
		productUnavailable: '该商品已下架或不可购买。',
		outOfStock: '库存不足，请选择其他商品。',
		inventoryEmpty: '兑换码库存不足，请稍后再试。',
		orderFailed: '下单失败，请稍后再试。',
		accountMissing: '未找到账户，请先发送 /start 注册。',
	},
	welcome: {
		title: '欢迎来到 BotShop 虚拟商品店 🛒',
		accountCreated: '我们已为你创建独立账户，随时可在网页端或其他入口登录。',
		credentials: '用户名: {{username}}\n密码: {{password}}',
		returning: '欢迎回来，直接通过下方菜单继续购物吧。',
		caution: '请妥善保管该信息，如需重置可随时联系在线客服。',
	},
	menu: {
		prompt: '请选择要执行的操作：',
		buttons: {
			shop: '🛍️ 立即选购',
			orders: '📦 我的订单',
			account: '👤 我的账户',
			support: '🆘 联系客服',
			language: '🌐 语言设置',
		},
	},
	categories: {
		prompt: '请选择感兴趣的分类：',
		empty: '暂时没有可选分类，请稍后再来。',
		unavailable: '分类不存在或已下架。',
		noProducts: '{{name}} 暂无商品，稍后看看其它分类吧。',
		subPrompt: '请选择 {{name}} 的子分类：',
		noChildren: '{{name}} 暂无子分类，可直接查看商品。',
		viewProducts: '查看 {{name}} 商品',
		title: '{{emoji}} {{name}}',
	},
	navigation: {
		home: '🏠 返回首页',
		backCategories: '🔙 返回分类',
		back: '🔙 返回上一页',
		backParent: '⬅️ 返回上级',
		continueShopping: '继续选购',
		viewOrders: '查看订单',
	},
	product: {
		noDescription: '暂无简介',
		title: '商品：{{title}}',
		description: '{{description}}',
		price: '价格：{{price}}',
		stock: '库存：{{stock}} 件',
		delivery: '交付方式：{{delivery}}',
		media: '展示图：{{url}}',
		instructions: '说明：{{text}}',
		attachment: '附件：{{text}}',
		buttons: {
			buy: '⚡ 立即购买',
		},
	},
	delivery: {
		code: '自动发放兑换码',
		text: '文本内附交付信息',
		manual: '人工线下处理',
		other: '其他方式',
	},
	purchase: {
		successTitle: '✅ 下单成功，已为你就地完成支付与交付。',
		orderSn: '订单编号：{{orderSn}}',
		product: '商品：{{title}}',
		amount: '金额：{{currency}} {{amount}}',
		delivery: '交付方式：{{delivery}}',
		code: '兑换码：{{code}}',
		instructions: '使用说明：{{text}}',
		attachment: '附件内容：{{text}}',
	},
	orders: {
		none: '暂无订单，去挑选一件喜欢的商品吧。',
		latestTitle: '最近订单',
		item:
			'#{{orderSn}}\n商品：{{product}}\n金额：{{currency}} {{amount}}\n状态：{{status}}\n时间：{{time}}',
	},
	orderStatus: {
		pending: '待处理',
		awaiting_payment: '待支付',
		paid: '已支付',
		delivering: '派送中',
		delivered: '已交付',
		awaiting_stock: '待补货',
		failed: '失败',
		refunded: '已退款',
		expired: '已过期',
	},
	account: {
		title: '👤 账户信息',
		nickname: '昵称：{{nickname}}',
		username: '用户名：{{username}}',
		passwordHidden: '密码：已加密保存，如需重置请联系客服。',
		registeredAt: '注册时间：{{time}}',
		lastActive: '最近活跃：{{time}}',
	},
	support: {
		title: '📮 客服 & 售后',
		body:
			'• 如果需要人工协助、补单、重置密码，请访问以下链接提交工单。\n• 支持入口：{{url}}\n• 也可直接回复此消息，我们会在最短时间内跟进。',
	},
	language: {
		prompt: '请选择要使用的语言：',
		current: '当前语言：{{languageName}}',
		updated: '语言已切换为 {{languageName}}。',
		options: {
			zh: '中文',
			en: 'English',
		},
	},
} as const;

export type ZhTranslation = typeof zh;

export default zh;
