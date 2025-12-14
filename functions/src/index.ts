// Entrypoint for the Azure Functions v4 runtime (PROGRAMMATIC MODEL).
//
// All functions are registered via app.http(), app.timer(), etc.
// No file-based function.json discovery is used.
//
// All functions must be imported synchronously for the programmatic model to work.
// Async imports can cause functions to not be registered if the host scans before they load.

// Health endpoint - must load synchronously for reliability
import './health/health.function';
import './shared/routes/ready';

// Load all feature modules synchronously
// (wrapped in try/catch to avoid crashing the host if one module fails)
const trySyncImport = (label: string, loader: () => void) => {
	try {
		loader();
		// eslint-disable-next-line no-console
		console.log(`[routes] loaded: ${label}`);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(`[routes] failed to load ${label}:`, err instanceof Error ? err.message : err);
	}
};

trySyncImport('analytics', () => require('./analytics'));
trySyncImport('auth', () => require('./auth'));
trySyncImport('feed', () => require('./feed'));
trySyncImport('moderation', () => require('./moderation'));
trySyncImport('privacy', () => require('./privacy'));
trySyncImport('social', () => require('./social'));

// OpenAPI v1 handlers (generated from docs/openapi.yaml)
trySyncImport('users', () => require('./users'));
trySyncImport('posts', () => require('./posts'));
trySyncImport('custom-feeds', () => require('./custom-feeds'));
trySyncImport('appeals', () => require('./appeals'));

// Notifications - FCM-enabled push notification handlers
trySyncImport('notifications/devices', () => require('./notifications/http/devicesApi.function'));
trySyncImport('notifications/preferences', () => require('./notifications/http/preferencesApi.function'));
trySyncImport('notifications/api', () => require('./notifications/http/notificationsApi.function'));
trySyncImport('notifications/processPendingNotifications', () => require('./notifications/timers/processPendingNotifications.function'));
