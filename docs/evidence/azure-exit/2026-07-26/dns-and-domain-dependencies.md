# DNS and Domain Dependencies

Azure certificates and Function hostnames exist for `asora.co.za`, `www.asora.co.za`, and `dev.asora.co.za`. Repository and worker configuration also reference `asora-function-dev.azurewebsites.net`; public gateway/Cloudflare routes must be identified before origin retirement.

Cloudflare DNS was not changed or queried through a provider API in this audit. DNS records pointing to Azure remain unverified. Preserve certificates and hostname bindings until public DNS, ingress, OAuth callbacks, webhook endpoints, and monitoring have been migrated and tested.
