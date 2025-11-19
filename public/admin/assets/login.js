const form = document.getElementById("login-form");
const statusEl = document.querySelector(".login-status");

const setLoginStatus = (message, tone = "info") => {
	if (!statusEl) return;
	statusEl.textContent = message;
	statusEl.style.color = tone === "error" ? "#dc2626" : "#6b7280";
};

form?.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!form) return;
	const formData = new FormData(form);
	setLoginStatus("登录中...");
	try {
		const response = await fetch("/api/admin/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				username: formData.get("username"),
				password: formData.get("password"),
			}),
		});
		if (!response.ok) {
			throw new Error("登录失败");
		}
		const params = new URLSearchParams(window.location.search);
		const next = params.get("next");
		window.location.href = next && next.startsWith("/") ? next : "/admin/categories";
	} catch (error) {
		setLoginStatus("登录失败，请重试", "error");
	}
});
