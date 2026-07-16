import { enqueueUserNotification } from '@shared/services/notificationEvents';
import { notificationDispatcher } from '../../src/notifications/services/notificationDispatcher';
import { NotificationEventType } from '../../src/notifications/types';
import { getAlphaConfig } from '@alpha/alphaConfig';

jest.mock('../../src/notifications/services/notificationDispatcher', () => ({
  notificationDispatcher: {
    enqueueNotificationEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@alpha/alphaConfig', () => ({
  getAlphaConfig: jest.fn(),
}));

const context = {
  log: jest.fn(),
} as any;

describe('Alpha notification kill switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suppresses social notifications when non-essential notifications are disabled', async () => {
    (getAlphaConfig as jest.Mock).mockResolvedValue({
      features: { nonEssentialNotifications: false, readOnlyMode: false },
    });

    await enqueueUserNotification({
      context,
      userId: 'user-1',
      eventType: NotificationEventType.POST_LIKED,
      payload: { targetId: 'post-1' },
    });

    expect(notificationDispatcher.enqueueNotificationEvent).not.toHaveBeenCalled();
  });

  it('preserves safety notifications while non-essential notifications are disabled', async () => {
    (getAlphaConfig as jest.Mock).mockResolvedValue({
      features: { nonEssentialNotifications: false, readOnlyMode: false },
    });

    await enqueueUserNotification({
      context,
      userId: 'user-1',
      eventType: NotificationEventType.MODERATION_APPEAL_DECIDED,
      payload: { targetId: 'appeal-1' },
    });

    expect(notificationDispatcher.enqueueNotificationEvent).toHaveBeenCalledTimes(1);
  });
});
