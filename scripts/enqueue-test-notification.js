#!/usr/bin/env node
/**
 * Enqueue Test Notification Script
 * 
 * Directly inserts notification_event documents into Cosmos DB for E2E testing.
 * Bypasses HTTP endpoints to test the full notification pipeline:
 * - Event enqueuing
 * - Timer-triggered processing
 * - Push delivery via Azure Notification Hub
 * - In-app notification creation
 * 
 * Usage:
 *   node scripts/enqueue-test-notification.js <userId> [eventType] [category]
 * 
 * Examples:
 *   node scripts/enqueue-test-notification.js user-123
 *   node scripts/enqueue-test-notification.js user-123 POST_LIKE SOCIAL
 *   node scripts/enqueue-test-notification.js user-456 SECURITY_NEW_DEVICE SECURITY
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONFIGURATION
// ============================================================================

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'users';
const COSMOS_CONTAINER_NAME = 'notification_events';

if (!COSMOS_CONNECTION_STRING) {
  console.error('ERROR: COSMOS_CONNECTION_STRING environment variable not set');
  console.error('');
  console.error('Set it via:');
  console.error('  export COSMOS_CONNECTION_STRING="AccountEndpoint=..."');
  process.exit(1);
}

// ============================================================================
// EVENT TYPE PAYLOADS
// ============================================================================

const EVENT_TEMPLATES = {
  POST_LIKE: {
    category: 'SOCIAL',
    payload: {
      actorId: 'actor-789',
      actorName: 'Test User',
      targetId: 'post-456',
      targetType: 'post',
      snippet: 'This is a test post for notifications...',
    },
  },
  POST_COMMENT: {
    category: 'SOCIAL',
    payload: {
      actorId: 'actor-789',
      actorName: 'Test User',
      targetId: 'post-456',
      targetType: 'post',
      snippet: 'Great post!',
    },
  },
  COMMENT_REPLY: {
    category: 'SOCIAL',
    payload: {
      actorId: 'actor-789',
      actorName: 'Test User',
      targetId: 'comment-789',
      targetType: 'comment',
      snippet: 'Thanks for your comment!',
    },
  },
  FOLLOWER_NEW: {
    category: 'SOCIAL',
    payload: {
      actorId: 'actor-789',
      actorName: 'Test User',
      targetId: 'user-123',
      targetType: 'user',
    },
  },
  SECURITY_NEW_DEVICE: {
    category: 'SECURITY',
    payload: {
      deviceLabel: 'iPhone 15 Pro',
      location: 'San Francisco, CA',
      ipAddress: '203.0.113.42',
    },
  },
  SECURITY_PASSWORD_CHANGED: {
    category: 'SECURITY',
    payload: {
      timestamp: new Date().toISOString(),
    },
  },
  SAFETY_CONTENT_FLAGGED: {
    category: 'SAFETY',
    payload: {
      targetId: 'post-456',
      targetType: 'post',
      reason: 'spam',
    },
  },
  NEWS_SYSTEM_UPDATE: {
    category: 'NEWS',
    payload: {
      version: 'v2.1.0',
      features: ['New chat features', 'Improved performance'],
    },
  },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function enqueueTestNotification(userId, eventType = 'POST_LIKE', category = null) {
  console.log('========================================');
  console.log('Enqueue Test Notification');
  console.log('========================================');
  console.log(`User ID: ${userId}`);
  console.log(`Event Type: ${eventType}`);
  console.log('');

  // Get event template
  const template = EVENT_TEMPLATES[eventType];
  if (!template) {
    console.error(`ERROR: Unknown event type "${eventType}"`);
    console.error('Available types:', Object.keys(EVENT_TEMPLATES).join(', '));
    process.exit(1);
  }

  // Build event document
  const eventId = uuidv4();
  const now = new Date().toISOString();

  const eventDocument = {
    id: eventId,
    userId,
    eventType,
    category: category || template.category,
    payload: template.payload,
    status: 'PENDING',
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
    dedupeKey: null, // Set this if testing deduplication
    createdAt: now,
    processedAt: null,
  };

  console.log('Event Document:');
  console.log(JSON.stringify(eventDocument, null, 2));
  console.log('');

  // Insert into Cosmos
  try {
    const client = new CosmosClient(COSMOS_CONNECTION_STRING);
    const database = client.database(COSMOS_DATABASE_NAME);
    const container = database.container(COSMOS_CONTAINER_NAME);

    console.log(`Connecting to Cosmos: ${COSMOS_DATABASE_NAME}/${COSMOS_CONTAINER_NAME}`);

    const { resource } = await container.items.create(eventDocument);

    console.log('');
    console.log('✅ SUCCESS: Event enqueued');
    console.log(`Event ID: ${resource.id}`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Wait 1-2 minutes for timer-trigger to process');
    console.log('2. Check Function App logs for processing');
    console.log('3. Verify push notification received on device');
    console.log('4. Check in-app notifications list');
    console.log('');
    console.log('Query Cosmos to check status:');
    console.log(`  SELECT * FROM c WHERE c.id = "${eventId}"`);
  } catch (error) {
    console.error('');
    console.error('❌ ERROR: Failed to enqueue event');
    console.error(error.message);
    console.error('');
    if (error.code === 'ENOTFOUND') {
      console.error('Check COSMOS_CONNECTION_STRING is valid');
    }
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node enqueue-test-notification.js <userId> [eventType] [category]');
    console.log('');
    console.log('Arguments:');
    console.log('  userId      - Target user ID (required)');
    console.log('  eventType   - Event type (default: POST_LIKE)');
    console.log('  category    - Override category (optional)');
    console.log('');
    console.log('Available Event Types:');
    Object.keys(EVENT_TEMPLATES).forEach((type) => {
      console.log(`  - ${type} (${EVENT_TEMPLATES[type].category})`);
    });
    console.log('');
    console.log('Examples:');
    console.log('  node enqueue-test-notification.js user-123');
    console.log('  node enqueue-test-notification.js user-123 POST_COMMENT');
    console.log('  node enqueue-test-notification.js user-456 SECURITY_NEW_DEVICE SECURITY');
    console.log('');
    console.log('Environment Variables:');
    console.log('  COSMOS_CONNECTION_STRING - Azure Cosmos DB connection string (required)');
    console.log('  COSMOS_DATABASE_NAME     - Database name (default: users)');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const [userId, eventType, category] = args;
  enqueueTestNotification(userId, eventType, category);
}

module.exports = { enqueueTestNotification };
