import { createLocalJWKSet, importPKCS8, jwtVerify, SignJWT, type JSONWebKeySet } from 'jose';

export interface Principal {
  userId: string;
  roles: string[];
  tokenVersion: number;
}

export async function signAccessToken(input: {
  userId: string;
  roles?: string[];
  privateKeyPem: string;
  keyId: string;
  tokenVersion?: number;
  expiresInSeconds?: number;
}): Promise<string> {
  const privateKey = await importPKCS8(input.privateKeyPem, 'ES256');
  const expiresInSeconds = input.expiresInSeconds ?? 900;
  return new SignJWT({ roles: input.roles ?? [], tokenVersion: input.tokenVersion ?? 1 })
    .setProtectedHeader({ alg: 'ES256', kid: input.keyId, typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(privateKey);
}

export async function verifyAccessToken(token: string, jwksJson: string): Promise<Principal> {
  const jwks = createLocalJWKSet(JSON.parse(jwksJson) as JSONWebKeySet);
  const verified = await jwtVerify(token, jwks, { algorithms: ['ES256'] });
  const subject = verified.payload.sub;
  if (!subject) throw new Error('token_subject_missing');
  const roles = Array.isArray(verified.payload.roles)
    ? verified.payload.roles.filter((role): role is string => typeof role === 'string')
    : [];
  const tokenVersion = typeof verified.payload.tokenVersion === 'number' && Number.isInteger(verified.payload.tokenVersion)
    ? verified.payload.tokenVersion
    : 1;
  return { userId: subject, roles, tokenVersion };
}
