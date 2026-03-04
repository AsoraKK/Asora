import { failure, success } from '@shared/types';

describe('Result helpers', () => {
  it('wraps values in a success result', () => {
    expect(success('value')).toEqual({ ok: true, value: 'value' });
  });

  it('wraps errors in a failure result', () => {
    expect(failure('boom', 418)).toEqual({ ok: false, error: 'boom', code: 418 });
  });
});
