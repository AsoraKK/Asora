# Lythaus Reputation, Rewards & Public Feed Eligibility System — v1

**Status:** Product/architecture specification — draft approved for implementation planning  
**Date:** 26 May 2026  
**Product:** Lythaus, formerly Asora  
**Repository:** AsoraKK/Asora  
**Owner:** Product / Platform  
**Related areas:** reputation, rewards, moderation, AI transparency, public feed ranking, subscriptions, Editorial, user profile transparency

---

## 1. Purpose

This document defines the Lythaus reputation system, rewards programme, public feed eligibility rules, and user-facing Reputation Ledger.

The system is designed to reward constructive human participation, discourage AI spam and manipulation, support transparent moderation, and create a commercially useful rewards layer without turning credibility into a paid feature.

The core product logic is:

> Reputation measures contribution trust.  
> Verification measures account authenticity and human uniqueness signals.  
> Rewards use subscription tier and reputation level to unlock benefits.  
> Public feed featuring uses reputation as a trust signal, not as a guarantee of visibility.

---

## 2. Strategic principles

Lythaus should optimise for:

1. Trust
2. Human authenticity
3. Feed quality
4. Reputation
5. News/community value
6. Monetisation

The reputation and rewards system must never invert this hierarchy. Paid subscriptions may unlock rewards and product features, but they must not directly buy credibility, moderation immunity, Editorial status, or public feed dominance.

### 2.1 What reputation should reward

Reputation should reward:

- Human-authored contribution
- Constructive participation
- Good-faith disagreement
- Transparent AI disclosure
- Source quality
- Helpful replies
- Account consistency
- Positive moderation history
- Community trust from credible users
- Public-interest contribution quality

### 2.2 What reputation should not reward

Reputation should not primarily reward:

- Virality
- Raw posting volume
- Ragebait
- Follower count
- Paid subscription status
- Engagement farming
- Undisclosed AI generation
- Bot-like activity
- Manipulative synthetic content
- Coordinated voting or reaction pods

---

## 3. Key definitions

| Term | Definition |
|---|---|
| Reputation | A user-level trust and contribution quality indicator based on behaviour, content quality, AI transparency, moderation outcomes, reactions, and verification signals. |
| Reputation Level | A simplified user-facing level derived from internal reputation scoring. |
| Reputation Ledger | A transparent, read-only profile record showing the user what reputation-relevant events have been tracked. |
| Reward Level | A commercial benefits tier containing partner offers, product perks, discounts, or Lythaus privileges. |
| Verification Strength | Account authenticity signals such as email verification, Google/Apple auth, and future World ID / WorldAuth verification. |
| Human-authored | Text substantially written by the user without generative AI producing the core content. |
| AI-assisted | User-authored content where AI helped with editing, phrasing, summarisation, spelling, translation, structuring, or brainstorming. |
| AI-generated | Content where generative AI produced the core substance of the post, reply, media, or argument. |
| Moderation signal | A flag, Hive classification, user report, appeal, moderator decision, or behavioural abuse indicator. |
| Public feed eligibility | Whether content is eligible to appear in wider discovery/public surfaces. |

---

## 4. Subscription and reward access model

Lythaus reward access is based on subscription tier. Reputation can unlock eligibility inside that tier, but subscription status must not increase reputation directly.

| Tier | Rewards access | Notes |
|---|---|---|
| Guest | Nothing | Read-only or limited discovery access. No rewards. |
| Free | Level 1 max; 1 option from Level 1 | A small teaser reward only. Not high-value. |
| Premium | Reward Levels 1–5; 1 option from each level | Strong mid-tier value. Does not grant reputation acceleration. |
| Black | Reward Levels 1–5; all options available | Best value. Full rewards marketplace access. |
| Editorial | Exclusive privileges | Merit-based layer, not a normal paid subscription. May combine with paid tier rewards. |

### 4.1 Reward levels

| Reward level | Value band | Example reward types |
|---|---|---|
| Level 1 | Low value | Small partner discounts, app perks, introductory trials, low-cost affiliate offers. |
| Level 2 | Moderate value | Better privacy/security, productivity, learning, or community offers. |
| Level 3 | Strong value | Premium partner offers, event access, advanced learning/research perks. |
| Level 4 | High value | Stronger bundles, higher-value discounts, exclusive partner offers. |
| Level 5 | Very high / scarce | Limited offers, professional tools, high-trust benefits, invite-only opportunities. |

### 4.2 Editorial privileges

Editorial is not a paid status. It is earned, merit-based, behaviour-dependent, and revocable.

