# Quiet Trust Feed Microcopy Pack

## Guardrails

- No numeric score/confidence language.
- No definitive classifier wording such as “we detected” or “our system determined.”
- Use policy-likelihood framing: “appears to conflict with policy.”
- No hard SLA promises; prefer backend-driven “typical review time.”

## Discover and Guest Copy

### Guest Banner

- Default: `You’re browsing as a guest. Sign in to interact.`
- CTA primary: `Sign in`
- CTA secondary: `Continue browsing`

### Auth Gate Prompt

- Title: `Sign in to continue`
- Body: `That action needs an account. Your place in the feed will be kept.`
- CTA primary: `Sign in`
- CTA secondary: `Not now`

## Trust Strip and Receipt Drawer

### Trust Strip Labels

- `Created`
- `Media checked`
- `Moderation`
- `Appeal`

### Status Chip Labels

- `Verified signals attached`
- `No extra signals`
- `Under appeal`
- `Actioned`

### Receipt Drawer Header

- Title: `Receipt timeline`
- Subtitle: `A plain-language record of what happened.`
- Empty: `No receipt details available yet.`
- Unavailable: `Receipt unavailable right now.`
- Retry CTA: `Try again`

### Receipt Event Body Pattern

- What happened label: `What happened`
- Why label: `Why`
- CTA label `APPEAL`: `Appeal`
- CTA label `LEARN_MORE`: `Learn more`
- Event ID label: `Event ID`
- Copy action label: `Copy ID`
- Copy success: `Event ID copied`

## Proof Tiles (Challenge Mode)

### Section Copy

- Title: `Challenge Mode (optional)`
- Body: `Optional context signals. No penalty if not provided.`

### Tile Labels

- `Capture metadata hash`
- `Edit history hash`
- `Source attestation`

### Tile States

- `Provided`
- `Not provided`
- `View details`
- `Copy hash`

## Actioned Content and Appeals

### Actioned Explanation

- Title: `Post limited`
- Body: `This post appears to conflict with policy and was limited while reviewed.`
- Learn more CTA: `Read policy`

### Appeal Submission

- Title: `Submit appeal`
- Body: `Share context for a review.`
- Submit CTA: `Submit appeal`
- Success: `Appeal submitted. We’ll notify you when there’s an update.`
- Error: `Couldn’t submit appeal. Please try again.`

### Appeal Pending/Resolved

- Pending label: `Under review`
- Pending body: `Typical review time: {reviewTimeLabel}`
- Pending fallback: `We’ll notify you as soon as there’s an update.`
- Approved: `Appeal approved`
- Rejected: `Appeal not approved`
- Overridden: `Appeal outcome updated by moderator review`

## Trust Passport Visibility

### Setting Labels

- `Public (expanded)`
- `Public (minimal)`
- `Private`

### Setting Helper Text

- Expanded: `Show full trust passport sections on your public profile.`
- Minimal: `Show a simplified trust passport on your public profile.`
- Private: `Only you can view your full trust passport.`

## Error and Retry Variants

- Generic network error: `Something went wrong. Please try again.`
- Generic retry CTA: `Retry`
- Generic auth expiration: `Session expired. Sign in again to continue.`
