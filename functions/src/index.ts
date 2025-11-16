// Entrypoint for the Azure Functions v4 runtime.
// We must ensure the health endpoint is always available, even if other
// feature modules fail to load due to missing environment configuration.
//
// 1) Health is handled by classic endpoint (zero-dependency, unconditional).
// 2) Import ready synchronously - it does env checks but doesn't require services at load time.
// 3) Attempt to import the rest of the routes asynchronously and defensively.
//    Any failure will be logged but won't prevent the host from serving /api/health.

// import './shared/routes/health'; // Handled by classic health endpoint
import './shared/routes/ready';

// Best-effort async registration for non-health routes
// (dynamic imports are wrapped in try/catch to avoid crashing the host).
async function registerFeatureRoutes(): Promise<void> {
	const tryImport = async (label: string, loader: () => Promise<unknown>) => {
		try {
			await loader();
			// eslint-disable-next-line no-console
			console.log(`[routes] loaded: ${label}`);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error(`[routes] failed to load ${label}:`, err instanceof Error ? err.message : err);
		}
	};

	await Promise.all([
		tryImport('analytics', () => import('./analytics')),
		tryImport('auth', () => import('./auth')),
		tryImport('feed', () => import('./feed')),
		tryImport('moderation', () => import('./moderation')),
		tryImport('privacy', () => import('./privacy')),
	]);
}

// Kick off route registration without blocking startup of the health endpoint
void registerFeatureRoutes();
