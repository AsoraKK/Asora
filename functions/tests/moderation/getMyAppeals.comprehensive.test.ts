/**
 * getMyAppeals — DEFERRED (post-soft-launch)
 *
 * The `GET /moderation/my-appeals` endpoint is NOT registered in the canonical
 * route surface (`functions/src/moderation/index.ts`) and will not ship at soft
 * launch. The legacy implementation in `functions/moderation/getMyAppeals.ts`
 * uses the old CosmosClient/verifyJWT pattern and is not loaded by the
 * production entrypoint.
 *
 * This file serves as an explicit deferred gate: the test below will FAIL if
 * a `getMyAppealsRoute` export is accidentally wired into the moderation index
 * without first completing the canonical implementation and tests.
 *
 * When implementing:
 *   1. Create `functions/src/moderation/routes/getMyAppeals.ts` with
 *      `requireAuth` middleware (user-scoped, not moderator-only).
 *   2. Add `import './routes/getMyAppeals'` to `functions/src/moderation/index.ts`.
 *   3. Write tests covering: auth gate, pagination params, status filter,
 *      ownership isolation (user A cannot see user B's appeals), empty result,
 *      and voting-progress fields on pending appeals.
 *   4. Delete or replace this deferred gate with those real tests.
 *
 * Deferred reason: appeals history is a nice-to-have for soft launch;
 * the core moderation workflow (flag → appeal → moderator review) ships
 * without this user-facing list endpoint.
 */

import * as moderationIndex from '@moderation/index';

describe('getMyAppeals — deferred gate', () => {
  it('is NOT registered in the canonical moderation route surface', () => {
    // The getMyAppeals route must not be exported from the canonical module.
    // If this starts failing, a route was added without implementing and testing it.
    expect((moderationIndex as Record<string, unknown>)['getMyAppealsRoute']).toBeUndefined();
  });
});
