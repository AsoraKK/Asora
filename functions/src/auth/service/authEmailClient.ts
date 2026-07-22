import { EmailClient } from '@azure/communication-email';
import { DefaultAzureCredential } from '@azure/identity';
import { trackAppEvent } from '@shared/appInsights';
import { resolveEmailActionOrigin, type EmailActionTarget } from './emailActionTarget';

type AuthEmailMessageClass = 'verification' | 'password_reset';

export interface AuthEmailSender {
  sendVerification(address: string, token: string, actionTarget: EmailActionTarget): Promise<AuthEmailSendReceipt>;
  sendPasswordReset(address: string, token: string, actionTarget: EmailActionTarget): Promise<AuthEmailSendReceipt>;
}

export interface AuthEmailSendReceipt {
  providerMessageId: string | null;
}

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required email setting: ${name}`);
  return value;
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

  constructor() {
    this.client = new EmailClient(
      requiredSetting('ACS_EMAIL_ENDPOINT'),
      new DefaultAzureCredential()
    );
    this.senderAddress = requiredSetting('AUTH_EMAIL_FROM_ADDRESS');
    this.senderDisplayName = process.env.AUTH_EMAIL_FROM_NAME?.trim() || 'Lythaus';
  }

  async sendVerification(address: string, token: string, actionTarget: EmailActionTarget): Promise<AuthEmailSendReceipt> {
    const url = new URL('/auth/verify-email', resolveEmailActionOrigin(actionTarget));
    url.hash = new URLSearchParams({ token }).toString();
    return this.send(
      address,
      'verification',
      'Verify your Lythaus email',
      `Verify your Lythaus email address: ${url.toString()}\n\nOpen the link and choose Verify email. This link is valid for two hours.`,
      `<p>Verify your Lythaus email address:</p><p><a href="${htmlEscape(url.toString())}">Verify email</a></p><p>Open the link and choose Verify email. This link is valid for two hours.</p>`
    );
  }

  async sendPasswordReset(address: string, token: string, actionTarget: EmailActionTarget): Promise<AuthEmailSendReceipt> {
    const url = new URL('/auth/reset-password', resolveEmailActionOrigin(actionTarget));
    url.hash = new URLSearchParams({ token }).toString();
    return this.send(
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
  ): Promise<AuthEmailSendReceipt> {
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
      return {
        providerMessageId: typeof (result as { id?: unknown }).id === 'string'
          ? (result as { id: string }).id
          : null,
      };
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
