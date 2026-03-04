# Hive AI Classes - Control Panel Configuration Guide

## Overview

Complete listing of all **29 Hive AI moderation classes** across three APIs with individual weight controls. Each class can be independently configured to fine-tune your moderation policy.

**Last Updated:** January 18, 2026  
**Source:** Live API Testing (text) + Hive Documentation (image, deepfake)

---

## Quick Reference

| Category | Count | Status | Notes |
|----------|-------|--------|-------|
| **Text Classes** | 19 | ✅ Live Verified | Ready for immediate use |
| **Image Classes** | 9 | 📖 Documented | Requires account upgrade |
| **Deepfake Classes** | 1 | 📖 Documented | Requires account upgrade |
| **TOTAL** | **29** | Mix | Full control panel ready |

---

## Text API Classes (19 total) ✅ LIVE VERIFIED

All 19 classes captured directly from Hive v2 API on 2026-01-18.

### Critical Safety Classes (Block Aggressively)

| Class Name | Default | Min | Max | Action |
|------------|---------|-----|-----|--------|
| **child_exploitation** | 0.99 | 0.5 | 1.0 | Block if score >= 50% |
| **self_harm_intent** | 0.95 | 0.5 | 1.0 | Block if score >= 95% |
| **child_safety** | 0.90 | 0.5 | 1.0 | Block if score >= 90% |

### High Priority Classes (Strict Moderation)

| Class Name | Default | Min | Max | Action |
|------------|---------|-----|-----|--------|
| **hate** | 0.85 | 0.3 | 1.0 | Block if score >= 85% |
| **violent_description** | 0.85 | 0.4 | 1.0 | Block if score >= 85% |
| **self_harm** | 0.90 | 0.5 | 1.0 | Block if score >= 90% |
| **sexual_description** | 0.75 | 0.3 | 1.0 | Block if score >= 75% |
| **weapons** | 0.80 | 0.3 | 1.0 | Block if score >= 80% |
| **gibberish** | 0.85 | 0.5 | 1.0 | Block if score >= 85% |
| **spam** | 0.80 | 0.4 | 1.0 | Block if score >= 80% |

### Medium Priority Classes (Moderate Moderation)

| Class Name | Default | Min | Max | Action |
|------------|---------|-----|-----|--------|
| **violence** | 0.70 | 0.3 | 1.0 | Warn if score >= 70% |
| **bullying** | 0.80 | 0.3 | 1.0 | Block if score >= 80% |
| **promotions** | 0.70 | 0.3 | 1.0 | Block if score >= 70% |
| **redirection** | 0.75 | 0.3 | 1.0 | Block if score >= 75% |
| **drugs** | 0.75 | 0.3 | 1.0 | Block if score >= 75% |

### Low Priority Classes (Flexible Moderation)

| Class Name | Default | Min | Max | Action |
|------------|---------|-----|-----|--------|
| **sexual** | 0.50 | 0.2 | 1.0 | Warn if score >= 50% |
| **phone_number** | 0.50 | 0.2 | 1.0 | Warn if score >= 50% |
| **minor_implicitly_mentioned** | 0.60 | 0.2 | 1.0 | Warn if score >= 60% |
| **minor_explicitly_mentioned** | 0.70 | 0.3 | 1.0 | Block if score >= 70% |

---

## Image API Classes (9 total) 📖 DOCUMENTED

Available when image moderation is enabled in your Hive AI project.

| Class Name | Default | Min | Max | Description |
|------------|---------|-----|-----|-------------|
| **general_image_classification** | 0.70 | 0.3 | 1.0 | General inappropriate image content |
| **nudity** | 0.60 | 0.2 | 1.0 | Nudity or partial nudity |
| **adult_content** | 0.75 | 0.3 | 1.0 | Sexually explicit adult content |
| **violence_image_detection** | 0.70 | 0.3 | 1.0 | Depiction of violence/gore |
| **gore** | 0.85 | 0.4 | 1.0 | Graphic gore or severe injuries |
| **illegal_activity** | 0.75 | 0.3 | 1.0 | Depiction of illegal activities |
| **hate_symbols** | 0.85 | 0.5 | 1.0 | Hate group symbols (zero tolerance) |
| **weapons_image** | 0.75 | 0.3 | 1.0 | Weapons, explosives, dangerous items |
| **self_harm_image** | 0.95 | 0.5 | 1.0 | Self-harm imagery (crisis risk) |

