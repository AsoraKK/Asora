/**
 * Admin Module Index
 * 
 * Imports all admin-related function handlers.
 */

import './routes/config.function';
import './routes/audit_get.function';
import './routes/flags_list.function';
import './routes/flags_get.function';
import './routes/flags_resolve.function';
import './routes/content_action.function';
import './routes/appeals_list.function';
import './routes/appeals_get.function';
import './routes/appeals_action.function';
import './routes/appeals_override.function';
import './routes/users_search.function';
import './routes/users_action.function';
import './routes/news_ingest.function';

// Moderation class weight management endpoints
import './get-moderation-classes.function';
import './save-weight-override.function';
import './reset-weight-override.function';

// Test data management (GDPR/POPIA compliance)
import './test_data_cleanup.function';
import './admin_test_data_purge.function';

// Control panel proxy for Hive AI testing (same-origin proxy with CF Access injection)
import './routes/proxy_moderation_test.function';
