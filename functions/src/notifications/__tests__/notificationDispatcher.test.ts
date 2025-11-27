import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { NotificationHubClient } from '../clients/notificationHubClient';
import { NotificationEventsRepository } from '../repositories/notificationEventsRepo';
import { NotificationsRepository } from '../repositories/notificationsRepo';
import { UserNotificationPreferencesRepository } from '../repositories/userNotificationPreferencesRepo';
import { UserDeviceTokensRepository } from '../repositories/userDeviceTokensRepo';
import {
  NotificationEventType,
  NotificationCategory,
  NotificationEvent,
  NotificationEventStatus,
} from '../types';
import { DateTime } from 'luxon';

// Mock all dependencies
jest.mock('../clients/notificationHubClient');
jest.mock('../repositories/notificationEventsRepo');
jest.mock('../repositories/notificationsRepo');
jest.mock('../repositories/userNotificationPreferencesRepo');
jest.mock('../repositories/userDeviceTokensRepo');

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher;
  let mockNotificationHub: jest.Mocked<NotificationHubClient>;
  let mockEventsRepo: jest.Mocked<NotificationEventsRepository>;
  let mockNotificationsRepo: jest.Mocked<NotificationsRepository>;
  let mockPreferencesRepo: jest.Mocked<UserNotificationPreferencesRepository>;
  let mockDevicesRepo: jest.Mocked<UserDeviceTokensRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNotificationHub = new NotificationHubClient() as jest.Mocked<NotificationHubClient>;
    mockEventsRepo = new NotificationEventsRepository() as jest.Mocked<NotificationEventsRepository>;
    mockNotificationsRepo = new NotificationsRepository() as jest.Mocked<NotificationsRepository>;
    mockPreferencesRepo = new UserNotificationPreferencesRepository() as jest.Mocked<UserNotificationPreferencesRepository>;
    mockDevicesRepo = new UserDeviceTokensRepository() as jest.Mocked<UserDeviceTokensRepository>;

    // Create dispatcher with mocked dependencies
    dispatcher = new NotificationDispatcher(
      mockEventsRepo,
      mockNotificationsRepo,
      mockPreferencesRepo,
      mockDevicesRepo,
      mockNotificationHub
    );
  });

  describe('enqueueNotificationEvent', () => {
    it('should enqueue a notification event with dedupeKey', async () => {
      const event: Partial<NotificationEvent> = {
        userId: 'user123',
        eventType: NotificationEventType.POST_LIKE,
        payload: { actorId: 'actor456', targetId: 'post789' },
      };

      mockEventsRepo.create = jest.fn().mockResolvedValue({
        id: 'event001',
        ...event,
        status: NotificationEventStatus.PENDING,
        createdAt: new Date(),
      });

      const result = await dispatcher.enqueueNotificationEvent(event as NotificationEvent);

      expect(mockEventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          eventType: NotificationEventType.POST_LIKE,
          status: NotificationEventStatus.PENDING,
          dedupeKey: expect.stringContaining('user123:POST_LIKE:'),
        })
      );
      expect(result.status).toBe(NotificationEventStatus.PENDING);
    });
  });

  describe('processNotificationEvent - Quiet Hours', () => {
    it('should not send push notification during quiet hours', async () => {
      const currentHour = 2; // 2 AM (typically quiet hours)
      
      const event: NotificationEvent = {
        id: 'event001',
        userId: 'user123',
        eventType: NotificationEventType.POST_COMMENT,
        payload: { actorId: 'actor456', targetId: 'post789', snippet: 'Nice post!' },
        status: NotificationEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      };

      // Mock user preferences with quiet hours enabled for current hour
      const quietHours = new Array(24).fill(false);
      quietHours[currentHour] = true; // Mark 2 AM as quiet

      mockPreferencesRepo.getByUserId = jest.fn().mockResolvedValue({
        userId: 'user123',
        timezone: 'America/Los_Angeles',
        quietHours,
        categories: { social: true, news: true, marketing: true },
      });

      mockDevicesRepo.queryActiveByUserId = jest.fn().mockResolvedValue([
        { id: 'device001', pushToken: 'token123', platform: 'fcm' },
      ]);

      mockNotificationHub.sendPushToDevices = jest.fn().mockResolvedValue({ sent: 1, failed: 0 });
      mockNotificationsRepo.create = jest.fn().mockResolvedValue({});
      mockEventsRepo.update = jest.fn().mockResolvedValue({});

      // Mock current time to be during quiet hours
      jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromObject({ hour: currentHour }, { zone: 'America/Los_Angeles' })
      );

      await dispatcher.processNotificationEvent(event);

      // Should NOT send push notification during quiet hours
      expect(mockNotificationHub.sendPushToDevices).not.toHaveBeenCalled();
      
      // But should still create in-app notification
      expect(mockNotificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          category: NotificationCategory.SOCIAL,
        })
      );
    });
  });

  describe('processNotificationEvent - Rate Limiting', () => {
    it('should enforce hourly rate limit for SOCIAL category', async () => {
      const event: NotificationEvent = {
        id: 'event001',
        userId: 'user123',
        eventType: NotificationEventType.POST_LIKE,
        payload: { actorId: 'actor456', targetId: 'post789' },
        status: NotificationEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      };

      mockPreferencesRepo.getByUserId = jest.fn().mockResolvedValue({
        userId: 'user123',
        timezone: 'UTC',
        quietHours: new Array(24).fill(false),
        categories: { social: true, news: true, marketing: true },
      });

      // Mock that user already received 3 SOCIAL notifications in past hour (limit reached)
      mockNotificationsRepo.queryByUserIdAndCategory = jest.fn().mockResolvedValue([
        { id: 'notif001', createdAt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min ago
        { id: 'notif002', createdAt: new Date(Date.now() - 45 * 60 * 1000) }, // 45 min ago
        { id: 'notif003', createdAt: new Date(Date.now() - 50 * 60 * 1000) }, // 50 min ago
      ]);

      mockDevicesRepo.queryActiveByUserId = jest.fn().mockResolvedValue([
        { id: 'device001', pushToken: 'token123', platform: 'fcm' },
      ]);

      mockEventsRepo.update = jest.fn().mockResolvedValue({});

      await dispatcher.processNotificationEvent(event);

      // Should NOT send push due to rate limit
      expect(mockNotificationHub.sendPushToDevices).not.toHaveBeenCalled();
      
      // Should mark event as RATE_LIMITED
      expect(mockEventsRepo.update).toHaveBeenCalledWith(
        'event001',
        expect.objectContaining({
          status: NotificationEventStatus.RATE_LIMITED,
        })
      );
    });
  });

  describe('processNotificationEvent - Deduplication', () => {
    it('should not send duplicate notification within dedupe window', async () => {
      const event: NotificationEvent = {
        id: 'event001',
        userId: 'user123',
        eventType: NotificationEventType.POST_LIKE,
        payload: { actorId: 'actor456', targetId: 'post789' },
        status: NotificationEventStatus.PENDING,
        retryCount: 0,
        dedupeKey: 'user123:POST_LIKE:post789',
        createdAt: new Date(),
      };

      mockPreferencesRepo.getByUserId = jest.fn().mockResolvedValue({
        userId: 'user123',
        timezone: 'UTC',
        quietHours: new Array(24).fill(false),
        categories: { social: true, news: true, marketing: true },
      });

      // Mock that an event with same dedupeKey was processed recently
      mockEventsRepo.queryByDedupeKey = jest.fn().mockResolvedValue([
        {
          id: 'event000',
          dedupeKey: 'user123:POST_LIKE:post789',
          status: NotificationEventStatus.COMPLETED,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      ]);

      mockEventsRepo.update = jest.fn().mockResolvedValue({});

      await dispatcher.processNotificationEvent(event);

      // Should NOT send push due to deduplication
      expect(mockNotificationHub.sendPushToDevices).not.toHaveBeenCalled();
      
      // Should mark event as DEDUPLICATED
      expect(mockEventsRepo.update).toHaveBeenCalledWith(
        'event001',
        expect.objectContaining({
          status: NotificationEventStatus.DEDUPLICATED,
        })
      );
    });
  });

  describe('processNotificationEvent - Success Path', () => {
    it('should successfully send push notification and create in-app notification', async () => {
      const event: NotificationEvent = {
        id: 'event001',
        userId: 'user123',
        eventType: NotificationEventType.POST_COMMENT,
        payload: {
          actorId: 'actor456',
          actorName: 'John Doe',
          targetId: 'post789',
          snippet: 'Great post!',
        },
        status: NotificationEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      };

      mockPreferencesRepo.getByUserId = jest.fn().mockResolvedValue({
        userId: 'user123',
        timezone: 'UTC',
        quietHours: new Array(24).fill(false),
        categories: { social: true, news: true, marketing: true },
      });

      mockNotificationsRepo.queryByUserIdAndCategory = jest.fn().mockResolvedValue([]);
      mockEventsRepo.queryByDedupeKey = jest.fn().mockResolvedValue([]);

      mockDevicesRepo.queryActiveByUserId = jest.fn().mockResolvedValue([
        { id: 'device001', pushToken: 'token123', platform: 'fcm', isActive: true },
        { id: 'device002', pushToken: 'token456', platform: 'apns', isActive: true },
      ]);

      mockNotificationHub.sendPushToDevices = jest.fn().mockResolvedValue({ sent: 2, failed: 0 });
      mockNotificationsRepo.create = jest.fn().mockResolvedValue({ id: 'notif001' });
      mockEventsRepo.update = jest.fn().mockResolvedValue({});

      await dispatcher.processNotificationEvent(event);

      // Should send push to all devices
      expect(mockNotificationHub.sendPushToDevices).toHaveBeenCalledWith(
        [
          { id: 'device001', pushToken: 'token123', platform: 'fcm', isActive: true },
          { id: 'device002', pushToken: 'token456', platform: 'apns', isActive: true },
        ],
        expect.objectContaining({
          title: expect.stringContaining('John Doe'),
          body: expect.stringContaining('Great post!'),
        })
      );

      // Should create in-app notification
      expect(mockNotificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          category: NotificationCategory.SOCIAL,
          eventType: NotificationEventType.POST_COMMENT,
          title: expect.any(String),
          body: expect.any(String),
          deeplink: 'asora://post/post789',
        })
      );

      // Should mark event as COMPLETED
      expect(mockEventsRepo.update).toHaveBeenCalledWith(
        'event001',
        expect.objectContaining({
          status: NotificationEventStatus.COMPLETED,
        })
      );
    });
  });

  describe('processNotificationEvent - Retry Logic', () => {
    it('should retry failed events with exponential backoff', async () => {
      const event: NotificationEvent = {
        id: 'event001',
        userId: 'user123',
        eventType: NotificationEventType.POST_LIKE,
        payload: { actorId: 'actor456', targetId: 'post789' },
        status: NotificationEventStatus.PENDING,
        retryCount: 2, // Already retried twice
        createdAt: new Date(),
      };

      mockPreferencesRepo.getByUserId = jest.fn().mockResolvedValue({
        userId: 'user123',
        timezone: 'UTC',
        quietHours: new Array(24).fill(false),
        categories: { social: true, news: true, marketing: true },
      });

      mockNotificationsRepo.queryByUserIdAndCategory = jest.fn().mockResolvedValue([]);
      mockEventsRepo.queryByDedupeKey = jest.fn().mockResolvedValue([]);
      mockDevicesRepo.queryActiveByUserId = jest.fn().mockResolvedValue([
        { id: 'device001', pushToken: 'token123', platform: 'fcm', isActive: true },
      ]);

      // Simulate push notification failure
      mockNotificationHub.sendPushToDevices = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      mockEventsRepo.update = jest.fn().mockResolvedValue({});

      await dispatcher.processNotificationEvent(event);

      // Should mark event as FAILED and increment retry count
      expect(mockEventsRepo.update).toHaveBeenCalledWith(
        'event001',
        expect.objectContaining({
          status: NotificationEventStatus.FAILED,
          retryCount: 3,
          nextRetryAt: expect.any(Date), // Should calculate exponential backoff
          lastError: expect.stringContaining('Network error'),
        })
      );
    });
  });
});
