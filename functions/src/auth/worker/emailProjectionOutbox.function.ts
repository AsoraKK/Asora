import { app, type InvocationContext, type Timer } from '@azure/functions';

import { getCosmosClient } from '@shared/clients/cosmos';
import { getPool } from '@shared/clients/postgres';
import { trackAppEvent } from '@shared/appInsights';

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 8;

function nextAttempt(attempt: number): Date {
  return new Date(Date.now() + Math.min(60 * 60_000, 1_000 * 2 ** Math.min(attempt, 10)));
}

async function upsertVerifiedUser(userId: string): Promise<void> {
  const result = await getPool().query(
    `SELECT u.id, u.primary_email, u.created_at
     FROM users u JOIN email_auth_credentials c ON c.user_id = u.id
     WHERE u.id = $1 AND c.email_verified_at IS NOT NULL`,
    [userId]
  );
  const user = result.rows[0] as { id: string; primary_email: string; created_at: Date } | undefined;
  if (!user) return;

  const database = getCosmosClient().database(process.env.COSMOS_DATABASE_NAME || 'asora');
  await database.container('users').items.upsert({
    id: user.id,
    partitionKey: user.id,
    email: user.primary_email,
    role: 'user',
    tier: 'free',
    reputationScore: 0,
    createdAt: new Date(user.created_at).toISOString(),
    lastLoginAt: new Date(user.created_at).toISOString(),
    isActive: true,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      publicProfile: true,
      allowDirectMessages: true,
    },
  });
}

export async function processEmailProjectionOutbox(context: InvocationContext): Promise<void> {
  const client = await getPool().connect();
  let rows: Array<{ id: string; aggregate_id: string; attempt_count: number }> = [];
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `SELECT id, aggregate_id, attempt_count
       FROM auth_email_projection_outbox
       WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND next_attempt_at <= NOW()
       ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT $1`,
      [BATCH_SIZE]
    );
    rows = claimed.rows as Array<{ id: string; aggregate_id: string; attempt_count: number }>;
    for (const row of rows) {
      await client.query(
        `UPDATE auth_email_projection_outbox
         SET attempt_count = attempt_count + 1, next_attempt_at = $2
         WHERE id = $1`,
        [row.id, nextAttempt(Number(row.attempt_count || 0) + 1)]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    context.error('[auth-email-projection] claim failed');
    return;
  } finally {
    client.release();
  }

  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await upsertVerifiedUser(row.aggregate_id);
      await getPool().query(
        `UPDATE auth_email_projection_outbox SET processed_at = NOW(), last_error_class = NULL WHERE id = $1`,
        [row.id]
      );
      processed += 1;
    } catch {
      const attempt = Number(row.attempt_count || 0) + 1;
      await getPool().query(
        `UPDATE auth_email_projection_outbox
         SET last_error_class = 'projection_failure',
             next_attempt_at = $2,
             dead_lettered_at = CASE WHEN $3 >= $4 THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [row.id, nextAttempt(attempt), attempt, MAX_ATTEMPTS]
      );
      failed += 1;
    }
  }

  if (rows.length > 0) {
    trackAppEvent({
      name: 'auth_email_projection_outbox',
      properties: { claimed: String(rows.length), processed: String(processed), failed: String(failed) },
    });
  }
}

export async function emailProjectionOutboxTimer(_timer: Timer, context: InvocationContext): Promise<void> {
  await processEmailProjectionOutbox(context);
}

app.timer('auth_email_projection_outbox', {
  schedule: '0 */1 * * * *',
  handler: emailProjectionOutboxTimer,
});
