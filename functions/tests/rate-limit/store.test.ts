import { __testing } from '@rate-limit/store';

describe('calculateAuthLockout', () => {
  const { calculateAuthLockout } = __testing;

  it('doubles lockout duration on consecutive failures', () => {
    expect(calculateAuthLockout(1)).toBe(2);
    expect(calculateAuthLockout(2)).toBe(4);
    expect(calculateAuthLockout(3)).toBe(8);
  });

  it('caps the lockout duration at 900 seconds', () => {
    expect(calculateAuthLockout(9)).toBe(512);
    expect(calculateAuthLockout(10)).toBe(900);
    expect(calculateAuthLockout(15)).toBe(900);
  });
});