Potential Editorial privileges:

- Editorial badge
- News Board contribution eligibility
- Long-form publishing tools
- Citation/source-linking tools
- Better article analytics
- Peer review input for future Editorial applicants
- AMA/event hosting tools
- Public-interest contributor visibility
- Journalism/research-specific partner offers
- Higher review priority for moderation/appeals, without immunity

Editorial users must not receive:

- Moderation immunity
- Hidden feed manipulation powers
- Political authority
- Special protection from platform rules
- Ability to unilaterally approve Editorial applicants

---

## 5. Reputation levels

The public product should use levels rather than raw points. Raw scores are too gameable and can create anxiety, disputes, and optimisation loops.

| Level | Name | Meaning |
|---|---|---|
| 0 | New | Not enough positive account history. |
| 1 | Verified | Basic verified account with limited positive history. |
| 2 | Trusted | Consistent good behaviour and low-risk participation. |
| 3 | Established | Regular high-quality human contribution. |
| 4 | Credible | Strong contribution quality, sourcing, and community trust. |
| 5 | Highly Credible | High-trust user with strong history and low abuse risk. |
| Editorial | Editorial Contributor | Separate merit/status layer for public-interest contributors. |

### 5.1 Reputation level rules

- Paid subscription status must not directly increase reputation.
- Reputation should influence public feed eligibility, but must not guarantee reach.
- Reputation should influence moderation process priority, but must never create immunity.
- Reputation should be recoverable after minor or moderate negative events through clean behaviour and time-based decay.
- Severe abuse, manipulation, or ban evasion may create long-lived or persistent reputation restrictions.

---

## 6. Reputation pillars

Internal reputation should be calculated from six primary pillars.

| Pillar | Purpose | Example signals |
|---|---|---|
| Human Contribution | Measures authentic human-authored participation. | Human-authored 250+ character posts, transparent AI disclosure, original replies. |
| Content Quality | Measures usefulness and public-interest value. | Well-sourced posts, helpful replies, thoughtful analysis, original reporting. |
| Interaction Quality | Measures how the user interacts with others. | Constructive replies, high-signal reactions, low abuse reports. |
| Behaviour Trust | Measures safety and policy compliance. | Moderation history, validated reports, Hive moderation outcomes, appeals. |
| Verification Strength | Measures account authenticity signals. | Email, Google, Apple, World ID / WorldAuth. |
| Community Trust | Measures trust from reputable users. | Helpful/well-sourced reactions from high-reputation users, credible engagement. |

### 6.1 Suggested default weights

These weights are implementation defaults, not permanent product law. They should be feature-flagged and adjustable.

| Pillar | Default weight |
|---|---:|
| Human Contribution | 25% |
| Content Quality | 25% |
| Behaviour Trust | 20% |
| Interaction Quality | 15% |
| Verification Strength | 10% |
| Community Trust | 5% |

Rationale:

- Human contribution and quality should dominate.
- Behaviour trust must be strong enough to prevent toxic but popular users from rising.
- Verification matters, but a verified human is not automatically a trustworthy contributor.
- Community trust should matter, but not so much that voting rings can control reputation.

---

## 7. AI content reputation policy

### 7.1 Core rule

AI-text reputation enforcement starts at **250 characters and above**.

This avoids over-policing short replies while applying stricter checks to longer posts where reputation gain is more meaningful.

### 7.2 Text rules

| Text length | AI enforcement | Reputation rule |
|---|---|---|
| 0–249 characters | Light enforcement | AI-assisted or AI-generated text is generally not reputation-policed unless spammy, abusive, manipulative, or coordinated. |
| 250+ characters | Strict enforcement | AI classification affects reputation eligibility and moderation outcomes. |

### 7.3 Long-form text reputation rules

| Content type | Allowed? | Reputation effect |
|---|---|---|
| Human-authored text, 250+ characters | Yes | Full reputation eligible. |
| Disclosed AI-assisted text, 250+ characters | Yes | Reduced reputation or neutral reputation, depending on calibration. |
| Disclosed AI-generated text, 250+ characters | Product-policy dependent | Zero reputation. |
| Undisclosed AI-generated text, 250+ characters | No / blocked / flagged | Reputation penalty. |
| Repeated undisclosed AI text | No | Escalating penalties and possible account restrictions. |

Recommended v1 policy:

- Human-authored long text earns full reputation eligibility.
- Disclosed AI-assisted long text may be allowed but earns reduced reputation.
- Disclosed AI-generated long text earns zero reputation.
- Undisclosed AI-generated long text is blocked, flagged, or penalised.