---

## Deepfake API Class (1 total) 📖 DOCUMENTED

Available when deepfake detection is enabled in your Hive AI project.

| Class Name | Default | Min | Max | Description |
|------------|---------|-----|-----|-------------|
| **deepfake_detection** | 0.80 | 0.5 | 1.0 | Deepfake/face-swap synthetic media |

---

## How to Use These in the Control Panel

### 1. Understanding the Weight Values

Each class has three values:

- **defaultWeight**: What we recommend (0.85 = block if score ≥ 85%)
- **minWeight**: Loosest setting allowed (0.3-0.5)
- **maxWeight**: Strictest setting allowed (1.0 = absolute zero tolerance)

### 2. Adjusting a Class

**Example: Making "spam" detection stricter**

```
Current: 0.80 (block if score >= 80%)
Action:  Move slider to 0.95
Effect:  Only block obvious spam, let borderline through
```

**Example: Making "hate" detection looser**

```
Current: 0.85 (block if score >= 85%)
Action:  Move slider to 0.50
Effect:  Catch more potential hate speech, more false positives
```

### 3. Safe Ranges by Priority

| Priority | Recommended Range | When to Use |
|----------|------------------|-------------|
| **Critical** | 0.50 - 0.99 | Child safety, self-harm (always aggressive) |
| **High** | 0.70 - 0.90 | Hate, violence, weapons |
| **Medium** | 0.50 - 0.80 | Bullying, spam, drugs |
| **Low** | 0.20 - 0.60 | Sexual, privacy, contextual |

### 4. Common Adjustment Scenarios

**Scenario A: Too Much Spam Blocking Legitimate Posts**
- ❌ Problem: `spam` set to 0.80, too aggressive
- ✅ Solution: Lower to 0.70-0.75
- 📊 Impact: Fewer false positives, more spam may get through

**Scenario B: Missing Hate Speech**
- ❌ Problem: `hate` set to 0.90, missing borderline cases
- ✅ Solution: Lower to 0.75-0.80
- 📊 Impact: Catch more hate, some edge cases blocked

**Scenario C: Adult Content Too Lenient**
- ❌ Problem: `adult_content` set to 0.50, borderline slipping through
- ✅ Solution: Raise to 0.80+
- 📊 Impact: Stricter NSFW filtering

---

## Class Descriptions & Context

### Text API - Detailed Breakdown

#### Hate & Violence Group
- **hate**: Hateful/discriminatory content
- **violence**: Depiction of violent behavior
- **violent_description**: Graphic violence details
- **weapons**: Illegal weapons/trafficking

#### Child Safety Group
- **child_exploitation**: Sexual abuse of minors (CRITICAL)
- **child_safety**: Threats to child wellbeing
- **minor_explicitly_mentioned**: Minors mentioned directly
- **minor_implicitly_mentioned**: Minors referenced indirectly

#### Mental Health Group
- **self_harm**: Promoting/glorifying self-harm
- **self_harm_intent**: Expressing intent to self-harm (CRITICAL)

#### Adult Content Group
- **sexual**: Sexual/erotic content
- **sexual_description**: Explicit sexual descriptions

#### Spam & Abuse Group
- **spam**: Repetitive low-quality content
- **bullying**: Harassment/threatening behavior
- **promotions**: Suspicious promotional spam
- **redirection**: Phishing/scam links
- **gibberish**: Nonsensical spam text
- **phone_number**: Privacy risk (phone numbers)
- **drugs**: Drug use/trafficking/promotion

---

## Filtering Recommendations by Use Case

