import { mountPage } from "../shared.js";

mountPage(({ api, setStatus, escapeHtml }) => {
	let categories = [];
	let products = [];
	const tbody = document.querySelector('[data-table="products"] tbody');
	const refreshBtn = document.querySelector('[data-action="refresh-products"]');
	const form = document.getElementById('product-form');
	const resetBtn = document.querySelector('[data-action="reset-product"]');
	const categorySelect = document.getElementById('product-category');
	const mediaInput = document.getElementById('product-media-file');

	const getField = (name) => {
		if (!form) return null;
		const field = form.elements.namedItem(name);
		if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
			return field;
		}
		return null;
	};

	const getValue = (name) => {
		const field = getField(name);
		return field ? field.value : '';
	};

	const setField = (name, value) => {
		const field = getField(name);
		if (field) {
			field.value = value ?? '';
		}
	};

	const renderCategories = () => {
		if (!categorySelect) return;
		categorySelect.innerHTML = categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
	};

	const renderProducts = () => {
		if (!tbody) return;
		tbody.innerHTML = products
			.map((product) => {
				const category = categories.find((cat) => cat.id === product.categoryId);
				const price = product.priceMap?.[product.defaultCurrency] ?? '-';
				return `
				<tr>
					<td>${escapeHtml(product.title)}</td>
					<td>${escapeHtml(category ? category.name : product.categoryId)}</td>
					<td>${escapeHtml(product.defaultCurrency)} ${escapeHtml(price)}</td>
					<td>${escapeHtml(product.stock)}</td>
					<td>
						<div style="display:flex;gap:8px;flex-wrap:wrap;">
							<button class="secondary" data-action="edit" data-id="${product.id}">编辑</button>
							<button class="danger" data-action="delete" data-id="${product.id}">删除</button>
						</div>
					</td>
				</tr>`;
			})
			.join('');
	};

	const refresh = async () => {
		setStatus('正在加载商品数据...');
		const [catData, productData] = await Promise.all([
			api('/categories'),
			api('/products'),
		]);
		categories = catData.categories || [];
		products = productData.products || [];
		renderCategories();
		renderProducts();
		setStatus('商品数据已同步');
	};

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!form) return;
		const formData = new FormData(form);
		let priceMap;
		try {
			priceMap = JSON.parse(formData.get('priceMap') || '{}');
		} catch (error) {
			setStatus('价格映射必须是合法 JSON', 'error');
			return;
		}
		const payload = {
			slug: formData.get('slug'),
			categoryId: formData.get('categoryId'),
			title: formData.get('title'),
			description: formData.get('description') || undefined,
			mediaUrl: formData.get('mediaUrl') || undefined,
			defaultCurrency: formData.get('defaultCurrency'),
			acceptedCurrencies: String(formData.get('acceptedCurrencies') || '')
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean),
			priceMap,
			stock: Number(formData.get('stock') || 0),
			deliveryMode: formData.get('deliveryMode') || 'code',
			deliveryInstructions: formData.get('deliveryInstructions') || undefined,
		};
		const id = formData.get('id');
		setStatus('保存中...');
		if (id) {
			await api(`/products/${id}`, { method: 'PUT', body: payload });
		} else {
			await api('/products', { method: 'POST', body: payload });
		}
		form.reset();
		await refresh();
		setStatus('商品已保存');
	});

	resetBtn?.addEventListener('click', () => form?.reset());

	tbody?.addEventListener('click', async (event) => {
		const button = event.target instanceof HTMLElement ? event.target.closest('button[data-action]') : null;
		if (!button) return;
		const id = button.getAttribute('data-id');
		const action = button.getAttribute('data-action');
		if (!id || !action) return;
		if (action === 'edit') {
			const product = products.find((item) => item.id === id);
			if (!product) return;
			setField('id', product.id);
			setField('slug', product.slug);
			setField('categoryId', product.categoryId);
			setField('title', product.title);
			setField('description', product.description || '');
			setField('mediaUrl', product.mediaUrl || '');
			setField('defaultCurrency', product.defaultCurrency);
			setField('acceptedCurrencies', product.acceptedCurrencies.join(','));
			setField('priceMap', JSON.stringify(product.priceMap, null, 2));
			setField('stock', product.stock);
			setField('deliveryMode', product.deliveryMode);
			setField('deliveryInstructions', product.deliveryInstructions || '');
		}
		if (action === 'delete') {
			if (!confirm('确定删除该商品吗？')) return;
			await api(`/products/${id}`, { method: 'DELETE' });
			await refresh();
			setStatus('商品已删除');
		}
	});

	mediaInput?.addEventListener('change', async (event) => {
		const input = event.target instanceof HTMLInputElement ? event.target : null;
		if (!input || !input.files || !input.files[0]) return;
		const file = input.files[0];
		const formData = new FormData();
		formData.append('file', file);
		const id = getValue('id');
		if (id) formData.append('productId', id);
		setStatus('上传中...');
		try {
			const data = await api('/media/upload', { method: 'POST', body: formData });
			setField('mediaUrl', (data.asset && data.asset.url) || '');
			setStatus('上传完成');
		} catch (error) {
			setStatus(error.message, 'error');
		}
		input.value = '';
	});

	refreshBtn?.addEventListener('click', () => refresh().catch((error) => setStatus(error.message, 'error')));

	refresh().catch((error) => setStatus(error.message, 'error'));
});
