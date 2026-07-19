const mockBeginSend = jest.fn();
const mockTrackAppEvent = jest.fn();

jest.mock('@azure/communication-email', () => ({
  EmailClient: jest.fn(() => ({ beginSend: mockBeginSend })),
}));
jest.mock('@azure/identity', () => ({ DefaultAzureCredential: jest.fn() }));
jest.mock('../../src/shared/appInsights', () => ({
  trackAppEvent: mockTrackAppEvent,
}));

import { AzureCommunicationAuthEmailSender } from '../../src/auth/service/authEmailClient';

describe('AzureCommunicationAuthEmailSender telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ACS_EMAIL_ENDPOINT = 'https://lythaus-mvp.communication.azure.com/';
    process.env.AUTH_EMAIL_FROM_ADDRESS = 'no-reply@mail.lythaus.co';
    process.env.AUTH_EMAIL_FROM_NAME = 'Lythaus';
    process.env.APP_ORIGIN = 'https://app.lythaus.co';
  });

  afterEach(() => {
    delete process.env.ACS_EMAIL_ENDPOINT;
    delete process.env.AUTH_EMAIL_FROM_ADDRESS;
    delete process.env.AUTH_EMAIL_FROM_NAME;
    delete process.env.APP_ORIGIN;
    delete process.env.AUTH_EMAIL_LINK_ORIGIN;
  });

  it.each([
    ['verification', (sender: AzureCommunicationAuthEmailSender) =>
      sender.sendVerification('person@example.test', 'fixture-verification-token')],
    ['password_reset', (sender: AzureCommunicationAuthEmailSender) =>
      sender.sendPasswordReset('person@example.test', 'fixture-reset-token')],
  ] as const)('records privacy-safe attempted and accepted %s events', async (messageClass, send) => {
    mockBeginSend.mockResolvedValueOnce({
      pollUntilDone: jest.fn().mockResolvedValue({ status: 'Succeeded' }),
    });

    await send(new AzureCommunicationAuthEmailSender());

    expect(mockTrackAppEvent).toHaveBeenNthCalledWith(1, {
      name: 'auth_email_delivery',
      properties: { messageClass, outcome: 'attempted' },
    });
    expect(mockTrackAppEvent).toHaveBeenNthCalledWith(2, {
      name: 'auth_email_delivery',
      properties: { messageClass, outcome: 'accepted' },
    });
    const telemetry = JSON.stringify(mockTrackAppEvent.mock.calls);
    expect(telemetry).not.toContain('person@example.test');
    expect(telemetry).not.toContain('fixture-verification-token');
    expect(telemetry).not.toContain('fixture-reset-token');
  });

  it('records a privacy-safe failure without provider details', async () => {
    mockBeginSend.mockResolvedValueOnce({
      pollUntilDone: jest.fn().mockResolvedValue({ status: 'Failed' }),
    });

    await expect(
      new AzureCommunicationAuthEmailSender().sendVerification(
        'person@example.test',
        'fixture-verification-token'
      )
    ).rejects.toThrow('Authentication email delivery was not accepted');

    expect(mockTrackAppEvent).toHaveBeenLastCalledWith({
      name: 'auth_email_delivery',
      properties: { messageClass: 'verification', outcome: 'failed' },
    });
    const telemetry = JSON.stringify(mockTrackAppEvent.mock.calls);
    expect(telemetry).not.toContain('person@example.test');
    expect(telemetry).not.toContain('fixture-verification-token');
    expect(telemetry).not.toContain('Failed');
  });

  it('uses only an exact immutable preview origin for email action links', async () => {
    process.env.AUTH_EMAIL_LINK_ORIGIN = 'https://e46064a9.lythaus-web.pages.dev';
    mockBeginSend.mockResolvedValueOnce({
      pollUntilDone: jest.fn().mockResolvedValue({ status: 'Succeeded' }),
    });

    await new AzureCommunicationAuthEmailSender().sendVerification(
      'person@example.test',
      'fixture-verification-token'
    );

    const message = mockBeginSend.mock.calls[0][0];
    expect(message.content.plainText).toContain(
      'https://e46064a9.lythaus-web.pages.dev/auth/verify-email?token=fixture-verification-token'
    );
  });

  it('rejects a wildcard-like Pages preview origin', () => {
    process.env.AUTH_EMAIL_LINK_ORIGIN = 'https://lythaus-web.pages.dev';

    expect(() => new AzureCommunicationAuthEmailSender()).toThrow(/AUTH_EMAIL_LINK_ORIGIN/);
  });
});
