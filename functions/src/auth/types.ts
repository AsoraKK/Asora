export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  client_id: string;
  code_verifier?: string;
  refresh_token?: string;
}

export interface AuthSession {
  id: string;
  partitionKey: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  userId?: string;
  authorizationCode?: string;
  createdAt: string;
  expiresAt: string;
  used?: boolean;
}

export interface UserDocument {
  id: string;
  email: string;
  role: string;
  tier: string;
  reputationScore: number;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
    birthDate?: string;
    phoneNumber?: string;
    timezone?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    publicProfile: boolean;
    allowDirectMessages: boolean;
  };
}

export interface AuthorizeRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  nonce?: string;
  code_challenge: string;
  code_challenge_method: string;
  user_id?: string;
}

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  tier?: string;
  reputation?: number;
  iss?: string;
  aud?: string;
  exp?: number;  // Added by jwt.sign()
  iat?: number;  // Added by jwt.sign()
  jti?: string;  // Added by jwt.sign()
  nonce?: string;
  [key: string]: unknown;  // Allow additional claims
}

/**
 * Type guard for TokenPayload
 */
export function isTokenPayload(x: unknown): x is TokenPayload {
  return !!x && typeof x === 'object' && 'sub' in x && typeof (x as TokenPayload).sub === 'string';
}
