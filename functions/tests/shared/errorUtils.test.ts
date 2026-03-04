import {
  isError,
  isCosmosError,
  getErrorStatusCode,
  isHttpLikeError,
  getErrorMessage,
  getErrorDetails,
  isNotFoundError,
  isConflictError,
  isPreconditionFailedError,
  type CosmosError,
  type HttpLikeError,
} from '@shared/errorUtils';

describe('errorUtils', () => {
  describe('isError', () => {
    it('returns true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new RangeError('test'))).toBe(true);
    });

    it('returns false for non-Error values', () => {
      expect(isError('string')).toBe(false);
      expect(isError(42)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError({ message: 'not an error' })).toBe(false);
      expect(isError([])).toBe(false);
    });
  });

  describe('isCosmosError', () => {
    it('returns true for Error with code property', () => {
      const err = new Error('Cosmos error') as CosmosError;
      err.code = 404;
      expect(isCosmosError(err)).toBe(true);
    });

    it('returns true for Error with statusCode property', () => {
      const err = new Error('Cosmos error') as CosmosError;
      err.statusCode = 409;
      expect(isCosmosError(err)).toBe(true);
    });

    it('returns true for Error with both code and statusCode', () => {
      const err = new Error('Cosmos error') as CosmosError;
      err.code = 404;
      err.statusCode = 404;
      expect(isCosmosError(err)).toBe(true);
    });

    it('returns false for regular Error without code/statusCode', () => {
      expect(isCosmosError(new Error('regular error'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isCosmosError({ code: 404 })).toBe(false);
      expect(isCosmosError('error')).toBe(false);
      expect(isCosmosError(null)).toBe(false);
    });
  });

  describe('getErrorStatusCode', () => {
    it('returns code property when present', () => {
      expect(getErrorStatusCode({ code: 404 })).toBe(404);
      expect(getErrorStatusCode({ code: '409' })).toBe('409');
    });

    it('returns statusCode when code is absent', () => {
      expect(getErrorStatusCode({ statusCode: 500 })).toBe(500);
    });

    it('prefers code over statusCode when both present', () => {
      expect(getErrorStatusCode({ code: 404, statusCode: 500 })).toBe(404);
    });

    it('returns undefined for non-object values', () => {
      expect(getErrorStatusCode(null)).toBeUndefined();
      expect(getErrorStatusCode(undefined)).toBeUndefined();
      expect(getErrorStatusCode('string')).toBeUndefined();
      expect(getErrorStatusCode(42)).toBeUndefined();
    });

    it('returns undefined when neither code nor statusCode present', () => {
      expect(getErrorStatusCode({})).toBeUndefined();
      expect(getErrorStatusCode({ message: 'error' })).toBeUndefined();
    });
  });

  describe('isHttpLikeError', () => {
    it('returns true for Error with numeric statusCode', () => {
      const err = new Error('HTTP error') as HttpLikeError;
      err.statusCode = 404;
      expect(isHttpLikeError(err)).toBe(true);
    });

    it('returns false for Error without statusCode', () => {
      expect(isHttpLikeError(new Error('regular error'))).toBe(false);
    });

    it('returns false for Error with non-numeric statusCode', () => {
      const err = new Error('error') as any;
      err.statusCode = 'not a number';
      expect(isHttpLikeError(err)).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isHttpLikeError({ statusCode: 404 })).toBe(false);
      expect(isHttpLikeError(null)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from Error instances', () => {
      expect(getErrorMessage(new Error('test message'))).toBe('test message');
      expect(getErrorMessage(new TypeError('type error'))).toBe('type error');
    });

    it('returns the string if error is a string', () => {
      expect(getErrorMessage('plain string error')).toBe('plain string error');
    });

    it('returns "Unknown error" for other types', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(undefined)).toBe('Unknown error');
      expect(getErrorMessage(42)).toBe('Unknown error');
      expect(getErrorMessage({})).toBe('Unknown error');
      expect(getErrorMessage([])).toBe('Unknown error');
    });
  });

  describe('getErrorDetails', () => {
    it('extracts full details from Error instances', () => {
      const err = new Error('test error');
      const details = getErrorDetails(err);
      expect(details.name).toBe('Error');
      expect(details.message).toBe('test error');
      expect(details.stack).toBeDefined();
      expect(details.code).toBeUndefined();
    });

    it('includes code for Cosmos errors', () => {
      const err = new Error('Cosmos error') as CosmosError;
      err.code = 404;
      const details = getErrorDetails(err);
      expect(details.code).toBe(404);
      expect(details.name).toBe('Error');
      expect(details.message).toBe('Cosmos error');
    });

    it('handles non-Error values', () => {
      expect(getErrorDetails('string error')).toEqual({ message: 'string error' });
      expect(getErrorDetails(42)).toEqual({ message: '42' });
      expect(getErrorDetails(null)).toEqual({ message: 'null' });
      expect(getErrorDetails(undefined)).toEqual({ message: 'undefined' });
    });
  });

  describe('isNotFoundError', () => {
    it('returns true for code 404', () => {
      expect(isNotFoundError({ code: 404 })).toBe(true);
      expect(isNotFoundError({ code: '404' })).toBe(true);
    });

    it('returns true for statusCode 404', () => {
      expect(isNotFoundError({ statusCode: 404 })).toBe(true);
      expect(isNotFoundError({ statusCode: '404' })).toBe(true);
    });

    it('prefers code over statusCode', () => {
      expect(isNotFoundError({ code: 404, statusCode: 500 })).toBe(true);
      expect(isNotFoundError({ code: 500, statusCode: 404 })).toBe(false);
    });

    it('returns false for non-404 codes', () => {
      expect(isNotFoundError({ code: 500 })).toBe(false);
      expect(isNotFoundError({ code: 409 })).toBe(false);
      expect(isNotFoundError({ statusCode: 200 })).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isNotFoundError(null)).toBe(false);
      expect(isNotFoundError(undefined)).toBe(false);
      expect(isNotFoundError('error')).toBe(false);
      expect(isNotFoundError(404)).toBe(false);
    });

    it('returns false for objects without code/statusCode', () => {
      expect(isNotFoundError({})).toBe(false);
      expect(isNotFoundError({ message: 'not found' })).toBe(false);
    });
  });

  describe('isConflictError', () => {
    it('returns true for code 409', () => {
      expect(isConflictError({ code: 409 })).toBe(true);
      expect(isConflictError({ code: '409' })).toBe(true);
    });

    it('returns true for statusCode 409', () => {
      expect(isConflictError({ statusCode: 409 })).toBe(true);
      expect(isConflictError({ statusCode: '409' })).toBe(true);
    });

    it('prefers code over statusCode', () => {
      expect(isConflictError({ code: 409, statusCode: 500 })).toBe(true);
      expect(isConflictError({ code: 500, statusCode: 409 })).toBe(false);
    });

    it('returns false for non-409 codes', () => {
      expect(isConflictError({ code: 404 })).toBe(false);
      expect(isConflictError({ code: 500 })).toBe(false);
      expect(isConflictError({ statusCode: 200 })).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isConflictError(null)).toBe(false);
      expect(isConflictError(undefined)).toBe(false);
      expect(isConflictError('error')).toBe(false);
    });
  });

  describe('isPreconditionFailedError', () => {
    it('returns true for code 412', () => {
      expect(isPreconditionFailedError({ code: 412 })).toBe(true);
      expect(isPreconditionFailedError({ code: '412' })).toBe(true);
    });

    it('returns true for statusCode 412', () => {
      expect(isPreconditionFailedError({ statusCode: 412 })).toBe(true);
      expect(isPreconditionFailedError({ statusCode: '412' })).toBe(true);
    });

    it('returns true for Error message containing "Precondition Failed"', () => {
      const err = new Error('Precondition Failed: ETag mismatch');
      expect(isPreconditionFailedError(err)).toBe(true);
    });

    it('returns true when both code and message indicate precondition failure', () => {
      const err = new Error('Precondition Failed') as CosmosError;
      err.code = 412;
      expect(isPreconditionFailedError(err)).toBe(true);
    });

    it('returns false for non-412 codes without message match', () => {
      expect(isPreconditionFailedError({ code: 404 })).toBe(false);
      expect(isPreconditionFailedError({ code: 500 })).toBe(false);
      expect(isPreconditionFailedError(new Error('different error'))).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isPreconditionFailedError(null)).toBe(false);
      expect(isPreconditionFailedError(undefined)).toBe(false);
      expect(isPreconditionFailedError('error')).toBe(false);
    });

    it('prefers code over statusCode', () => {
      expect(isPreconditionFailedError({ code: 412, statusCode: 500 })).toBe(true);
      expect(isPreconditionFailedError({ code: 500, statusCode: 412 })).toBe(false);
    });
  });
});