### 7.4 AI media rules

AI-generated images, video, and audio are treated more strictly than text because they carry higher deception and synthetic identity risk.

| Media type | Policy | Reputation effect |
|---|---|---|
| AI-generated image | Block, flag, or allow only under strict labelled exceptions if later approved | No reputation. |
| AI-generated video | Block or flag | No reputation. |
| AI-generated audio | Block or flag | No reputation. |
| Deepfake / synthetic identity media | Block and escalate | Strong negative signal. |
| Undisclosed synthetic media | Block and penalise | Strong negative signal. |

### 7.5 AI labels

Public content labels should remain simple:

- Human-authored
- AI-assisted
- AI-generated
- Under review

Numeric AI confidence scores must not be shown publicly in v1. Internal AI scores may be used for moderation, appeals, audit, and abuse prevention.

---

## 8. Hive moderation and behavioural signals

Hive and moderation systems should feed into Behaviour Trust and the Reputation Ledger.

### 8.1 Moderation signal types

| Signal | Reputation impact |
|---|---|
| Clean moderation history | Positive over time. |
| Repeated flagged posts | Negative if validated or pattern-based. |
| Confirmed policy violation | Negative. |
| Severe policy violation | Strong negative and possible restriction. |
| Successful appeal | Restore or reverse penalty. |
| False positive moderation result | Clear, not merely decay. |
| False reporting by user | Negative. |
| Spam-like behaviour | Negative. |
| Coordinated manipulation | Severe negative. |
| Ban evasion | Severe negative and persistent restriction. |

### 8.2 Hive usage principles

- Hive AI/moderation classifications should inform decisions, not replace policy judgement.
- Raw Hive scores should not be public.
- Users should see clear labels and broad reasons, not model internals.
- Appeals should be available for content blocks or meaningful penalties.
- Moderation decisions should be auditable.
- False positives should be reversible.

### 8.3 Moderation and reputation interaction

| Moderation outcome | Reputation effect |
|---|---|
| Content allowed | No penalty; eligible for ordinary reputation rules. |
| Content labelled AI-assisted | Reduced or neutral reputation for 250+ character text. |
| Content labelled AI-generated | Zero reputation for 250+ character text. |
| Content blocked for undisclosed AI generation | Penalty, especially on repeated attempts. |
| Content flagged by users but not validated | No direct penalty. |
| Content report validated | Penalty proportional to severity. |
| Appeal accepted | Penalty removed or restored. |
| Appeal rejected | Penalty remains; repeated bad-faith appeals may be limited. |

---

## 9. Likes, dislikes, emojis, and reactions

Reactions should affect reputation, but weakly and with anti-gaming controls.

### 9.1 Reaction categories

Generic likes and emojis are low-signal. Lythaus should prioritise structured reactions that support high-quality discourse.

Recommended structured reactions:

| Reaction | Meaning | Reputation effect |
|---|---|---|
| Helpful | The content helped the user understand something. | Positive. |
| Well sourced | The content used credible sources or evidence. | Strong positive. |
| Thoughtful | The content added meaningful perspective. | Positive. |
| Agree | Agreement signal. | Weak positive. |
| Disagree | Disagreement signal. | Very weak negative or neutral. |
| Misleading | User believes content is misleading. | Negative only if corroborated. |
| Low effort | User believes content is low value. | Weak negative; capped. |
| Report | Policy concern. | No direct penalty until validated. |

### 9.2 Emoji rules

Positive and negative emojis may be supported, but they should carry low reputation weight because they are ambiguous.

Examples:

| Emoji category | Reputation use |
|---|---|
| Positive emoji | Very small positive signal. |
| Negative emoji | Very small negative signal; cap strongly. |
| Laughing / sarcasm-type emoji | Extremely low or no reputation effect because meaning is ambiguous. |
| Angry emoji | Do not treat as policy signal unless paired with reports or validated quality signals. |

### 9.3 Anti-brigading controls

Reaction-based reputation must include:

- Daily/weekly contribution caps
- Per-content reaction caps
- Vote/reaction weighting by voter reputation
- Duplicate account and device-risk checks
- Graph-distance checks for engagement pods
- Suspicious burst detection
- Downvote/dislike brigading protection
- Reporter reliability scoring

Raw likes should not be enough to raise reputation meaningfully. A post with fewer reactions from credible users should be able to outperform a post with many low-quality reactions.

---

## 10. Public feed eligibility and featuring

Higher reputation should improve a user’s chance of being featured on public feed surfaces. It must not guarantee placement.

