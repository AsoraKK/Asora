import * as jose from 'jose';

export interface TokenPayload {
  sub: string;
  roles: string[];
  tier: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

class JWTService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    this.issuer = process.env.JWT_ISSUER || 'asora-auth';
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  /**
   * Generate a token pair (access + refresh) for a user
   */
  async generateTokenPair(
    userId: string,
    roles: string[],
    tier: string
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresIn = this.parseExpiry(this.accessTokenExpiry);
    const refreshExpiresIn = this.parseExpiry(this.refreshTokenExpiry);

    const accessToken = await this.signToken({
      sub: userId,
      roles,
      tier,
      iat: now,
      exp: now + accessExpiresIn,
      iss: this.issuer,
    });

    const refreshToken = await this.signToken({
      sub: userId,
      roles,
      tier,
      iat: now,
      exp: now + refreshExpiresIn,
      iss: this.issuer,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessExpiresIn,
    };
  }

  /**
   * Verify and decode a token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    const secret = new TextEncoder().encode(this.secret);
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: this.issuer,
    });

    return payload as unknown as TokenPayload;
  }

  /**
   * Sign a token payload
   */
  private async signToken(payload: { sub: string; roles: string[]; tier: string; iat: number; exp: number; iss: string }): Promise<string> {
    const secret = new TextEncoder().encode(this.secret);
    return await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
  }

  /**
   * Parse expiry string (e.g., "15m", "7d") to seconds
   */
  private parseExpiry(expiryStr: string): number {
    if (!expiryStr) {
      throw new Error('Expiry string cannot be empty');
    }
    const match = expiryStr.match(/^(\d+)([mhd])$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(`Invalid expiry format: ${expiryStr}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        throw new Error(`Unknown expiry unit: ${unit}`);
    }
  }
}

export const jwtService = new JWTService();
