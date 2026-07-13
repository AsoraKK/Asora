# Asora domain retirement runbook

`asora.co.za` remains a defensive legacy domain. It is not deleted during the Lythaus cutover.

## Public web path map

| Legacy host/path | Destination | Behaviour |
|---|---|---|
| `asora.co.za/` | `https://lythaus.co/` | Permanent, preserve query |
| `www.asora.co.za/` | `https://lythaus.co/` | Permanent, preserve query |
| `lythaus.asora.co.za/` | `https://lythaus.co/` | Permanent, preserve path/query where an equivalent exists |
| `/privacy` | `https://lythaus.co/privacy` | Permanent |
| `/terms` | `https://lythaus.co/terms` | Permanent |
| `/guidelines` | `https://lythaus.co/guidelines` | Permanent |
| `/invite/{code}` | `https://lythaus.co/invite/{code}` | Permanent, preserve code/query |
| Unknown legacy page | Intentional migration page or `404` | Never redirect to an unrelated page |

## Legacy APIs

If `api.asora.co.za` or another legacy API becomes active, proxy it to the same verified backend as `api.lythaus.co`; preserve method, body, query, and safe headers. Add `Deprecation`, a reviewed `Sunset` date, and `Link: <https://api.lythaus.co/api>; rel="successor-version"`. Log only aggregate, non-sensitive host/path-class/status metrics.

Compatibility remains for at least 30 days and until legitimate traffic is zero for 14 consecutive days. Removal requires a separate review. After retirement, return documented `410 Gone`; never use blind `301`/`302` for mutation requests.

## Preconditions for removal

- All controlled clients use Lythaus hosts.
- Traffic monitoring distinguishes bots, scanners, and legitimate clients without PII.
- DNS, Worker, Access, certificate, and rollback exports exist.
- Customer/support communications and deprecation dates are approved.
- A tested reactivation path exists.

The 2026-07-13 audit did not identify legacy Worker routes or provider rules, so no retirement action is authorized.
