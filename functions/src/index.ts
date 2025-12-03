// Entrypoint for the Azure Functions v4 runtime (PROGRAMMATIC MODEL).
// 
// All functions are registered via app.http(), app.timer(), etc.
// No file-based function.json discovery is used.
//
// Health is imported synchronously to ensure it's always available.
// Other feature modules are imported async/defensively to isolate failures.

// Health endpoint - must load synchronously for reliability
import './health/health.function';
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
		// Notifications - FCM-enabled push notification handlers
		tryImport('notifications/devices', () => import('./notifications/http/devicesApi.function')),
		tryImport('notifications/preferences', () => import('./notifications/http/preferencesApi.function')),
		tryImport('notifications/api', () => import('./notifications/http/notificationsApi.function')),
		tryImport(
			'notifications/processPendingNotifications',
			() => import('./notifications/timers/processPendingNotifications.function')
		),
	]);
}

// Kick off route registration without blocking startup of the health endpoint
void registerFeatureRoutes();
