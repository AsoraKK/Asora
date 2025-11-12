import { JWTPayload } from 'jose';

export type Principal = {
  sub: string;
  name?: string;
  email?: string;
  scp?: string | string[];
  roles?: string | string[];
  raw?: JWTPayload;
};

declare module '@azure/functions' {
  interface InvocationContext {
    principal?: Principal;
  }
}
