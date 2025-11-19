import { mountPage } from "../shared.js";

mountPage(({ api, setStatus, escapeHtml }) => {
	let users = [];
	const tbody = document.querySelector('[data-table="users"] tbody');
	const refreshBtn = document.querySelector('[data-action="refresh-users"]');

	const render = () => {
		if (!tbody) return;
		tbody.innerHTML = users
			.map((user) => `
			<tr>
				<td>${escapeHtml(user.id)}</td>
				<td>${escapeHtml(user.telegramUsername || user.telegramId)}</td>
				<td>${escapeHtml(user.orderCount || 0)}</td>
				<td>${escapeHtml(user.updatedAt || '')}</td>
			</tr>
			`)
			.join('');
	};

	const refresh = async () => {
		setStatus('正在加载用户...');
		const data = await api('/users');
		users = data.users || [];
		render();
		setStatus('用户数据已更新');
	};

	refreshBtn?.addEventListener('click', () => refresh().catch((error) => setStatus(error.message, 'error')));

	refresh().catch((error) => setStatus(error.message, 'error'));
});
