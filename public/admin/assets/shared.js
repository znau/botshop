const API_BASE = "/api/admin";
const statusEl = document.querySelector("[data-status]");
const logoutBtn = document.querySelector("[data-logout]");
const adminNameEl = document.querySelector("[data-admin-name]");
const pageTag = document.body?.dataset?.page ?? "";

export const setStatus = (message, tone = "info") => {
	if (!statusEl) return;
	statusEl.textContent = message;
	if (tone === "error") {
		statusEl.style.background = "#fee2e2";
		statusEl.style.color = "#991b1b";
		return;
	}
	statusEl.style.background = "#eef2ff";
	statusEl.style.color = "#1e40af";
};

export const escapeHtml = (value) => {
	if (value == null) return "";
	return String(value).replace(/[&<>"']/g, (char) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;",
	}[char] || char));
};

export const api = async (path, options = {}) => {
	const init = { ...options, credentials: "include" };
	if (init.body && !(init.body instanceof FormData)) {
		init.headers = { "content-type": "application/json", ...(init.headers || {}) };
		if (typeof init.body !== "string") {
			init.body = JSON.stringify(init.body);
		}
	}
	const response = await fetch(`${API_BASE}${path}`, init);
	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		if (response.status === 401 && pageTag !== "login") {
			const next = encodeURIComponent(window.location.pathname + window.location.search);
			window.location.href = `/admin/login?next=${next}`;
		}
		throw new Error(data.error || data.message || "请求失败");
	}
	return data;
};

export const mountPage = (init) => {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => init({ api, setStatus, escapeHtml }));
		return;
	}
	init({ api, setStatus, escapeHtml });
};

const fetchSession = async () => {
	const response = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
	if (!response.ok) {
		throw new Error("Unauthorized");
	}
	const payload = await response.json();
	if (payload?.user?.username && adminNameEl) {
		adminNameEl.textContent = payload.user.username;
	}
	return payload;
};

const ensureSessionState = async () => {
	if (pageTag === "login") {
		try {
			await fetchSession();
			const params = new URLSearchParams(window.location.search);
			const next = params.get("next");
			window.location.href = next && next.startsWith("/") ? next : "/admin/categories";
		} catch (error) {
			// stay on login page
		}
		return;
	}
	try {
		await fetchSession();
	} catch (error) {
		const next = encodeURIComponent(window.location.pathname + window.location.search);
		window.location.href = `/admin/login?next=${next}`;
	}
};

if (pageTag !== "login") {
	setStatus("准备就绪");
}

ensureSessionState();

logoutBtn?.addEventListener("click", async (event) => {
	event.preventDefault();
	try {
		await api("/auth/logout", { method: "POST" });
		window.location.href = "/admin/login";
	} catch (error) {
		setStatus(error.message, "error");
	}
});
