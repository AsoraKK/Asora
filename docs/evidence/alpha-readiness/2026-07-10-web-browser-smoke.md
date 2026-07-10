# Web Alpha Browser Smoke — 2026-07-10

Status: **not run**

The exact Flutter web artifact has not been deployed. `deploy-alpha-web.yml` now downloads the web artifact from the successful exact-SHA CI run, validates redirects and security headers, deploys without rebuilding, and runs browser smoke against real deep-link patterns rather than public test routes. The workflow uploads a SHA-bound smoke artifact; no such artifact exists for this candidate yet.