### 10.1 Public feed principles

The public feed should optimise for:

- Trust
- Human-authored contribution
- Content quality
- Relevance
- Freshness
- Source quality
- Constructive engagement
- Moderation safety
- Diversity of voices

The public feed should avoid optimising for:

- Rage engagement
- Raw likes
- Reply wars
- Clickbait
- Volume posting
- Paid subscription status
- Repetitive posts from the same users

### 10.2 Public feed scoring model

Conceptual model:

```text
Public Feed Score = Content Quality
                  × Trust Weight
                  × Freshness Factor
                  × Relevance Factor
                  × Safety Multiplier
                  × Diversity Control
```

Where:

| Factor | Meaning |
|---|---|
| Content Quality | Quality of the specific post/reply, not just the author. |
| Trust Weight | Reputation-derived author trust. |
| Freshness Factor | Prevents stale content from dominating. |
| Relevance Factor | Topic and user/feed relevance. |
| Safety Multiplier | Reduces or blocks risky/moderated content. |
| Diversity Control | Prevents one ideology, group, topic, or account cluster from dominating. |

### 10.3 Reputation effect on feed

| Reputation level | Public feed effect |
|---|---|
| Level 0 — New | Eligible only after safety checks; low trust boost. |
| Level 1 — Verified | Normal eligibility. |
| Level 2 — Trusted | Slight trust boost. |
| Level 3 — Established | Medium trust boost. |
| Level 4 — Credible | Stronger trust boost. |
| Level 5 — Highly Credible | Higher featuring probability. |
| Editorial | Eligible for Editorial/news-specific surfaces, subject to content quality. |

### 10.4 Important constraints

- Paid tier must not directly boost public feed placement.
- Dislikes alone must not bury content.
- Controversial but well-sourced content should remain eligible.
- Moderation risk can reduce eligibility even for high-reputation users.
- Public feed diversity controls should prevent reputation-rich users from monopolising discovery.

---

## 11. Reputation Ledger

The Reputation Ledger is a transparent, read-only record stored on the user profile. It explains what reputation-relevant events have been tracked and how they affected the user.

### 11.1 Purpose

The ledger exists to make reputation understandable and auditable without exposing exact anti-abuse formulas.

User-facing positioning:

> Reputation Activity: a transparent record of the actions and decisions that affect your Lythaus reputation.

Avoid language such as:

> Your human score.

or

> How human you are.

### 11.2 Ledger rules

- Ledger entries are stored on the user profile.
- Ledger entries are visible to the account owner.
- Some entries may be publicly visible if they support public trust, but privacy defaults should be conservative.
- Users cannot edit or remove ledger entries.
- Entries remain until they decay, are reversed by appeal, or are corrected by an authorised admin/moderation process.
- Users can appeal moderation-related ledger entries.
- Raw Hive scores, exact ranking multipliers, and internal risk scores must not be visible.

### 11.3 User-facing ledger examples

| Ledger entry | Example wording |
|---|---|
| Human-authored contribution | + Reputation: Human-authored post over 250 characters. |
| Sourcing quality | + Reputation: Post marked well sourced by trusted users. |
| Helpful reply | + Reputation: Helpful reply recognised by the community. |
| Verified email | + Verification signal: Email verified. |
| World ID / WorldAuth | + Verification signal: Unique human verified. |
| AI-assisted disclosure | Neutral: AI-assisted text disclosed. |
| AI-generated text | No reputation earned: AI-generated text over 250 characters. |
| Undisclosed AI-generated text | − Reputation: Undisclosed AI-generated text detected. |
| AI media attempt | No reputation earned: AI-generated media is not eligible. |
| Moderation violation | − Reputation: Policy violation confirmed. |
| Successful appeal | Restored: Appeal accepted and reputation impact reversed. |
| Decay | Expired: Old penalty degraded after clean history period. |

### 11.4 What users can see

| Data | Visibility |
|---|---|
| Reputation level | Visible. |
| Broad ledger entries | Visible to account owner. |
| Public badges | Visible if user/profile policy permits. |
| Approximate decay status | Visible. |
| Moderation decision outcomes | Visible to affected user. |
| Raw Hive scores | Hidden. |
| Exact reputation formula | Hidden. |
| Feed ranking multiplier | Hidden. |
| Internal abuse/risk score | Hidden. |
| Raw report count before validation | Hidden or summarised only. |

---

## 12. Decay and recovery model

Reputation should be recoverable after minor mistakes. The system should avoid permanent punishment except for severe abuse or security risk.

