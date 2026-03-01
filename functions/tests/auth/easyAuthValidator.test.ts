/**
 * Tests for EasyAuth Principal Validator
 *
 * Covers:
 *  - Base64 decoding / JSON parsing
 *  - Structural validation (auth_typ, claims array)
 *  - Known/unknown provider handling
 *  - Subject claim extraction (priority order)
 *  - Cross-check: principal ID vs claims subject
 */

// ── Logger spy ─────────────────────────────────────────────────────────
const loggerWarnSpy = jest.fn();

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: (...args: any[]) => loggerWarnSpy(...args),
    error: jest.fn(),
  })),
}));

import {
  validateEasyAuthPrincipal,
  validateAndCrossCheckPrincipal,
} from '../../src/auth/service/easyAuthValidator';

// ── Helpers ────────────────────────────────────────────────────────────

function encodePrincipal(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

/** Minimal valid principal with nameidentifier claim */
function validPrincipal(
  userId = 'user-abc-123',
  authTyp = 'aad'
): string {
  return encodePrincipal({
    auth_typ: authTyp,
    claims: [
      {
        typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        val: userId,
      },
    ],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// 1. validateEasyAuthPrincipal — Input validation
// ═══════════════════════════════════════════════════════════════════════
describe('validateEasyAuthPrincipal — input validation', () => {
  it('rejects empty string', () => {
    const result = validateEasyAuthPrincipal('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty');
  });

  it('rejects whitespace-only string', () => {
    const result = validateEasyAuthPrincipal('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty');
  });

  it('rejects non-JSON base64 (plain text encoded)', () => {
    const result = validateEasyAuthPrincipal(Buffer.from('not-json').toString('base64'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('rejects non-object JSON', () => {
    const result = validateEasyAuthPrincipal(Buffer.from('"just a string"').toString('base64'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not an object');
  });

  it('rejects null JSON', () => {
    const result = validateEasyAuthPrincipal(Buffer.from('null').toString('base64'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not an object');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. validateEasyAuthPrincipal — Structure validation
// ═══════════════════════════════════════════════════════════════════════
describe('validateEasyAuthPrincipal — structure validation', () => {
  it('rejects missing auth_typ', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      claims: [{ typ: 'sub', val: 'user' }],
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('auth_typ');
  });

  it('rejects non-string auth_typ', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      auth_typ: 42,
      claims: [{ typ: 'sub', val: 'user' }],
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('auth_typ');
  });

  it('rejects missing claims', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      auth_typ: 'aad',
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('claims');
  });

  it('rejects non-array claims', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      auth_typ: 'aad',
      claims: 'not-an-array',
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('claims');
  });

  it('rejects empty claims (no subject found)', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      auth_typ: 'aad',
      claims: [],
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('subject');
  });

  it('rejects claims without a subject claim type', () => {
    const result = validateEasyAuthPrincipal(encodePrincipal({
      auth_typ: 'google',
      claims: [
        { typ: 'email', val: 'user@example.com' },
        { typ: 'name', val: 'Test User' },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('subject');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. validateEasyAuthPrincipal — Provider handling
// ═══════════════════════════════════════════════════════════════════════
describe('validateEasyAuthPrincipal — known/unknown providers', () => {
  const knownProviders = [
    'aad', 'google', 'apple', 'facebook', 'twitter',
    'github', 'microsoftaccount', 'aad-b2c', 'azureadb2c',
  ];

  it.each(knownProviders)('accepts known provider: %s', (provider) => {
    const result = validateEasyAuthPrincipal(validPrincipal('user-1', provider));
    expect(result.valid).toBe(true);
    expect(result.provider).toBe(provider);
    expect(loggerWarnSpy).not.toHaveBeenCalledWith(
      'auth.easyauth.unknown_provider',
      expect.anything()
    );
  });

  it('accepts unknown provider with warning (does not reject)', () => {
    const result = validateEasyAuthPrincipal(validPrincipal('user-1', 'custom-b2c-policy'));
    expect(result.valid).toBe(true);
    expect(result.provider).toBe('custom-b2c-policy');
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'auth.easyauth.unknown_provider',
      expect.objectContaining({ auth_typ: 'custom-b2c-policy' })
    );
  });

  it('normalizes provider to lowercase', () => {
    const result = validateEasyAuthPrincipal(validPrincipal('user-1', 'Google'));
    expect(result.valid).toBe(true);
    expect(result.provider).toBe('google');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. validateEasyAuthPrincipal — Subject claim extraction
// ═══════════════════════════════════════════════════════════════════════
describe('validateEasyAuthPrincipal — subject extraction', () => {
  it('extracts nameidentifier claim (highest priority)', () => {
    const header = encodePrincipal({
      auth_typ: 'aad',
      claims: [
        { typ: 'sub', val: 'sub-value' },
        {
          typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
          val: 'nameidentifier-value',
        },
      ],
    });
    const result = validateEasyAuthPrincipal(header);
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('nameidentifier-value');
  });

  it('extracts objectidentifier claim when nameidentifier is missing', () => {
    const header = encodePrincipal({
      auth_typ: 'aad',
      claims: [
        {
          typ: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
          val: 'oid-value',
        },
      ],
    });
    const result = validateEasyAuthPrincipal(header);
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('oid-value');
  });

  it('extracts "sub" claim as fallback', () => {
    const header = encodePrincipal({
      auth_typ: 'google',
      claims: [{ typ: 'sub', val: 'google-sub-123' }],
    });
    const result = validateEasyAuthPrincipal(header);
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('google-sub-123');
  });

  it('extracts "oid" claim as fallback', () => {
    const header = encodePrincipal({
      auth_typ: 'aad',
      claims: [{ typ: 'oid', val: 'oid-shortform-123' }],
    });
    const result = validateEasyAuthPrincipal(header);
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('oid-shortform-123');
  });

  it('extracts "nameidentifier" claim as lowest priority fallback', () => {
    const header = encodePrincipal({
      auth_typ: 'aad',
      claims: [{ typ: 'nameidentifier', val: 'nameid-short-123' }],
    });
    const result = validateEasyAuthPrincipal(header);
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('nameid-short-123');
  });

  it('returns full principal object on success', () => {
    const input = {
      auth_typ: 'aad',
      claims: [
        { typ: 'sub', val: 'user-1' },
        { typ: 'email', val: 'user@test.com' },
      ],
      name_typ: 'name-claim',
      role_typ: 'role-claim',
    };
    const result = validateEasyAuthPrincipal(encodePrincipal(input));
    expect(result.valid).toBe(true);
    expect(result.principal).toEqual(input);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. validateAndCrossCheckPrincipal
// ═══════════════════════════════════════════════════════════════════════
describe('validateAndCrossCheckPrincipal', () => {
  it('returns valid when subject matches principal ID header', () => {
    const result = validateAndCrossCheckPrincipal(
      validPrincipal('user-abc-123'),
      'user-abc-123'
    );
    expect(result.valid).toBe(true);
    expect(result.subjectId).toBe('user-abc-123');
    expect(result.provider).toBe('aad');
  });

  it('rejects when subject DOES NOT match principal ID header', () => {
    const result = validateAndCrossCheckPrincipal(
      validPrincipal('real-user-id'),
      'different-user-id'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('mismatch');
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'auth.easyauth.principal_mismatch',
      expect.anything()
    );
  });

  it('propagates structural validation errors', () => {
    const result = validateAndCrossCheckPrincipal(
      encodePrincipal({ auth_typ: 'aad' }), // missing claims
      'user-123'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('claims');
  });

  it('propagates base64 errors', () => {
    const result = validateAndCrossCheckPrincipal('', 'user-123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty');
  });
});
