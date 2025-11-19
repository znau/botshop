import { mountPage } from "../shared.js";

mountPage(({ api, setStatus, escapeHtml }) => {
	let categories = [];
	const tbody = document.querySelector('[data-table="categories"] tbody');
	const form = document.getElementById('category-form');
	const refreshBtn = document.querySelector('[data-action="refresh-categories"]');
	const resetBtn = document.querySelector('[data-action="reset-category"]');

	const setField = (name, value) => {
		if (!form) return;
		const field = form.elements.namedItem(name);
		if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
			field.value = value ?? '';
		}
	};

	const render = () => {
		if (!tbody) return;
		tbody.innerHTML = categories
			.map((cat) => `
			<tr>
				<td>${escapeHtml(cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name)}</td>
				<td>${escapeHtml(cat.description || '')}</td>
				<td>${escapeHtml(cat.sortOrder)}</td>
				<td>${cat.isActive ? '<span class="tag">可用</span>' : '<span class="tag" style="background:#fee2e2;color:#991b1b;">停用</span>'}</td>
				<td>
					<div style="display:flex;gap:8px;flex-wrap:wrap;">
						<button class="secondary" data-action="edit" data-id="${cat.id}">编辑</button>
						<button class="danger" data-action="delete" data-id="${cat.id}">删除</button>
					</div>
				</td>
			</tr>
			`)
			.join('');
	};

	const refresh = async () => {
		setStatus('正在加载分类...');
		const data = await api('/categories');
		categories = data.categories || [];
		render();
		setStatus('分类数据已同步');
	};

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!form) return;
		const formData = new FormData(form);
		const payload = {
			name: formData.get('name'),
			description: formData.get('description') || undefined,
			emoji: formData.get('emoji') || undefined,
			sortOrder: Number(formData.get('sortOrder') || 0),
			isActive: formData.get('isActive') === 'true',
		};
		const id = formData.get('id');
		setStatus('保存中...');
		if (id) {
			await api(`/categories/${id}`, { method: 'PUT', body: payload });
		} else {
			await api('/categories', { method: 'POST', body: payload });
		}
		form.reset();
		await refresh();
		setStatus('分类已保存');
	});

	resetBtn?.addEventListener('click', () => form?.reset());

	tbody?.addEventListener('click', async (event) => {
		const target = event.target instanceof HTMLElement ? event.target : null;
		const button = target ? target.closest('button[data-action]') : null;
		if (!button) return;
		const id = button.getAttribute('data-id');
		const action = button.getAttribute('data-action');
		if (!id || !action) return;
		if (action === 'edit') {
			const cat = categories.find((item) => item.id === id);
			if (!cat) return;
			setField('id', cat.id);
			setField('name', cat.name);
			setField('description', cat.description || '');
			setField('emoji', cat.emoji || '');
			setField('sortOrder', cat.sortOrder ?? 0);
			setField('isActive', String(cat.isActive));
		}
		if (action === 'delete') {
			if (!confirm('确定删除该分类吗？')) return;
			await api(`/categories/${id}`, { method: 'DELETE' });
			await refresh();
			setStatus('分类已删除');
		}
	});

	refreshBtn?.addEventListener('click', () => refresh().catch((error) => setStatus(error.message, 'error')));

	refresh().catch((error) => setStatus(error.message, 'error'));
});
