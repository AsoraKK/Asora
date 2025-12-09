import { HttpHandlerContext } from './handler';
import { jwtService, TokenPayload } from '@auth/service/jwtService';

/**
 * Authentication context injected into protected handlers
 */
export interface AuthContext {
  userId: string;
  roles: string[];
  tier: string;
  token: TokenPayload;
}

/**
 * Extract and verify JWT from Authorization header
 * Throws error if missing or invalid
 */
export async function extractAuthContext(ctx: HttpHandlerContext): Promise<AuthContext> {
  const authHeader = ctx.request.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  // Extract bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    throw new Error('Invalid Authorization header format');
  }

  const token = match[1];

  try {
    const payload = await jwtService.verifyToken(token);
    return {
      userId: payload.sub,
      roles: payload.roles,
      tier: payload.tier,
      token: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JWT verification failed: ${message}`);
  }
}
