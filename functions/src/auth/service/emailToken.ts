import * as crypto from 'node:crypto';

export type EmailTokenPurpose = 'verify_email' | 'reset_password';

export interface IssuedEmailToken {
  id: string;
  keyId: string;
  token: string;
  digest: string;
}

export interface ParsedEmailToken {
  version: 'v1';
  keyId: string;
  id: string;
  secret: string;
}

type KeySlot = 'current' | 'previous';

const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function configuredKeyId(slot: KeySlot): string {
  const configured = (slot === 'current'
    ? process.env.EMAIL_TOKEN_HMAC_KEY_ID
    : process.env.EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID
  )?.trim();
  return configured || (slot === 'current' ? 'email-v1' : 'email-v0');
}

function rootKey(kind: KeySlot): Buffer {
  const setting = kind === 'current'
    ? process.env.EMAIL_TOKEN_HMAC_SECRET?.trim()
    : process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS?.trim();
  if (!setting || setting.length < 32) {
    throw new Error(`Missing ${kind === 'current' ? 'EMAIL_TOKEN_HMAC_SECRET' : 'EMAIL_TOKEN_HMAC_SECRET_PREVIOUS'}`);
  }
  return Buffer.from(setting, 'utf8');
}

function derivedPurposeKey(purpose: EmailTokenPurpose, kind: KeySlot): Buffer {
  return crypto
    .createHmac('sha256', rootKey(kind))
    .update(`lythaus/email-token/v1/${purpose}`, 'utf8')
    .digest();
}

function material(purpose: EmailTokenPurpose, id: string, secret: string): string {
  return `${purpose}:${id}:${secret}`;
}

function digestWithKey(purpose: EmailTokenPurpose, id: string, secret: string, kind: KeySlot): string {
  return crypto.createHmac('sha256', derivedPurposeKey(purpose, kind)).update(material(purpose, id, secret), 'utf8').digest('hex');
}

function keySlotForId(keyId: string): KeySlot | null {
  if (keyId === configuredKeyId('current')) return 'current';
  if (process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS?.trim() && keyId === configuredKeyId('previous')) {
    return 'previous';
  }
  return null;
}

export function issueEmailToken(purpose: EmailTokenPurpose): IssuedEmailToken {
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString('base64url');
  return {
    id,
    keyId: configuredKeyId('current'),
    token: `v1.${configuredKeyId('current')}.${id}.${secret}`,
    digest: digestWithKey(purpose, id, secret, 'current'),
  };
}

export function parseVersionedEmailToken(value: string): ParsedEmailToken | null {
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const keyId = parts[1];
  const id = parts[2];
  const secret = parts[3];
  if (
    !keyId ||
    !id ||
    !secret ||
    !KEY_ID_PATTERN.test(keyId) ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret)
  ) {
    return null;
  }
  return { version: 'v1', keyId, id, secret };
}

export function tokenDigestMatches(
  storedDigest: string,
  purpose: EmailTokenPurpose,
  parsed: ParsedEmailToken
): boolean {
  let expected: string;
  try {
    const keySlot = keySlotForId(parsed.keyId);
    if (!keySlot) return false;
    expected = digestWithKey(purpose, parsed.id, parsed.secret, keySlot);
  } catch {
    return false;
  }
  const stored = Buffer.from(storedDigest, 'hex');
  const candidate = Buffer.from(expected, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

export function legacyTokenDigest(value: string): string {
  return crypto.createHmac('sha256', rootKey('current')).update(value, 'utf8').digest('hex');
}

export function deliveryRecipientReference(normalizedEmail: string): string {
  return crypto
    .createHmac('sha256', rootKey('current'))
    .update(`lythaus/email-delivery-telemetry/v1:${normalizedEmail}`, 'utf8')
    .digest('hex');
}

export function validateEmailTokenKeyConfiguration(): string | null {
  const current = process.env.EMAIL_TOKEN_HMAC_SECRET?.trim() || '';
  const previous = process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS?.trim() || '';
  const currentKeyId = configuredKeyId('current');
  const previousKeyId = configuredKeyId('previous');
  if (current.length < 32) return 'EMAIL_TOKEN_HMAC_SECRET must contain at least 32 characters';
  if (!KEY_ID_PATTERN.test(currentKeyId)) {
    return 'EMAIL_TOKEN_HMAC_KEY_ID must use only letters, numbers, underscores, or hyphens';
  }
  if (previous && (previous.length < 32 || previous === current)) {
    return 'EMAIL_TOKEN_HMAC_SECRET_PREVIOUS must differ from the current key and contain at least 32 characters';
  }
  if (previous && (!KEY_ID_PATTERN.test(previousKeyId) || previousKeyId === currentKeyId)) {
    return 'EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID must be valid and differ from EMAIL_TOKEN_HMAC_KEY_ID';
  }
  return null;
}
