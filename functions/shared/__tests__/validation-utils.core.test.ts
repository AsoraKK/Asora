import {
  validatePagination,
  validateText,
  validateUUID,
  validateEmail,
  validateStringArray,
  validateLocation,
  validateRadius,
  validateFeedType,
  validateCategory,
  sanitizeText,
  validateRequestSize
} from '../../shared/validation-utils';

describe('validation-utils', () => {
  test('validatePagination: invalids and valid', () => {
    expect(validatePagination(0, 10).valid).toBe(false);
    expect(validatePagination(1, 0).valid).toBe(false);
    expect(validatePagination(1, 100, 50).valid).toBe(false);
    expect(validatePagination(2, 25).valid).toBe(true);
  });

  test('validateText: type, length, patterns', () => {
    expect(validateText(undefined as any).valid).toBe(false);
    expect(validateText('  ', 1).valid).toBe(false);
    const long = 'a'.repeat(1001);
    expect(validateText(long).valid).toBe(false);
    expect(validateText('<script>alert(1)</script>').valid).toBe(false);
    expect(validateText(' ok text ').valid).toBe(true);
  });

  test('validateUUID: invalid and valid', () => {
    expect(validateUUID('not-a-uuid').valid).toBe(false);
    expect(validateUUID('123e4567-e89b-12d3-a456-426614174000').valid).toBe(true);
  });

  test('validateEmail: invalid and valid', () => {
    expect(validateEmail('bad@').valid).toBe(false);
    expect(validateEmail('user@example.com').valid).toBe(true);
  });

  test('validateStringArray: type, count, item length', () => {
    expect(validateStringArray('not-array' as any).valid).toBe(false);
    expect(validateStringArray(Array(11).fill('a')).valid).toBe(false);
    expect(validateStringArray(['a'.repeat(51)]).valid).toBe(false);
    expect(validateStringArray(['tag1', 'tag2']).valid).toBe(true);
  });

  test('validateLocation and validateRadius', () => {
    expect(validateLocation('New York, US').valid).toBe(true);
    expect(validateLocation('<bad>').valid).toBe(false);
    expect(validateRadius(-1).valid).toBe(false);
    expect(validateRadius(10).valid).toBe(true);
  });

  test('validateFeedType and validateCategory', () => {
    expect(validateFeedType('unknown').valid).toBe(false);
    expect(validateFeedType('trending').valid).toBe(true);
    expect(validateCategory('MUSIC').valid).toBe(true);
    expect(validateCategory('invalid-cat').valid).toBe(false);
  });

  test('sanitizeText trims, collapses spaces, strips <> and truncates', () => {
    const input = '  hello   <b>world</b>  ';
    const out = sanitizeText(input);
    // Strips angle brackets but not slashes
    expect(out).toBe('hello bworld/b');
    const big = 'x'.repeat(1200);
    expect(sanitizeText(big)).toHaveLength(1000);
  });

  test('validateRequestSize respects max', () => {
    const small = { a: 'x'.repeat(10) };
    expect(validateRequestSize(small, 1024).valid).toBe(true);
    const huge = { a: 'x'.repeat(1024 * 1024 + 10) };
    expect(validateRequestSize(huge, 1024).valid).toBe(false);
  });
});
