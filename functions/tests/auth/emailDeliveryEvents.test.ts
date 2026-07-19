const query = jest.fn();

jest.mock('@azure/functions', () => ({ app: { eventGrid: jest.fn() } }));
jest.mock('@shared/clients/postgres', () => ({ getPool: () => ({ query }) }));
jest.mock('@auth/service/emailToken', () => ({
  deliveryRecipientReference: jest.fn(() => 'recipient-reference'),
}));

import { handleEmailDeliveryEvent } from '../../src/auth/worker/emailDeliveryEvents.function';

const context = {
  warn: jest.fn(),
} as any;

describe('ACS email delivery events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ACS_EMAIL_EVENT_SOURCE;
    query.mockResolvedValue({ rowCount: 1, rows: [{ event_id: 'event-1' }] });
  });

  it('persists a deduplicated sanitized terminal delivery state', async () => {
    await handleEmailDeliveryEvent({
      id: 'event-1',
      topic: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Communication/communicationServices/test',
      subject: 'recipient',
      eventType: 'Microsoft.Communication.EmailDeliveryReportReceived',
      eventTime: '2026-07-19T12:00:00.000Z',
      dataVersion: '1',
      metadataVersion: '1',
      data: { messageId: 'provider-message', recipient: 'person@example.test', deliveryStatus: 'Delivered' },
    } as never, context);

    expect(query.mock.calls[0]?.[0]).toContain('email_auth_delivery_events');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'event-1',
      'provider-message',
      'recipient-reference',
      'delivered',
      new Date('2026-07-19T12:00:00.000Z'),
    ]);
    expect(query.mock.calls[1]?.[0]).toContain('email_auth_deliveries');
  });

  it('rejects an event from an unexpected configured source without storing it', async () => {
    process.env.ACS_EMAIL_EVENT_SOURCE = '/subscriptions/expected';
    await handleEmailDeliveryEvent({
      id: 'event-2',
      topic: '/subscriptions/unexpected',
      subject: 'recipient',
      eventType: 'Microsoft.Communication.EmailDeliveryReportReceived',
      eventTime: '2026-07-19T12:00:00.000Z',
      dataVersion: '1',
      metadataVersion: '1',
      data: { messageId: 'provider-message', status: 'Delivered' },
    } as never, context);

    expect(query).not.toHaveBeenCalled();
    expect(context.warn).toHaveBeenCalledWith('[auth-email-delivery] rejected unexpected event source');
  });

  it('records unknown future statuses without marking a delivery terminal', async () => {
    await handleEmailDeliveryEvent({
      id: 'event-3',
      topic: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Communication/communicationServices/test',
      subject: 'recipient',
      eventType: 'Microsoft.Communication.EmailDeliveryReportReceived',
      eventTime: '2026-07-19T12:00:00.000Z',
      dataVersion: '1',
      metadataVersion: '1',
      data: { messageId: 'provider-message', deliveryStatus: 'FutureStatus' },
    } as never, context);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]).toContain('unknown');
  });
});
