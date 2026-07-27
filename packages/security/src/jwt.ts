import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';

export interface Principal {
  userId: string;
  roles: string[];
}

export async function verifyAccessToken(token: string, jwksJson: string): Promise<Principal> {
  const jwks = createLocalJWKSet(JSON.parse(jwksJson) as JSONWebKeySet);
  const verified = await jwtVerify(token, jwks, { algorithms: ['ES256'] });
  const subject = verified.payload.sub;
  if (!subject) throw new Error('token_subject_missing');
  const roles = Array.isArray(verified.payload.roles)
    ? verified.payload.roles.filter((role): role is string => typeof role === 'string')
    : [];
  return { userId: subject, roles };
}
