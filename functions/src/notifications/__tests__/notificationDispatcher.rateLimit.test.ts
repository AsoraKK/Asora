import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { NotificationDispatcher, getNotificationRateLimitPolicy } from '../services/notificationDispatcher';
import { EVENT_TYPE_CATEGORY, NotificationEvent, NotificationEventType } from '../types';
import { notificationEventsRepo } from '../repositories/notificationEventsRepo';
import { notificationsRepo } from '../repositories/notificationsRepo';
import { userNotificationPreferencesRepo } from '../repositories/userNotificationPreferencesRepo';
import { userDeviceTokensRepo } from '../repositories/userDeviceTokensRepo';
import { getFcmClient } from '../clients/fcmClient';
import { trackAppEvent, trackAppMetric } from '../../shared/appInsights';

jest.mock('../repositories/notificationEventsRepo', () => ({
  notificationEventsRepo: {
    create: jest.fn(),
    updateStatus: jest.fn(),
    queryByStatusAndRetry: jest.fn(),
    queryRecentByDedupeKey: jest.fn(),
    countRecentByType: jest.fn(),
    countRecentByTypeAndTarget: jest.fn(),
  },
}));

jest.mock('../repositories/notificationsRepo', () => ({
  notificationsRepo: {
    create: jest.fn(),
    getById: jest.fn(),
    queryForUser: jest.fn(),
    markAsRead: jest.fn(),
    markAsDismissed: jest.fn(),
    updateOrCreate: jest.fn(),
    getUnreadCount: jest.fn(),
  },
}));

jest.mock('../repositories/userNotificationPreferencesRepo', () => ({
  userNotificationPreferencesRepo: {
    getOrCreate: jest.fn(),
  },
}));

jest.mock('../repositories/userDeviceTokensRepo', () => ({
  userDeviceTokensRepo: {
    listActive: jest.fn(),
    revoke: jest.fn(),
  },
}));

jest.mock('../clients/fcmClient', () => ({
  __mockSendPushToDevices: (() => {
    const sendPushToDevices = jest.fn();
    return sendPushToDevices;
  })(),
  getFcmClient: jest.fn(() => {
    const mockModule = jest.requireMock('../clients/fcmClient') as {
      __mockSendPushToDevices: jest.Mock;
    };
    return {
      sendPushToDevices: mockModule.__mockSendPushToDevices,
    };
  }),
}));

