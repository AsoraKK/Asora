import {
  HttpError,
  badRequestError,
  forbiddenError,
  notFoundError,
  unauthorizedError,
} from '@shared/utils/errors';

describe('HttpError helpers', () => {
  it('creates HttpError instances with provided metadata', () => {
    const error = new HttpError(422, 'invalid', { 'Retry-After': '10' });
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.message).toBe('invalid');
    expect(error.headers).toEqual({ 'Retry-After': '10' });
  });

  it('provides helpers with sensible defaults', () => {
    expect(badRequestError('bad').status).toBe(400);
    expect(unauthorizedError().status).toBe(401);
    expect(forbiddenError().message).toBe('forbidden');
    expect(notFoundError().message).toBe('not found');
  });
});
