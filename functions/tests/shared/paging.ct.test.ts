import { encodeCt, decodeCt } from '../../shared/paging';

test('encode/decode ct', () => {
  const obj = { v: 1, q: 'local', c: 'token123', ts: '2024-01-01T00:00:00Z', id: 'abc' };
  const ct = encodeCt(obj);
  const back = decodeCt(ct);
  expect(back.q).toBe('local');
  expect(back.c).toBe('token123');
});