jest.mock('../../shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

const mockedNotificationEventsRepo = jest.mocked(notificationEventsRepo);
const mockedNotificationsRepo = jest.mocked(notificationsRepo);
const mockedPreferencesRepo = jest.mocked(userNotificationPreferencesRepo);
const mockedUserDeviceTokensRepo = jest.mocked(userDeviceTokensRepo);
const mockedGetFcmClient = jest.mocked(getFcmClient);
const mockedTrackAppEvent = jest.mocked(trackAppEvent);
const mockedTrackAppMetric = jest.mocked(trackAppMetric);
const mockedFcmModule = jest.requireMock('../clients/fcmClient') as {
  __mockSendPushToDevices: jest.Mock;
};
const mockSendPushToDevices = mockedFcmModule.__mockSendPushToDevices;

function buildEvent(
  overrides: Partial<NotificationEvent> = {}
): NotificationEvent {
  const eventType = overrides.eventType ?? NotificationEventType.COMMENT_CREATED;
  const category = overrides.category ?? EVENT_TYPE_CATEGORY[eventType];
  return {
    id: 'evt-1',
    userId: '01944c1d-5672-7000-8000-0c91f95a72a1',
    eventType,
    category,
    payload: {
      actorId: '01944c1d-5672-7000-8000-0c91f95a72a2',
      actorName: 'Alice',
      targetId: 'post-123',
      targetType: 'post',
      snippet: 'Tap to view',
      ...overrides.payload,
    },
    status: 'PENDING',
    attemptCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as NotificationEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPreferencesRepo.getOrCreate.mockResolvedValue({
    id: '01944c1d-5672-7000-8000-0c91f95a72a1',
    userId: '01944c1d-5672-7000-8000-0c91f95a72a1',
    timezone: 'UTC',
    quietHours: {
      hours: Array.from({ length: 24 }, () => false),
    },
    categories: {
      social: true,
      news: true,
      marketing: true,
    },
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  mockedNotificationEventsRepo.updateStatus.mockResolvedValue({} as never);
  mockedNotificationEventsRepo.countRecentByType.mockReset();
  mockedNotificationEventsRepo.countRecentByTypeAndTarget.mockReset();
  mockedNotificationsRepo.create.mockResolvedValue({} as never);
  mockedNotificationsRepo.updateOrCreate.mockResolvedValue({} as never);
  mockedUserDeviceTokensRepo.listActive.mockResolvedValue([]);
  mockSendPushToDevices.mockReset();
  mockSendPushToDevices.mockResolvedValue({
    success: 0,
    failed: 0,
    invalidTokens: [],
    errors: [],
    iosDeferred: 0,
  });
  mockedGetFcmClient.mockReturnValue({
    sendPushToDevices: mockSendPushToDevices,
  } as never);
});

describe('NotificationDispatcher rate limiting', () => {
  it('throttles repeated events for the same target', async () => {
    const dispatcher = new NotificationDispatcher();
    const policy = getNotificationRateLimitPolicy('SOCIAL');
    const event = buildEvent();

    mockedNotificationEventsRepo.countRecentByType.mockResolvedValue(policy.typeLimit);
    mockedNotificationEventsRepo.countRecentByTypeAndTarget.mockResolvedValue(policy.targetLimit + 1);

    await dispatcher.processNotificationEvent(event);

    expect(mockedNotificationEventsRepo.countRecentByType).toHaveBeenCalledWith(
      event.userId,
      event.eventType,
      policy.typeWindowMinutes
    );
    expect(mockedNotificationEventsRepo.countRecentByTypeAndTarget).toHaveBeenCalledWith(
      event.userId,
      event.eventType,
      'post-123',
      policy.targetWindowMinutes
    );
    expect(mockedNotificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: event.userId,
        category: event.category,
        eventType: event.eventType,
      })
    );
    expect(mockedNotificationsRepo.updateOrCreate).not.toHaveBeenCalled();
    expect(mockedUserDeviceTokensRepo.listActive).not.toHaveBeenCalled();
    expect(mockedTrackAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'notification_rate_limited' })
    );
    expect(mockedNotificationEventsRepo.updateStatus).toHaveBeenCalledWith(
      event.id,
      event.userId,
      'SENT'
    );
  });

  it('throttles by event type before checking target quota', async () => {
    const dispatcher = new NotificationDispatcher();
    const policy = getNotificationRateLimitPolicy('SOCIAL');
    const event = buildEvent();

    mockedNotificationEventsRepo.countRecentByType.mockResolvedValue(policy.typeLimit + 1);

    await dispatcher.processNotificationEvent(event);

    expect(mockedNotificationEventsRepo.countRecentByType).toHaveBeenCalledTimes(1);
    expect(mockedNotificationEventsRepo.countRecentByTypeAndTarget).not.toHaveBeenCalled();
    expect(mockedNotificationsRepo.create).toHaveBeenCalledTimes(1);
    expect(mockedNotificationsRepo.updateOrCreate).not.toHaveBeenCalled();
    expect(mockedUserDeviceTokensRepo.listActive).not.toHaveBeenCalled();
    expect(mockedTrackAppMetric).not.toHaveBeenCalled();
  });

  it('delivers notifications when within the configured limits', async () => {
    const dispatcher = new NotificationDispatcher();
    const policy = getNotificationRateLimitPolicy('SOCIAL');
    const event = buildEvent();

    mockedNotificationEventsRepo.countRecentByType.mockResolvedValue(policy.typeLimit - 1);
    mockedNotificationEventsRepo.countRecentByTypeAndTarget.mockResolvedValue(policy.targetLimit - 1);
    mockedUserDeviceTokensRepo.listActive.mockResolvedValue([
      {
        id: 'device-1',
        userId: event.userId,
        deviceId: 'device-1',
        pushToken: 'push-token',
        platform: 'web',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
    ]);

    mockSendPushToDevices.mockResolvedValue({
      success: 1,
      failed: 0,
      invalidTokens: [],
      errors: [],
      iosDeferred: 0,
    });

    await dispatcher.processNotificationEvent(event);

    expect(mockedNotificationsRepo.updateOrCreate).toHaveBeenCalledWith(
      undefined,
      event.userId,
      expect.objectContaining({
        userId: event.userId,
        category: event.category,
        eventType: event.eventType,
      })
    );
    expect(mockedNotificationsRepo.create).not.toHaveBeenCalled();
    expect(mockedUserDeviceTokensRepo.listActive).toHaveBeenCalledWith(event.userId);
    expect(mockedTrackAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'notification_event_processed' })
    );
  });
});
