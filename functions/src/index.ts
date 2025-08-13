// This file is no longer needed for Node.js Functions
// Node.js Functions use folder structure with function.json files

// Feed functions
import './feed/get';
import './feed/local';
import './feed/trending';
import './feed/newCreators';

// Timer functions
import './timers/privacyCleanupTimer';
import './timers/calculateKPIsTimer';
import './timers/firstPostEnforcer';

// Health and monitoring
import './shared/health';

// Export nothing - functions register themselves with the runtime
