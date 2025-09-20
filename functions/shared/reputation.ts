import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const usersContainer = database.container('users');
const auditContainer = database.container('reputation_audit');

export async function adjustReputation(userId: string, delta: number, reason: string, idempotencyKey: string): Promise<void> {
  const auditId = `rep_${idempotencyKey}`;
  try {
    const existing = await auditContainer.item(auditId, auditId).read();
    if (existing.resource) return; // already applied
  } catch {
    // TODO: Handle audit record read failure
  }

  try {
    const { resource: user } = await usersContainer.item(userId, userId).read();
    if (!user) return;
    const newScore = Math.max(0, (user.reputationScore || 0) + delta);
    await usersContainer.item(userId, userId).replace({ ...user, reputationScore: newScore });
  } finally {
    await auditContainer.items.create({ id: auditId, userId, delta, reason, createdAt: new Date().toISOString() });
  }
}

