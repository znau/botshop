import app from './routes';

/**
 * 判断是否为管理后台请求
 * 支持两种方式：
 * 1. 子域名：admin.your-domain.com
 * 2. 路径：/admin/*
 */
function isAdminRequest(request: Request): boolean {
	const url = new URL(request.url);
	
	// 方案一：通过子域名判断
	if (url.hostname.startsWith('admin.')) {
		return true;
	}
	
	// 方案二（备用）：通过路径判断
	if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/admin')) {
		return true;
	}
	
	return false;
}

/**
 * 处理静态资源请求
 */
async function handleStaticAsset(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const isAdmin = isAdminRequest(request);
	
	if (isAdmin) {
		// 管理后台静态资源
		// 从 /admin/xxx 映射到 public/admin/xxx
		let assetPath = url.pathname;
		
		// 如果是子域名访问，需要添加 /admin 前缀
		if (url.hostname.startsWith('admin.') && !assetPath.startsWith('/admin')) {
			assetPath = '/admin' + (assetPath === '/' ? '/index.html' : assetPath);
		}
		
		// SPA fallback: 如果路径不是文件，返回 index.html
		if (!assetPath.includes('.') && !assetPath.endsWith('/')) {
			assetPath = '/admin/index.html';
		}
		
		const assetUrl = new URL(assetPath, url.origin);
		return env.ASSETS.fetch(assetUrl.toString());
	} else {
		// 用户端商城静态资源
		// SPA fallback: 如果路径不是文件，返回 index.html
		let assetPath = url.pathname;
		if (!assetPath.includes('.') && !assetPath.endsWith('/') && assetPath !== '/') {
			assetPath = '/index.html';
		}
		
		const assetUrl = new URL(assetPath || '/index.html', url.origin);
		return env.ASSETS.fetch(assetUrl.toString());
	}
}

export default {
	/**
	 * @param {Request} req
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Response}
	 */
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(req.url)

		// API 请求路由
		if (url.pathname.startsWith('/api/')) {
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		// 静态资源请求
		return handleStaticAsset(req, env);
	},

	/**
	 * @param {ScheduledController} controller
	 * @param {Env} env 
	 * @param {ExecutionContext} ctx 
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		console.log('scheduled', controller.scheduledTime);
  	},

	/**
	 * @param {MessageBatch} batch 
	 * @param {Env}  env 
	 * @param {ExecutionContext}  ctx 
	 */
	async queue(
		batch: MessageBatch,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		for (const message of batch.messages) {
			console.log('Received', message);
		}
	},
}
