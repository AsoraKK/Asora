# Moderation Operations Playbook

> **Audience**: Lythaus moderation team, community volunteers, and trust & safety leads.

---

## 1. Overview

Lythaus uses a layered moderation pipeline:

1. **Automated (AI)** — Hive AI (primary) + Azure Content Safety (fallback) score every post/media at creation and edit time.
2. **Community voting** — Appealed content is reviewed by trusted community members (5-min window, 3-vote quorum).
3. **Admin override** — Trust & safety staff can override any automated or community decision.
4. **Scheduled resolution** — `resolveExpiredAppeals` timer auto-resolves appeals that expire without quorum.

---

## 2. Roles & Permissions

| Role | Capabilities | Assignment |
|------|-------------|------------|
| **User** | Submit appeals for own content, vote on appeals (if reputation ≥ threshold) | Automatic |
| **Community Voter** | Weighted vote on pending appeals | Reputation-gated |
| **Moderator** | View flag queue, review cases, escalate | Admin-assigned |
| **Admin** | Override decisions, adjust AI weights, manage invites, disable users | Backend role |

---

## 3. Response Time SLAs

| Severity | Description | Target Review Time | Escalation If Missed |
|----------|-------------|-------------------|---------------------|
| **P0 — Safety** | CSAM, self-harm, imminent threats | ≤ 15 minutes | Auto-block + immediate admin alert |
| **P1 — Urgent** | Harassment, doxxing, scam/phishing | ≤ 1 hour | Escalate to admin on-call |
| **P2 — Standard** | Policy violations, spam, misleading content | ≤ 24 hours | Auto-reminder to queue owner |
| **P3 — Low** | Minor policy edge cases, borderline content | ≤ 72 hours | Batch review in weekly triage |

---

## 4. Daily Triage Workflow

### Morning Check (Start of Shift)

1. Open the **Admin Control Panel** → Flag Queue tab.
2. Review pending **P0/P1** items first (sorted by AI confidence, highest first).
3. For each case:
   - Verify the AI confidence score and flagged categories.
   - Check the anonymized content preview.
   - Make a decision: **Approve** (restore), **Block** (hide), or **Escalate**.
4. Move to **Appeals** tab — review pending appeals nearing expiry.
5. Check **Insights** dashboard for anomaly spikes (sudden increase in flags = potential coordinated attack or policy change needed).

### Decision Framework

```
IF ai_confidence ≥ 0.85 AND category ∈ {hate_speech, csam, violence}:
    → BLOCK (immediate, no appeal window)
    
IF ai_confidence ∈ [0.5, 0.85]:
    → FLAG for human review (content remains visible with warning)
    
IF ai_confidence < 0.5:
    → PASS (log for analytics, no user-facing action)
    
IF appeal_type == 'false_positive':
    → PRIORITIZE review (urgency score = 8/10)
    → Check original AI analysis attached to appeal
```

---

## 5. Appeal Handling

### Community Vote Flow

1. User submits appeal → backend creates appeal record with original AI scores.
2. Eligible community voters (reputation ≥ threshold) see the appeal card.
3. **Voting window**: 5 minutes from appeal creation.
4. **Quorum**: 3 votes required.
5. Decision: weighted majority wins.
6. If quorum not met → `resolveExpiredAppeals` timer defaults per configured policy.

### Admin Override

When needed, admins can override any decision:

```bash
# Override an appeal decision (from admin-ops.md)
curl -X POST "$API_BASE/admin/appeals/{appealId}/override" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "reasonCode": "false_positive",
    "notes": "AI incorrectly flagged satire as hate speech"
  }'
```

Valid reason codes: `false_positive`, `policy_clarification`, `context_missing`, `technical_error`, `admin_discretion`.

---

## 6. Escalation Ladder

```
Community Voter → Moderator → Admin → Trust & Safety Lead → Legal
```

### When to Escalate

- **Voter → Moderator**: Split vote (close to 50/50), or voter is unsure.
- **Moderator → Admin**: Content involves public figures, potential legal liability, or coordinated abuse.
- **Admin → T&S Lead**: Cross-platform threats, law enforcement requests, CSAM.
- **T&S Lead → Legal**: Formal legal requests, subpoenas, regulatory inquiries.

---

## 7. Staffing Guidelines

| User Base Size | Recommended Moderators | Coverage |
|---------------|----------------------|----------|
| < 1,000 (beta) | 2 active + 1 backup | Business hours |
| 1,000 – 10,000 | 4 active + 2 backup | Extended hours (8am–midnight) |
| 10,000 – 100,000 | 8 active + 4 backup | 16/7 coverage |
| > 100,000 | 15+ active | 24/7 coverage |

**Burnout prevention**: Rotate moderators off P0/P1 queue after 4 hours. Schedule wellness check-ins weekly.

---

## 8. AI Weight Tuning

When false-positive rates exceed 5% for any category:

1. Pull decision logs: `GET /admin/decisions?provider=hive_v2&outcome=overturned&days=7`
2. Analyze the overturned decisions for pattern (specific category, content type, language).
3. Adjust weights via Admin Panel → AI Weights screen, or:

```bash
curl -X POST "$API_BASE/admin/weights" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "category": "hate_speech", "threshold": 0.75 }'
```

4. Monitor for 48 hours. Revert if precision drops below acceptable level.

---

## 9. Incident Response

### Coordinated Abuse / Brigading

1. **Detect**: Sudden spike in flags from few accounts targeting one user.
2. **Respond**: Temporarily increase AI confidence threshold for targeted content.
3. **Investigate**: Pull audit logs for involved accounts.
4. **Act**: Suspend participating accounts, restore targeted user's content.

### AI System Outage

1. **Detect**: Health endpoint shows `hive_degraded` or moderation queue grows rapidly.
2. **Respond**: Switch to Azure Content Safety fallback (automatic via pipeline).
3. **If both fail**: Enable "manual-only" mode — all new posts held for human review.
4. **Communicate**: Post status update on marketing site.

---

## 10. Metrics & Reporting

Track weekly:

- **Queue depth** at start/end of each day
- **Median review time** per severity
- **False-positive rate** (overturned automated decisions / total automated decisions)
- **Appeal success rate** (approved appeals / total appeals)
- **Community voter participation** (active voters / eligible voters)

Report monthly to T&S Lead with trend analysis.

---

## 11. Tools Quick Reference

| Action | Tool | Path |
|--------|------|------|
| View flag queue | Admin Control Panel | `/admin` → Flags tab |
| Review appeals | Admin Control Panel | `/admin` → Appeals tab |
| Override decision | API | `POST /admin/appeals/{id}/override` |
| Adjust AI weights | Admin Panel / API | `/admin` → Weights / `POST /admin/weights` |
| Disable user | API | `POST /admin/users/{id}/disable` |
| View audit log | API | `GET /admin/audit-log` |
| Check system health | API | `GET /api/health` |

---

*Last updated: 2026-02-08. See `docs/runbooks/admin-ops.md` for raw API commands.*
