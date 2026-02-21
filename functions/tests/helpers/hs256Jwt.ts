import { SignJWT, decodeJwt, jwtVerify, type JWTPayload } from 'jose';

function getSecretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

type SignOptions = {
  expiresIn?: string;
  jti?: string;
};

export async function signHs256Jwt(
  payload: Record<string, unknown>,
  secret: string,
  options: SignOptions = {}
): Promise<string> {
  let jwt = new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  if (options.expiresIn) {
    jwt = jwt.setExpirationTime(options.expiresIn);
  }

  if (options.jti) {
    jwt = jwt.setJti(options.jti);
  }

  return jwt.sign(getSecretBytes(secret));
}

export async function verifyHs256Jwt(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecretBytes(secret));
  return payload;
}

export function decodeHs256Jwt(token: string): JWTPayload {
  return decodeJwt(token);
}
