# Alpha Entitlement Matrix

Status: Canonical for controlled Alpha
Backend source of truth: `functions/src/shared/services/tierLimits.ts`

| Entitlement | Free | Premium | Black |
| --- | ---: | ---: | ---: |
| Discovery feed | Yes | Yes | Yes |
| Custom feeds | 1 | 2 | 3 |
| News Board preview | Yes | Yes | Yes |
| News Board full access | No | Yes | Yes |
| Daily posts | 5 | 20 | 50 |
| Daily comments | 20 | 100 | 300 |
| Daily reactions | 100 | 1,000 | 1,500 |
| Daily appeals | 1 | 3 | 10 |
| Export cooldown | 30 days | 7 days | 1 day |
| Maximum media size | 10 MB | 25 MB | 25 MB |
| Media attachments | 1 | 4 | 5 |
| Reward level cap | 3 | 5 | 5 |
| Reward choice breadth | Limited | Increased | Full eligible set |

`Admin` is an internal role, never a commercial tier. Legacy `admin` tier claims are normalized to Black entitlements while role checks remain separate.

The backend resolves the current user record before applying entitlements. Unknown or expired manual grants fall back to Free, so stale JWT/client state cannot raise access. Premium and Black Alpha access is manually assigned by an active admin with an audit reason, review date, and expiry no more than 90 days ahead. Payments are not connected; user-facing status is `Alpha access`.

News Board responses include `accessLevel: preview | full`. Free preview is limited to three items and has no continuation cursor. Direct API requests, custom-feed creation, media upload, posting limits, and reward awards use server checks.
