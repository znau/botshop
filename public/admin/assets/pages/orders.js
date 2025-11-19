import { mountPage } from "../shared.js";

mountPage(({ api, setStatus, escapeHtml }) => {
	const ORDER_STATUSES = ['pending','awaiting_payment','paid','delivering','delivered','awaiting_stock','failed','refunded','expired'];
	let orders = [];
	let users = [];
	const tbody = document.querySelector('[data-table="orders"] tbody');
	const refreshBtn = document.querySelector('[data-action="refresh-orders"]');

	const render = () => {
		if (!tbody) return;
		tbody.innerHTML = orders
			.map((order) => {
				const user = users.find((item) => item.id === order.userId);
				const buyer = user ? user.telegramUsername || user.telegramId : order.userId;
				const options = ORDER_STATUSES.map((status) => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('');
				return `
				<tr>
					<td>${escapeHtml(order.id)}</td>
					<td>${escapeHtml(buyer)}</td>
					<td>${escapeHtml(order.currency || '')} ${escapeHtml(order.totalAmount || '')}</td>
					<td><span class="tag">${escapeHtml(order.status)}</span></td>
					<td>${escapeHtml(order.updatedAt || '')}</td>
					<td>
						<form data-order-id="${order.id}" class="form-inline" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
							<select name="status">${options}</select>
							<input name="note" placeholder="备注" />
							<button type="submit" class="primary">更新</button>
						</form>
					</td>
				</tr>`;
			})
			.join('');
	};

	const refresh = async () => {
		setStatus('正在加载订单...');
		const [orderData, userData] = await Promise.all([
			api('/orders'),
			api('/users'),
		]);
		orders = orderData.orders || [];
		users = userData.users || [];
		render();
		setStatus('订单数据已更新');
	};

	tbody?.addEventListener('submit', async (event) => {
		const form = event.target instanceof HTMLFormElement ? event.target : null;
		if (!form) return;
		event.preventDefault();
		const orderId = form.getAttribute('data-order-id');
		const formData = new FormData(form);
		setStatus('更新订单状态...');
		await api(`/orders/${orderId}/status`, {
			method: 'POST',
			body: {
				status: formData.get('status'),
				note: formData.get('note') || undefined,
			},
		});
		await refresh();
		setStatus('订单状态已更新');
	});

	refreshBtn?.addEventListener('click', () => refresh().catch((error) => setStatus(error.message, 'error')));

	refresh().catch((error) => setStatus(error.message, 'error'));
});
