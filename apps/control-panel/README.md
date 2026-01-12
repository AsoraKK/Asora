# Lythaus Control Panel

Primary admin UI for beta operations.

Build command: npm ci && npm run build
Output folder: dist/
Note: Single-page app routing requires Pages redirect rules.

## Configuration

Set `VITE_ADMIN_API_URL` to override the admin API base URL. Defaults to
`https://admin-api.asora.co.za`.

The Dashboard includes an Admin session panel that stores the API URL and
admin JWT in local storage for this browser.
