import './routes/authorize';
import './routes/ping';
import './routes/token';
import './routes/userinfo';
import './routes/invite_validate.function';

// OpenAPI v1 handlers
import './routes/auth_token_refresh.function';
import './routes/auth_sessions_revoke.function';
import './routes/email_auth.function';
import './worker/emailProjectionOutbox.function';
import './worker/emailDeliveryEvents.function';

// Admin endpoints
import './admin/invites';

// Invite redemption
import './service/redeemInvite';
