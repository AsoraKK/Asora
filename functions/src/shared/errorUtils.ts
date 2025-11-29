/**
 * Type-safe error handling utilities
 * 
 * Use these helpers instead of `catch (error: any)` to properly narrow
 * unknown errors while maintaining type safety.
 */

/**
 * Type guard for Error instances
 */
export function isError(err: unknown): err is Error {
  return err instanceof Error;
}

/**
 * Type guard for Cosmos DB errors with a code property
 */
export interface CosmosError extends Error {
  code: number | string;
}

export function isCosmosError(err: unknown): err is CosmosError {
  return isError(err) && 'code' in err;
}

/**
 * Type guard for errors with a statusCode property (HTTP-like errors)
 */
export interface HttpLikeError extends Error {
  statusCode: number;
}

export function isHttpLikeError(err: unknown): err is HttpLikeError {
  return isError(err) && typeof (err as HttpLikeError).statusCode === 'number';
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(err: unknown): string {
  if (isError(err)) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Unknown error';
}

/**
 * Extract error details for logging (safe for unknown errors)
 */
export function getErrorDetails(err: unknown): {
  name?: string;
  message: string;
  code?: string | number;
  stack?: string;
} {
  if (isError(err)) {
    return {
      name: err.name,
      message: err.message,
      code: isCosmosError(err) ? err.code : undefined,
      stack: err.stack,
    };
  }
  return {
    message: String(err),
  };
}

/**
 * Check if error is a "not found" error (Cosmos 404)
 */
export function isNotFoundError(err: unknown): boolean {
  return isCosmosError(err) && (err.code === 404 || err.code === '404');
}

/**
 * Check if error is a conflict error (Cosmos 409)
 */
export function isConflictError(err: unknown): boolean {
  return isCosmosError(err) && (err.code === 409 || err.code === '409');
}

/**
 * Check if error is a precondition failed error (Cosmos 412 / ETag mismatch)
 */
export function isPreconditionFailedError(err: unknown): boolean {
  if (isCosmosError(err) && (err.code === 412 || err.code === '412')) {
    return true;
  }
  if (isError(err) && err.message?.includes('Precondition Failed')) {
    return true;
  }
  return false;
}