### Use Case: Family-Friendly Platform
```
Critical Classes: 0.99  (block almost everything)
Hate/Violence: 0.85-0.90
Sexual: 0.60  (warn, don't block)
Minor-related: 0.70+
Spam: 0.80
```

### Use Case: General Social Network
```
Critical Classes: 0.85-0.95  (normal)
Hate/Violence: 0.75-0.85
Sexual: 0.50-0.60  (context matters)
Minor-related: 0.70
Spam: 0.75-0.80
```

### Use Case: Professional Community (LinkedIn-style)
```
Critical Classes: 0.90+
Hate/Violence: 0.70-0.80  (less strict)
Sexual: 0.40-0.50  (professional content OK)
Spam: 0.85-0.90  (very strict)
```

### Use Case: Lenient (User Preference)
```
Critical Classes: 0.50-0.70  (only block clear risks)
Hate/Violence: 0.60-0.70
Sexual: 0.30-0.40
Spam: 0.70
```

---

## Implementation Notes

### Storage & Persistence
- **Default Config**: TypeScript file (`hive-classes-config.ts`)
- **User Overrides**: Stored in Cosmos DB `ModerationWeights` collection
- **Runtime**: Check Cosmos first, fall back to defaults
- **API**: Control Panel fetches via `/api/admin/moderation-classes`

### Apply Changes
When user adjusts weights in Control Panel:
1. ✅ Validate new weight is within `minWeight` and `maxWeight`
2. ✅ Save to Cosmos DB with timestamp
3. ✅ Clear any local caches
4. ✅ Next post uses new weights immediately

### Auditing
- ✅ Log who changed what weights and when
- ✅ Store change history (allow rollback)
- ✅ Export weight configs for backup

---

## Testing Your Configuration

### Before Going Live
1. **Review Defaults**: Do they match your policy?
2. **Test Edge Cases**: Run sample posts through moderation
3. **Monitor Metrics**: Track decision distribution (allow/warn/block)
4. **Iterate**: Adjust weights based on false positive/negative rates

### Metrics to Monitor
- False Positive Rate: % of content incorrectly blocked
- False Negative Rate: % of policy violations that slip through
- Decision Distribution: % ALLOW vs WARN vs BLOCK
- Per-Class Performance: Which classes catch real issues?

---

## API Reference for Developers

### Get All Classes
```typescript
import { ALL_HIVE_CLASSES } from './shared/hive-classes-config';

ALL_HIVE_CLASSES.forEach(cls => {
  console.log(`${cls.name}: default ${cls.defaultWeight}`);
});
```

### Get Classes by API Type
```typescript
import { getClassesByApiType } from './shared/hive-classes-config';

const textClasses = getClassesByApiType('text');  // 19 classes
const imageClasses = getClassesByApiType('image');  // 9 classes
```

### Get Default Weights as Lookup
```typescript
import { getDefaultWeights } from './shared/hive-classes-config';

const weights = getDefaultWeights();
if (apiScore[className] >= weights[className]) {
  // Block this content
}
```

---

## Troubleshooting

### Q: Why is legitimate content being blocked?
**A:** Weight is too low (too aggressive). Increase the weight value to 0.80-0.90.

### Q: Why is policy-violating content getting through?
**A:** Weight is too high (too lenient). Decrease the weight value to 0.50-0.70.

### Q: Can I set custom min/max ranges?
**A:** Currently no - ranges are fixed for safety. Contact support to adjust.

### Q: How do I reset to defaults?
**A:** Delete your Cosmos DB overrides, system will use TypeScript defaults.

### Q: Do changes apply immediately?
**A:** Yes - next post/image uses new weights immediately.

---

## Support & Updates

- **Questions**: Check moderation logs in Application Insights
- **Issues**: Report via Control Panel support
- **Updates**: Hive classes updated when they release new models
- **Last Sync**: 2026-01-18

---

**This document is the source of truth for all Hive moderation class configurations. Keep it updated when adding new classes or changing defaults.**