### 12.1 Decay principles

- Positive reputation signals may lose influence over time.
- Minor penalties should decay after clean behaviour.
- Moderate penalties should decay more slowly.
- Severe abuse may require admin review or long-lived restriction.
- Successful appeals should reverse or remove penalties.
- False positives should be cleared, not merely decayed.

### 12.2 Suggested default decay windows

| Event type | Suggested decay |
|---|---|
| Low-effort content penalty | 14–30 days. |
| Minor reaction-quality penalty | 14–30 days. |
| Undisclosed AI text penalty | 30–90 days. |
| Repeated undisclosed AI attempts | 90–180 days. |
| Confirmed harassment/abuse | 90–180 days. |
| False reporting | 30–90 days. |
| Spam network behaviour | 180+ days. |
| Coordinated manipulation | 180+ days or persistent review flag. |
| Ban evasion | Persistent or admin-reviewed. |
| Helpful reply positive signal | Influence reduces after 30–60 days. |
| Well-sourced post positive signal | Longer-lasting positive signal. |
| Editorial approval | Persistent while status remains active. |

### 12.3 Decay UX

Users should see simple decay explanations:

- "This penalty is scheduled to expire after a clean-history period."
- "This entry is under appeal."
- "This reputation impact was reversed after review."
- "This severe restriction requires review before expiry."

Avoid exposing exact decay formulas if they would enable gaming.

---

## 13. Buffs, nerfs, caps, and penalties

### 13.1 Buff examples

| Signal | Suggested effect |
|---|---|
| Email verified | Small one-time verification boost. |
| Google/Apple auth | Small account trust boost. |
| World ID / WorldAuth | Medium verification boost. |
| Human-authored 250+ character post | Reputation eligible. |
| Well-sourced post | Quality multiplier. |
| Helpful reply | Small reputation gain. |
| Thoughtful contribution recognised by trusted users | Medium gain. |
| Clean moderation history | Slow positive trust increase. |
| Successful appeal | Restores lost reputation. |
| Editorial approval | Separate status signal; not a raw reputation shortcut. |

### 13.2 Nerf examples

| Signal | Suggested effect |
|---|---|
| Undisclosed AI-generated long text | Medium penalty. |
| Repeated AI deception | Large penalty. |
| AI-generated image/video/audio attempt | No reputation; possible penalty depending on context. |
| Spam posting | Medium penalty. |
| Harassment or abuse | Large penalty. |
| False mass-reporting | Medium-large penalty. |
| Coordinated manipulation | Severe penalty. |
| Ban evasion | Severe/persistent penalty. |

### 13.3 Caps

Implement caps to prevent farming:

- Daily positive reputation cap
- Weekly positive reputation cap
- Per-content reputation cap
- Per-reaction-type contribution cap
- Repeated interaction cap between the same accounts
- New-account reputation earning limits
- Cooldown after moderation violations
- Reward redemption limits per period

### 13.4 Multipliers

Multipliers should be conservative.

Possible multipliers:

| Multiplier | Purpose |
|---|---|
| Source quality multiplier | Rewards well-sourced public-interest content. |
| Trusted voter multiplier | Gives more weight to credible users’ reactions. |
| Clean-history multiplier | Slowly improves trust after consistent good behaviour. |
| AI transparency multiplier | Rewards honest disclosure, but should not over-reward AI content. |
| Abuse-risk dampener | Reduces gains when activity looks coordinated or spam-like. |

---

## 14. Verification Strength and World ID / WorldAuth

Verification Strength is separate from reputation.

World ID / WorldAuth should be treated as a unique-human verification signal, not proof of honesty, expertise, or contribution quality.

| Verification signal | Effect |
|---|---|
| Email verification | Basic trust. |
| Google auth | Basic/moderate trust. |
| Apple auth | Basic/moderate trust. |
| World ID / WorldAuth | Strong unique-human signal. |
| Long clean account history | Trust stability. |

### 14.1 World ID / WorldAuth rules

- Optional, not mandatory.
- Should not be required for ordinary participation.
- Can unlock a visible badge if user chooses to display it.
- Should improve Verification Strength, not automatically raise reputation to high levels.
- Should help anti-sybil and reward-abuse protection.
- Should not be framed as making a user "more human."

Recommended badge wording:

> Unique human verified

Avoid:

> More human

or

> Human level boosted

---

## 15. Rewards marketplace

The rewards marketplace should generate affiliate/partner revenue while reinforcing Lythaus values.

### 15.1 Best-fit partner categories

