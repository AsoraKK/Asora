// Entrypoint for the Azure Functions v4 runtime.
// Import each module that performs its own app.http registration so the
// runtime discovers every trigger when this file is evaluated.

import './shared/routes/health';
import './feed';
import './auth';
import './moderation';
import './privacy';
