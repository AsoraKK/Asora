import { ensurePrivacyAdmin } from '../src/privacy/common/authz';
import { AuthError } from '../src/auth/verifyJwt';
import { createAuditEntry } from '../src/privacy/common/models';

// Basic unit tests for privacy admin helpers and minimal route state transitions

describe('privacy admin authz', () => {
  it('throws for missing principal', () => {
    expect(() => ensurePrivacyAdmin(undefined)).toThrow(AuthError);
  });
  it('throws for principal without role', () => {
    expect(() => ensurePrivacyAdmin({ sub: 'u', roles: 'user basic' } as any)).toThrow(AuthError);
  });
  it('passes for principal with privacy_admin', () => {
    expect(() => ensurePrivacyAdmin({ sub: 'u', roles: ['privacy_admin'] } as any)).not.toThrow();
  });
});

describe('audit entry', () => {
  it('builds audit entry with meta', () => {
    const entry = createAuditEntry({ by: 'tester', event: 'export.enqueued', meta: { id: '123' } });
    expect(entry.by).toBe('tester');
    expect(entry.event).toBe('export.enqueued');
    expect(entry.meta).toEqual({ id: '123' });
  });
});