| Category | Strategic fit |
|---|---|
| Privacy tools | Strong alignment with trust and anti-manipulation. |
| Password managers | Practical security value. |
| Learning platforms | Supports constructive self-improvement. |
| Books/audiobooks | Fits high-signal culture. |
| Newsletters/research tools | Useful for journalists, analysts, and public-interest users. |
| Productivity tools | Useful, but should not dominate. |
| Journalism/research tools | Strong fit for Editorial. |
| Ethical tech / creator tools | Good later-stage category. |

### 15.2 Partner selection rules

Partner offers should be evaluated against:

- Brand trust
- Relevance to Lythaus users
- Affiliate economics
- User privacy implications
- Geographic availability
- Subscription overlap
- Quality of offer
- Risk of looking like a coupon wall
- Alignment with human-authenticity positioning

### 15.3 Commercial rules

- Free users receive only one low-value Level 1 reward option.
- Premium users receive one option from each reward level.
- Black users receive all available reward options across Levels 1–5.
- Editorial users receive exclusive professional privileges and may receive specialist partner offers.
- Rewards should not be redeemable by suspicious new accounts until minimum account maturity rules are met.
- Affiliate fraud controls are required before public launch.

---

## 16. Data model — conceptual

This section describes required data structures conceptually. Final schema may be Cosmos DB, PostgreSQL, or hybrid depending on existing service boundaries.

### 16.1 User reputation summary

```json
{
  "userId": "uuid-v7",
  "reputationLevel": 2,
  "reputationBand": "Trusted",
  "humanContributionScore": 0.0,
  "contentQualityScore": 0.0,
  "behaviourTrustScore": 0.0,
  "interactionQualityScore": 0.0,
  "verificationStrengthScore": 0.0,
  "communityTrustScore": 0.0,
  "publicFeedEligibilityStatus": "eligible",
  "rewardEligibilityStatus": "active",
  "lastCalculatedAt": "2026-05-26T00:00:00Z",
  "version": "reputation-v1"
}
```

### 16.2 Reputation ledger entry

```json
{
  "id": "uuid-v7",
  "userId": "uuid-v7",
  "eventType": "human_authored_post",
  "eventCategory": "positive",
  "publicLabel": "+ Reputation: Human-authored post over 250 characters.",
  "internalReasonCode": "HUMAN_TEXT_250_PLUS",
  "relatedContentId": "uuid-v7",
  "relatedModerationDecisionId": null,
  "visibility": "account_owner",
  "impactBand": "small_positive",
  "appealable": false,
  "appealStatus": null,
  "createdAt": "2026-05-26T00:00:00Z",
  "decaysAt": "2026-07-26T00:00:00Z",
  "status": "active"
}
```

### 16.3 Reward eligibility record

```json
{
  "userId": "uuid-v7",
  "subscriptionTier": "premium",
  "reputationLevel": 3,
  "availableRewardLevels": [1, 2, 3, 4, 5],
  "maxOptionsPerLevel": 1,
  "redemptionStatus": "active",
  "fraudRiskStatus": "normal",
  "lastUpdatedAt": "2026-05-26T00:00:00Z"
}
```

### 16.4 Reaction event

```json
{
  "id": "uuid-v7",
  "actorUserId": "uuid-v7",
  "targetUserId": "uuid-v7",
  "targetContentId": "uuid-v7",
  "reactionType": "well_sourced",
  "weightedSignalBand": "medium_positive",
  "createdAt": "2026-05-26T00:00:00Z",
  "includedInReputation": true,
  "antiGamingStatus": "clear"
}
```

---

## 17. API and service requirements

### 17.1 New or extended modules

Recommended modules:

- `reputation/`
- `rewards/`
- `reactions/`
- `ledger/`
- `feed-ranking/`

These should integrate with existing auth, feed, post, moderation, privacy, and user profile modules.

### 17.2 Required endpoints — draft

| Endpoint | Method | Access | Purpose |
|---|---|---|---|
| `/reputation/me` | GET | Protected | Returns user reputation summary. |
| `/reputation/me/ledger` | GET | Protected | Returns user Reputation Ledger entries. |
| `/reputation/user/{id}` | GET | Public/protected depending on privacy | Returns public reputation level/badges only. |
| `/reactions` | POST | Protected | Submit a structured reaction. |
| `/reactions/{id}` | DELETE | Protected | Remove own reaction if allowed. |
| `/rewards/me` | GET | Protected | Returns available rewards based on tier and reputation. |
| `/rewards/{id}/redeem` | POST | Protected | Redeem a reward. |
| `/moderation/ledger/{entryId}/appeal` | POST | Protected | Appeal a moderation-related ledger entry. |
| `/feed/public` | GET | Public/protected | Public feed with ranking safety filters. |

