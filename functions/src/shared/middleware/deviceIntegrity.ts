import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createErrorResponseWithCode } from '@shared/utils/http';

export const DEVICE_INTEGRITY_BLOCKED_CODE = 'DEVICE_INTEGRITY_BLOCKED';
export const DEVICE_INTEGRITY_BLOCKED_MESSAGE =
  'Posting is disabled on this device for security reasons.';

const TRUE_VALUES = new Set(['true', '1', 'yes']);

function isTrueHeader(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export function isDeviceIntegrityBlocked(req: HttpRequest): boolean {
  const rooted = isTrueHeader(req.headers.get('x-device-rooted'));
  const emulator = isTrueHeader(req.headers.get('x-device-emulator'));
  return rooted || emulator;
}

export function buildDeviceIntegrityBlockedResponse(): HttpResponseInit {
  return createErrorResponseWithCode(
    403,
    DEVICE_INTEGRITY_BLOCKED_CODE,
    DEVICE_INTEGRITY_BLOCKED_MESSAGE
  );
}

export function withDeviceIntegrity(
  handler: (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> | HttpResponseInit
) {
  return async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (isDeviceIntegrityBlocked(req)) {
      context.log('security.device_integrity_blocked', {
        rooted: isTrueHeader(req.headers.get('x-device-rooted')),
        emulator: isTrueHeader(req.headers.get('x-device-emulator')),
      });
      return buildDeviceIntegrityBlockedResponse();
    }

    return handler(req, context);
  };
}
