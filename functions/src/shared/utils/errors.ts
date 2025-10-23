export class HttpError extends Error {
  status: number;
  headers?: Record<string, string>;

  constructor(status: number, message: string, headers?: Record<string, string>) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

export const badRequestError = (message: string) => new HttpError(400, message);
export const unauthorizedError = (message = 'unauthorized') => new HttpError(401, message);
export const forbiddenError = (message = 'forbidden') => new HttpError(403, message);
export const notFoundError = (message = 'not found') => new HttpError(404, message);
