import { verifyAuthorizationHeader } from '@auth/verifyJwt';

export interface TokenPayload {
  sub: string;
  role?: string;
  roles: string[];
  tier: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

class JWTService {
  /**
   * Verify and decode a token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);
    const roles = Array.isArray(principal.roles)
      ? principal.roles
      : typeof principal.roles === 'string'
        ? principal.roles.split(' ').map((item) => item.trim()).filter(Boolean)
        : [];

    return {
      ...(principal.raw as Record<string, unknown>),
      sub: principal.sub,
      role: roles[0] ?? undefined,
      roles,
      tier: principal.tier ?? 'free',
      email: principal.email,
      iss: typeof principal.raw?.iss === 'string' ? principal.raw.iss : undefined,
    } as unknown as TokenPayload;
  }
}

export const jwtService = new JWTService();
