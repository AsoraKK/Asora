import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export const testHandler = async (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  return { status: 200, jsonBody: { message: 'test' } };
};
