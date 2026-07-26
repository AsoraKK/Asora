# DSR Dependency Map

Request entrypoints are the privacy HTTP functions and admin DSR routes. They validate a request, persist state in Cosmos `privacy_requests`/`privacy_audit`, enqueue work to the DSR storage account, and rely on `privacyDsrProcessor` and `privacyDsrPurge` for export/delete processing. Export artifacts are stored under the DSR export container and are subject to retention and signed-URL settings.

Required runtime dependencies: Cosmos, PostgreSQL, `stasoradsrdev`, `dsr-requests`, `dsr-requests-poison`, Key Vault references, Function trigger configuration, and App Insights/Log Analytics.

Live queue names were listed, but approximate message counts could not be returned with the current data-plane permissions. Therefore queue safety, outstanding DSR records, poison state, and completion state remain **UNVERIFIED** and are shutdown blockers.

Required retained evidence: request IDs/statuses without personal data, export/delete completion proof, audit events, retry/poison outcomes, incident logs, and legal-hold state. Do not export user documents to this repository.
