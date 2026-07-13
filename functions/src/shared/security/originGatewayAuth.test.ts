import { HttpRequest } from '@azure/functions';
import {
  authorizeGatewayRequest,
  constantTimeTokenMatches,
  ORIGIN_TOKEN_HEADER,
} from './originGatewayAuth';

describe('origin gateway authentication', () => {
  afterEach(() => {
    delete process.env.ORIGIN_GATEWAY_AUTH_REQUIRED;
    delete process.env.ORIGIN_GATEWAY_TOKEN;
  });

  function request(token?: string): HttpRequest {
    return new HttpRequest({
      url: 'https://origin.example.com/api/health',
      method: 'GET',
      headers: token ? { [ORIGIN_TOKEN_HEADER]: token } : {},
    });
  }

  it('does not enforce the guard before the rollout flag is enabled', () => {
    expect(authorizeGatewayRequest(request())).toBeUndefined();
  });

  it('fails closed when enforcement is enabled without a configured token', () => {
    process.env.ORIGIN_GATEWAY_AUTH_REQUIRED = 'true';
    expect(authorizeGatewayRequest(request())).toMatchObject({ status: 503 });
  });

  it('rejects missing and incorrect tokens', () => {
    process.env.ORIGIN_GATEWAY_AUTH_REQUIRED = 'true';
    process.env.ORIGIN_GATEWAY_TOKEN = 'expected-secret-value';
    expect(authorizeGatewayRequest(request())).toMatchObject({ status: 403 });
    expect(authorizeGatewayRequest(request('wrong-secret-value'))).toMatchObject({ status: 403 });
  });

  it('accepts an exact token using constant-time digest comparison', () => {
    process.env.ORIGIN_GATEWAY_AUTH_REQUIRED = 'true';
    process.env.ORIGIN_GATEWAY_TOKEN = 'expected-secret-value';
    expect(constantTimeTokenMatches('expected-secret-value', 'expected-secret-value')).toBe(true);
    expect(authorizeGatewayRequest(request('expected-secret-value'))).toBeUndefined();
  });
});
