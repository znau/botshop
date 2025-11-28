import app from './routes';

export default {
	/**
	 * @param {Request} req
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Response}
	 */
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		return env.assets.fetch(req);
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
