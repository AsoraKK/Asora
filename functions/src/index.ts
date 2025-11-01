// Entrypoint for the Azure Functions v4 runtime.
// Import each module that performs its own app.http registration so the
// runtime discovers every trigger when this file is evaluated.

import './auth';
import './feed';
import './moderation';
import './privacy';
import './shared/routes/health';
