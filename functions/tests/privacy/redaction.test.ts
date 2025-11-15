import { createHash } from 'node:crypto';

describe('redactRecord', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DSR_IP_HASH_ALG = 'sha1';
    process.env.DSR_IP_HASH_SALT = 'test-salt';
  });

  it('hashes IP fields and drops sensitive metadata', () => {
    const { redactRecord } = require('../../src/privacy/common/redaction');

    const initial = {
      clientIp: '1.2.3.4',
      sourceIp: '10.10.10.10',
      vendorToken: 'secret-token',
      nested: {
        connectionIp: '172.16.0.1',
        secretKey: 'value',
      },
      arrayField: [
        { ipAddress: '8.8.8.8', token: 'inner' },
        { text: 'safe' },
      ],
      normal: 'keep-me',
    };

    const sanitized = redactRecord(initial);

    const hash = createHash('sha1');
    hash.update(`1.2.3.4:test-salt`);
    const expected = hash.digest('hex');

    expect(sanitized.clientIp).toBe(expected);
    expect(sanitized.vendorToken).toBeUndefined();
    expect(sanitized.nested).toEqual({ connectionIp: expect.any(String) });
    expect(sanitized.nested?.connectionIp).not.toBe('172.16.0.1');
    expect(sanitized.nested?.secretKey).toBeUndefined();
    expect(sanitized.arrayField[0].ipAddress).toEqual(expect.any(String));
    expect(sanitized.arrayField[0].token).toBeUndefined();
    expect(sanitized.normal).toBe('keep-me');
  });
});