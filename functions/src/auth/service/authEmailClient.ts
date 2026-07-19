import { EmailClient } from '@azure/communication-email';
import { DefaultAzureCredential } from '@azure/identity';
import { trackAppEvent } from '@shared/appInsights';

type AuthEmailMessageClass = 'verification' | 'password_reset';

export interface AuthEmailSender {
  sendVerification(address: string, token: string): Promise<void>;
  sendPasswordReset(address: string, token: string): Promise<void>;
}

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required email setting: ${name}`);
  return value;
}

function appOrigin(): string {
  const raw = requiredSetting('APP_ORIGIN');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.pathname !== '/') {
    throw new Error('APP_ORIGIN must be an HTTPS origin');
  }
  return url.origin;
}

function emailLinkOrigin(): string {
  const canonicalOrigin = appOrigin();
  const raw = process.env.AUTH_EMAIL_LINK_ORIGIN?.trim();
  if (!raw) return canonicalOrigin;

  const url = new URL(raw);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname !== '/' ||
    !/^[a-f0-9]{8}\.lythaus-web\.pages\.dev$/.test(url.hostname)
  ) {
    throw new Error('AUTH_EMAIL_LINK_ORIGIN must be one exact immutable Lythaus Pages HTTPS origin');
  }
  return url.origin;
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class AzureCommunicationAuthEmailSender implements AuthEmailSender {
  private readonly client: EmailClient;
  private readonly senderAddress: string;
  private readonly senderDisplayName: string;
  private readonly origin: string;

  constructor() {
    this.client = new EmailClient(
      requiredSetting('ACS_EMAIL_ENDPOINT'),
      new DefaultAzureCredential()
    );
    this.senderAddress = requiredSetting('AUTH_EMAIL_FROM_ADDRESS');
    this.senderDisplayName = process.env.AUTH_EMAIL_FROM_NAME?.trim() || 'Lythaus';
    this.origin = emailLinkOrigin();
  }

  async sendVerification(address: string, token: string): Promise<void> {
    const url = new URL('/auth/verify-email', this.origin);
    url.searchParams.set('token', token);
    await this.send(
      address,
      'verification',
      'Verify your Lythaus email',
      `Verify your Lythaus email address: ${url.toString()}\n\nThis link expires shortly and can be used once.`,
      `<p>Verify your Lythaus email address:</p><p><a href="${htmlEscape(url.toString())}">Verify email</a></p><p>This link expires shortly and can be used once.</p>`
    );
  }

  async sendPasswordReset(address: string, token: string): Promise<void> {
    const url = new URL('/auth/reset-password', this.origin);
    url.searchParams.set('token', token);
    await this.send(
      address,
      'password_reset',
      'Reset your Lythaus password',
      `Reset your Lythaus password: ${url.toString()}\n\nThis link expires shortly and can be used once.`,
      `<p>Reset your Lythaus password:</p><p><a href="${htmlEscape(url.toString())}">Reset password</a></p><p>This link expires shortly and can be used once.</p>`
    );
  }

  private async send(
    address: string,
    messageClass: AuthEmailMessageClass,
    subject: string,
    plainText: string,
    html: string
  ): Promise<void> {
    const recordOutcome = (outcome: 'attempted' | 'accepted' | 'failed') => {
      trackAppEvent({
        name: 'auth_email_delivery',
        properties: { messageClass, outcome },
      });
    };

    recordOutcome('attempted');
    try {
      const poller = await this.client.beginSend({
        senderAddress: this.senderAddress,
        content: { subject, plainText, html },
        recipients: { to: [{ address }] },
        replyTo: [{ address: this.senderAddress, displayName: this.senderDisplayName }],
        headers: { 'X-Lythaus-Message-Class': 'authentication' },
      });
      const result = await poller.pollUntilDone();
      if (result.status !== 'Succeeded') {
        throw new Error('Authentication email delivery was not accepted');
      }
      recordOutcome('accepted');
    } catch (error) {
      recordOutcome('failed');
      throw error;
    }
  }
}

let cachedSender: AuthEmailSender | undefined;

export function getAuthEmailSender(): AuthEmailSender {
  cachedSender ??= new AzureCommunicationAuthEmailSender();
  return cachedSender;
}

export function resetAuthEmailSenderForTests(): void {
  cachedSender = undefined;
}
