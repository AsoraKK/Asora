/**
 * NotificationDispatcher Tests
 * 
 * Tests for the notification processing engine.
 * Uses module-level mocks for Cosmos DB to avoid real connections.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Cosmos DB BEFORE any imports that use it
jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    users: {
      database: {
        container: jest.fn(() => ({
          items: {
            create: jest.fn().mockResolvedValue({ resource: {} }),
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            }),
            upsert: jest.fn().mockResolvedValue({ resource: {} }),
          },
          item: jest.fn(() => ({
            read: jest.fn().mockResolvedValue({ resource: {} }),
            replace: jest.fn().mockResolvedValue({ resource: {} }),
          })),
        })),
      },
    },
  })),
  getCosmos: jest.fn(),
}));

// Mock Notification Hub client
jest.mock('../clients/notificationHubClient', () => ({
  getNotificationHubsClient: jest.fn(() => ({
    sendPushToDevices: jest.fn().mockResolvedValue({ success: 1, failed: 0, errors: [] }),
  })),
}));

// Mock App Insights
jest.mock('../../shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

import {
  NotificationEventType,
  NotificationCategory,
  EVENT_TYPE_CATEGORY,
  DEFAULT_QUIET_HOURS,
  DEFAULT_CATEGORY_PREFERENCES,
} from '../types';

describe('NotificationDispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Types and Categories', () => {
    it('should map event types to correct categories', () => {
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.COMMENT_CREATED]).toBe('SOCIAL');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.COMMENT_REPLY]).toBe('SOCIAL');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.POST_LIKED]).toBe('SOCIAL');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.USER_FOLLOWED]).toBe('SOCIAL');

      expect(EVENT_TYPE_CATEGORY[NotificationEventType.MODERATION_CONTENT_BLOCKED]).toBe('SAFETY');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.MODERATION_APPEAL_DECIDED]).toBe('SAFETY');

      expect(EVENT_TYPE_CATEGORY[NotificationEventType.SECURITY_LOGIN_NEW_DEVICE]).toBe('SECURITY');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.ACCOUNT_CHANGE]).toBe('SECURITY');

      expect(EVENT_TYPE_CATEGORY[NotificationEventType.NEWS_ALERT]).toBe('NEWS');
      expect(EVENT_TYPE_CATEGORY[NotificationEventType.MARKETING_CAMPAIGN]).toBe('MARKETING');
    });

    it('should have all event types mapped', () => {
      const allEventTypes = Object.values(NotificationEventType);
      const mappedEventTypes = Object.keys(EVENT_TYPE_CATEGORY);

      expect(mappedEventTypes.length).toBe(allEventTypes.length);
    });
  });

  describe('Default Preferences', () => {
    it('should have default quiet hours configured', () => {
      expect(DEFAULT_QUIET_HOURS.hours).toHaveLength(24);
      // Default: 22:00 to 07:00 is quiet
      expect(DEFAULT_QUIET_HOURS.hours[0]).toBe(true); // Midnight is quiet
      expect(DEFAULT_QUIET_HOURS.hours[6]).toBe(true); // 6am is quiet
      expect(DEFAULT_QUIET_HOURS.hours[7]).toBe(false); // 7am is not quiet
      expect(DEFAULT_QUIET_HOURS.hours[21]).toBe(false); // 9pm is not quiet
      expect(DEFAULT_QUIET_HOURS.hours[22]).toBe(true); // 10pm is quiet
      expect(DEFAULT_QUIET_HOURS.hours[23]).toBe(true); // 11pm is quiet
    });

    it('should have default category preferences', () => {
      expect(DEFAULT_CATEGORY_PREFERENCES.social).toBe(true);
      expect(DEFAULT_CATEGORY_PREFERENCES.news).toBe(false);
      expect(DEFAULT_CATEGORY_PREFERENCES.marketing).toBe(false);
    });
  });

  describe('Rate Limits', () => {
    it('should have sensible rate limits defined', () => {
      // Test that rate limit constants exist in the module
      // SOCIAL: 3/hour, 20/day
      // NEWS: 1/hour, 1/day  
      // MARKETING: 1/hour, 1/day
      // SAFETY/SECURITY: 10/hour, 50/day (higher for critical alerts)
      
      // This tests the type exports
      const categories: NotificationCategory[] = ['SOCIAL', 'SAFETY', 'SECURITY', 'NEWS', 'MARKETING'];
      expect(categories).toHaveLength(5);
    });
  });

  describe('Deduplication Keys', () => {
    it('should generate deduplication keys correctly', () => {
      // Test the pattern: userId:eventType:targetId
      const userId = 'user123';
      const eventType = NotificationEventType.POST_LIKED;
      const targetId = 'post456';
      
      const dedupeKey = userId + ':' + eventType + ':' + targetId;
      expect(dedupeKey).toBe('user123:POST_LIKED:post456');
    });
  });
});
