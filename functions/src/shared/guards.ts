import { Container } from '@azure/cosmos';

export async function enforceReadGate(user: { sub: string }, usersCtn: Container) {
  const { resource: u } = await usersCtn.item(user.sub, user.sub).read();
  if (u?.accountLocked) {
    const err: any = new Error('First post required to unlock reading');
    err.status = 403;
    throw err;
  }
}
