# Privacy Compliance Audit Packet

> **Purpose**: Centralized reference for GDPR/POPIA compliance verification.  
> **Audience**: Data Protection Officer, legal, engineering leads.  
> **Last reviewed**: 2026-02-08

---

## 1. Data Subject Rights (DSR) Implementation Status

| Right | Endpoint / Feature | Status | Evidence |
|-------|-------------------|--------|----------|
| **Right of Access** (Art. 15) | `GET /api/privacy/export` | ✅ Implemented | `privacy_api.dart:74`, `privacy.ts` |
| **Right to Erasure** (Art. 17) | `DELETE /api/privacy/delete` | ✅ Implemented | `privacy_api.dart:121` |
| **Right to Data Portability** (Art. 20) | JSON export format | ✅ Implemented | Export returns machine-readable JSON |
| **Right to Rectification** (Art. 16) | Profile edit + post edit | ✅ Implemented | `posts_update.function.ts`, profile endpoints |
| **Right to Restrict Processing** | Account disable | ✅ Implemented | `admin-ops.md` user disable |
| **Right to Object** | Analytics consent toggle | ✅ Implemented | `analytics_consent_changed` event |
| **Consent Management** | In-app analytics consent | ✅ Implemented | `privacy_settings_screen.dart` |

### DSR SLA Targets

| Request Type | Target SLA | Implementation |
|-------------|-----------|----------------|
| Data Export | ≤ 72 hours | Automated via API; manual verification step |
| Account Deletion | ≤ 30 days | Soft-delete immediately, hard-delete within 30 days |
| Consent Change | Immediate | Real-time toggle, no delayed processing |

---

## 2. Third-Party Data Processors

| Processor | Data Shared | Purpose | DPA Status |
|-----------|------------|---------|------------|
| **Azure Cosmos DB** | User content, profiles | Primary datastore | Microsoft DPA ✅ |
| **Azure Blob Storage** | Media uploads | File storage | Microsoft DPA ✅ |
| **Azure App Insights** | Anonymized telemetry | Performance monitoring | Microsoft DPA ✅ |
| **Firebase (FCM)** | Device tokens | Push notifications | Google DPA ✅ |
| **Hive AI** | Content text (no PII sent) | Content moderation | DPA required ⚠️ |
| **Azure Content Safety** | Content text (no PII sent) | Moderation fallback | Microsoft DPA ✅ |

### PII in Telemetry Check

- Analytics events are PII-free by design (`analytics_events.dart` uses categorical/numeric properties only).
- App Insights SDK sends anonymized telemetry; user IDs are hashed.
- FCM device tokens are stored separately from user profiles.

---

## 3. Legal Documents

| Document | Location | Status |
|----------|----------|--------|
| Privacy Policy | `docs/legal/public/privacy-policy.md` | ✅ Drafted, approved |
| Terms of Service | `docs/legal/public/terms-of-service.md` | ✅ Drafted, approved |
| Google Play Data Safety | `docs/compliance/google-play-data-safety.md` | ✅ Worksheet complete |
| Community Guidelines | `docs/legal/public/community-guidelines.md` | ✅ Created |

---

## 4. Security Measures (Art. 32)

| Measure | Implementation | Evidence |
|---------|---------------|----------|
| Encryption in transit | TLS 1.2+ with SPKI pinning | `tls_pinning.dart`, `environment_config.dart` |
| Encryption at rest | Azure-managed encryption | Cosmos DB, Blob Storage default |
| Access control | Role-based auth (JWT) | `authorizeService.ts` |
| Device integrity | Jailbreak/root detection | `device_integrity_guard.dart` |
| Secure storage | `flutter_secure_storage` for tokens | `oauth2_service.dart` |
| Logging & audit | Structured logging, App Insights | `azure-logger.ts`, `appInsights.ts` |
| Key management | Azure Key Vault references | Deploy workflows use `@Microsoft.KeyVault(...)` |

---

## 5. Data Retention Policy

| Data Type | Retention | Deletion Method |
|-----------|-----------|----------------|
| User profiles | Until account deletion | Soft-delete → hard-delete in 30 days |
| Posts/comments | Until deleted by user or moderation | Soft-delete → hard-delete in 30 days |
| Media uploads | Until parent content deleted | Blob deletion cascaded |
| Moderation logs | 2 years (regulatory) | Automated purge |
| Analytics events | 90 days | App Insights retention policy |
| Device tokens (FCM) | Until logout or token refresh | Cleaned on sign-out |
| Audit logs | 1 year | Automated purge |

---

## 6. Breach Notification Plan

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Identify and contain breach | Immediately |
| 2 | Assess scope and affected data | ≤ 24 hours |
| 3 | Notify supervisory authority (GDPR Art. 33) | ≤ 72 hours |
| 4 | Notify affected users if high risk (Art. 34) | Without undue delay |
| 5 | Document incident and remediation | ≤ 7 days |

---

## 7. Pre-Launch Compliance Checklist

- [x] Privacy policy published and accessible from app
- [x] Terms of service published and accessible from app
- [x] Analytics consent collected before tracking
- [x] Data export endpoint functional
- [x] Account deletion endpoint functional
- [x] PII scrubbed from analytics events
- [x] Google Play Data Safety worksheet complete
- [x] Community guidelines document created
- [x] DSR response procedures documented (`docs/runbooks/dsr.md`)
- [x] Legal hold procedures documented (`docs/runbooks/legal-operations.md`)
- [ ] Apple App Privacy disclosure complete (external — App Store Connect)
- [ ] Hive AI DPA signed (external — vendor relationship)
- [ ] Annual privacy impact assessment scheduled

---

*For DSR operational procedures, see `docs/runbooks/dsr.md`.*  
*For legal hold handling, see `docs/runbooks/legal-operations.md`.*
