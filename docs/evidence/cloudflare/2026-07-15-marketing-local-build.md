# Marketing local-build validation — 2026-07-15

## Result

**Repository artifact validation passed; Pages preview is not proven.**

`apps/marketing-site` was built locally with `npm ci && npm run build`.
Astro generated ten static routes:

- `/`
- `/about`
- `/ai-moderation`
- `/contact`
- `/features`
- `/guidelines`
- `/invite`
- `/pricing`
- `/privacy`
- `/terms`

The generated `dist` artifact was scanned for `azurewebsites.net`, obsolete
public Asora hostnames, and the Pages development hostname; no matches were
found. Canonical and Open Graph URLs use `https://lythaus.co`; `robots.txt`
references `https://lythaus.co/sitemap.xml`; and the sitemap contains the ten
generated routes.

## Static security configuration

The generated `_headers` config includes conservative HSTS, CSP with
`connect-src https://api.lythaus.co`, clickjacking protection, and restrictive
permissions/referrer policies. `_redirects` provides the invite route fallback.

## Not proven

- A Cloudflare Pages project and immutable Pages deployment have not been
  created in this pass.
- HTTP security-header delivery, browser broken-link checks, and Pages rollback
  need to run against the immutable preview deployment.
- No Lythaus custom domain was attached and no production DNS was changed.

The Pages preview remains blocked until the credential-configuration issue in
`2026-07-15-origin-enforcement-remediation.md` is remediated through an
approved rotation procedure.