### 17.3 Privacy export/delete

The Reputation Ledger must be included in user data export.

Deletion handling must respect:

- Account deletion requirements
- Moderation/audit retention requirements
- Legal/privacy obligations
- Abuse-prevention retention where necessary

The user-facing export should include broad ledger events. Internal anti-abuse scores should be excluded or transformed according to privacy/legal review.

---

## 18. UI/UX requirements

### 18.1 Profile reputation section

User profile should include:

- Reputation Level
- Verification badges, if user-visible
- Optional Editorial status
- Broad reputation explanation
- Link to Reputation Ledger for the account owner

### 18.2 Reputation Ledger screen

Ledger screen should include:

- Timeline of reputation-relevant events
- Filter by positive, neutral, negative, appeal, expired
- Explanation of what each event means
- Decay/expiry status where applicable
- Appeal button for appealable moderation entries
- Clear language that entries are read-only and cannot be manually edited

### 18.3 Rewards tab

Rewards tab should include:

- Current subscription tier
- Current reputation level
- Available rewards
- Locked reward previews
- Explanation of why a reward is locked
- Upgrade prompts for Free/Premium where appropriate
- Redemption history
- Affiliate disclosure where required

### 18.4 Public feed indicators

Public feed should avoid over-explaining ranking. It may show:

- Human-authored / AI-assisted / AI-generated / Under review labels
- Editorial badge where applicable
- Source indicators
- Reputation badge/level if product chooses to make it public

Do not show:

- Raw AI score
- Raw feed ranking score
- Internal risk score
- Exact reputation multiplier

---

## 19. Abuse and gaming risks

| Risk | Mitigation |
|---|---|
| Low-effort human content farming | Quality thresholds, caps, low-effort penalties. |
| AI-generated text lightly edited to evade detection | Hive checks, behavioural analysis, sampling, appeal process. |
| Engagement pods | Graph-distance checks, repeated-interaction caps, suspicious burst detection. |
| Downvote/dislike brigading | Cap negative reaction effect; validate with other signals. |
| False mass reporting | Reporter reliability scoring and penalties. |
| Paid users expecting privilege | Clear policy: subscription does not buy reputation. |
| Affiliate fraud | Account maturity, redemption limits, risk checks. |
| World ID over-crediting | Treat as verification only, not behavioural trust. |
| Reputation anxiety | Use levels and explanations rather than raw points. |
| Social-credit criticism | Avoid "human score" framing; keep system tied to contribution trust. |

---

## 20. MVP scope

### 20.1 MVP should include

- Reputation Level 0–5
- Reputation Ledger visible to account owner
- AI-text enforcement threshold at 250+ characters
- Human-authored / AI-assisted / AI-generated / Under review labels
- Structured reactions: Helpful, Well sourced, Thoughtful, Agree, Disagree, Misleading, Low effort, Report
- Basic reaction weighting and caps
- Hive moderation integration into reputation events
- Reward access model by tier
- Public feed trust weighting by reputation level
- Basic decay model for minor/moderate events
- Appeal reversal support for reputation-impacting moderation decisions

### 20.2 MVP should not include yet

- Public raw reputation scores
- Public raw AI confidence scores
- Complex marketplace automation
- Automatic large partner API integrations
- Reputation trading or gifting
- Paid reputation boosts
- Mandatory World ID
- Editorial unilateral approval authority

---

## 21. Implementation phases

### Phase 1 — Foundation

- Define reputation event taxonomy.
- Add ledger storage.
- Add `GET /reputation/me`.
- Add `GET /reputation/me/ledger`.
- Connect post moderation outcomes to ledger entries.
- Implement 250+ character AI text enforcement policy.
- Add basic profile UI for reputation level.

### Phase 2 — Reactions and public feed

- Add structured reactions.
- Add reaction weighting/caps.
- Add public feed trust weighting.
- Add anti-brigading checks.
- Add ledger entries for reaction-derived reputation changes.

### Phase 3 — Rewards

- Add rewards catalogue.
- Add tier-based reward access rules.
- Add locked reward previews.
- Add redemption flow.
- Add fraud/risk checks.
- Add affiliate disclosure and tracking controls.

### Phase 4 — Editorial and World ID / WorldAuth

- Add optional World ID / WorldAuth verification signal.
- Add optional visible unique-human badge.
- Add Editorial privilege layer.
- Add Editorial-specific rewards and tools.
- Add peer review signals for Editorial applicants.

