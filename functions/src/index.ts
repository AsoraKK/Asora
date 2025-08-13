/**
 * Azure Functions v4 Entry Point
 * This file registers all HTTP and timer triggers
 */

// Feed functions
import './src/feed/get';
import './src/feed/local'; 
import './src/feed/trending';
import './src/feed/newCreators';

// Timer functions
import './src/timers/privacyCleanupTimer';
import './src/timers/calculateKPIsTimer';
import './src/timers/firstPostEnforcer';

// Export nothing - functions register themselves with the runtime