### Phase 5 — Calibration and governance

- Tune weights and caps.
- Review false positives/false negatives.
- Publish transparency summaries.
- Add admin dashboards.
- Add periodic reputation model audits.

---

## 22. Acceptance criteria

### 22.1 Product acceptance

- Users can see their Reputation Level.
- Users can see a read-only Reputation Ledger.
- Users can understand broad reasons for reputation changes.
- Users cannot edit or delete reputation entries.
- Entries decay, reverse on successful appeal, or persist according to policy.
- Paid tiers unlock rewards but do not increase reputation directly.
- Black users can access all rewards across Levels 1–5.
- Premium users can access one reward option from each level.
- Free users can access only one Level 1 option.
- Guest users receive no rewards.

### 22.2 AI policy acceptance

- AI-text reputation enforcement begins at 250+ characters.
- Human-authored 250+ character text is full reputation eligible.
- Disclosed AI-assisted 250+ character text is reduced or neutral reputation.
- Disclosed AI-generated 250+ character text earns zero reputation.
- Undisclosed AI-generated 250+ character text is blocked, flagged, or penalised.
- AI-generated image/video/audio receives no reputation and is blocked or flagged according to policy.
- Raw AI scores are not shown publicly.

### 22.3 Moderation acceptance

- Hive moderation outcomes can create ledger entries.
- Validated reports can affect reputation.
- Raw reports alone do not directly penalise reputation.
- Successful appeals reverse or clear penalties.
- False positives are cleared, not merely decayed.
- Moderation outcomes are auditable.

### 22.4 Feed acceptance

- Higher reputation improves public feed featuring chance.
- Paid tier does not directly boost public feed reach.
- Low reputation does not automatically suppress content if safe and high-quality.
- Dislikes alone cannot bury controversial but well-sourced content.
- Diversity controls prevent high-reputation users from monopolising public surfaces.

### 22.5 Rewards acceptance

- Rewards access follows tier rules.
- Reward redemption is blocked or limited for suspicious accounts.
- Rewards tab displays locked and unlocked states clearly.
- Affiliate disclosure is visible where required.
- Reward access is connected to tier and reputation eligibility, not raw engagement volume.

---

## 23. Open calibration decisions

These should be decided during implementation/testing:

1. Exact threshold for each Reputation Level.
2. Exact numeric weights per reputation pillar.
3. Whether disclosed AI-assisted 250+ character text earns reduced reputation or neutral reputation.
4. Whether any AI-generated text is allowed publicly when disclosed, or allowed only in limited contexts.
5. Which reaction types are available at MVP launch.
6. Whether reputation level is public by default or user-controlled.
7. Which ledger entries are public, private, or account-owner-only.
8. Minimum account age before reward redemption.
9. Whether World ID / WorldAuth badge is visible by default or opt-in.
10. Editorial privilege boundaries for News Board contribution.

---

## 24. Final policy summary

1. Reputation measures contribution trust, not payment status.
2. Rewards are unlocked by subscription tier and reputation eligibility.
3. Guest users receive no rewards.
4. Free users receive one low-value Level 1 reward option.
5. Premium users receive one reward option from each level, Levels 1–5.
6. Black users receive all reward options across Levels 1–5.
7. Editorial users receive exclusive merit-based privileges.
8. AI-text reputation enforcement begins at 250+ characters.
9. AI-generated long text earns zero reputation.
10. Undisclosed AI-generated long text is blocked, flagged, or penalised.
11. AI-generated images, video, and audio are blocked, flagged, or receive no reputation.
12. Likes, dislikes, emojis, structured reactions, reports, Hive moderation, and user behaviour all contribute to reputation, with anti-gaming controls.
13. Higher reputation improves public feed featuring chances but does not guarantee reach.
14. Reputation-related events must be stored in a read-only Reputation Ledger on the user profile.
15. Ledger entries remain until they decay, are reversed by appeal, or are corrected by authorised review.
16. Raw AI scores, internal risk scores, exact ranking multipliers, and exact anti-abuse formulas remain internal.

---

## 25. Implementation note

This specification should be implemented behind feature flags and calibrated with staging data before broad release. Reputation, rewards, and public feed ranking are high-trust systems; small scoring errors can create visible unfairness, user frustration, or gaming incentives.

Default posture:

> Be transparent about the reason for reputation changes.  
> Be conservative with penalties.  
> Be strict with manipulation.  
> Never sell credibility.  
> Never make AI detection feel like a public shaming system.
