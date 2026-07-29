const CLASSIFICATIONS = Object.freeze({
  MIGRATE: 'MIGRATE',
  EVIDENCE: 'PRESERVE AS EVIDENCE',
  DISCARD: 'DISCARD TEST/DERIVED',
  BLOCKED: 'BLOCKED — ACCESS REQUIRED',
});

const OPERATIONAL_MARKERS = new Set([
  'acceptance',
  'benchmark',
  'canary',
  'demo',
  'drill',
  'dummy',
  'e2e',
  'fixture',
  'loadtest',
  'playwright',
  'seed',
  'smoke',
  'synthetic',
  'test',
]);

const normalizedTokens = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/load[\s_-]*test/g, 'loadtest')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

const recordText = (record) => Object.values(record)
  .filter((value) => typeof value === 'string')
  .join(' ');

const hasOperationalMarker = (record, fields) => {
  const text = fields
    ? fields.map((field) => record[field]).filter((value) => typeof value === 'string').join(' ')
    : recordText(record);
  return normalizedTokens(text).some((token) => OPERATIONAL_MARKERS.has(token));
};

const isExplicitTestUser = (record) => record.isTest === true
  || Boolean(record.testSessionId)
  || hasOperationalMarker(record, ['email', 'displayName']);

const classifyUser = (record) => isExplicitTestUser(record)
  ? { classification: CLASSIFICATIONS.DISCARD, reason: 'explicit test identity marker' }
  : { classification: CLASSIFICATIONS.MIGRATE, reason: 'possible real account; preserve as relink_required without provider mapping' };

const classifyPost = (record) => {
  if (record.isTestPost === true || record.testSessionId || hasOperationalMarker(record, ['content'])) {
    return { classification: CLASSIFICATIONS.DISCARD, reason: 'synthetic content marker or test session' };
  }
  return { classification: CLASSIFICATIONS.BLOCKED, reason: 'content authority cannot be proven from record alone' };
};

const classifyPrivacyRequest = (record, { hasMigratedActiveHold = false } = {}) => {
  if (hasOperationalMarker(record, ['note', 'requestedBy', 'failureReason'])) {
    return { classification: CLASSIFICATIONS.DISCARD, reason: 'privacy drill or operational test marker' };
  }
  if (hasMigratedActiveHold) {
    return { classification: CLASSIFICATIONS.MIGRATE, reason: 'request is linked to an unresolved active legal hold' };
  }
  if (record.status === 'awaiting_review') {
    return { classification: CLASSIFICATIONS.MIGRATE, reason: 'unresolved privacy export review' };
  }
  if (record.type === 'delete' && record.status === 'succeeded') {
    return { classification: CLASSIFICATIONS.MIGRATE, reason: 'completed deletion requires a canonical tombstone' };
  }
  return { classification: CLASSIFICATIONS.EVIDENCE, reason: 'terminal or canceled request with no active obligation' };
};

const classifyLegalHold = (record) => {
  if (hasOperationalMarker(record, ['reason'])) {
    return { classification: CLASSIFICATIONS.DISCARD, reason: 'legal-hold drill marker' };
  }
  if (record.active === true) {
    return { classification: CLASSIFICATIONS.MIGRATE, reason: 'active hold lacks proven test provenance' };
  }
  return { classification: CLASSIFICATIONS.EVIDENCE, reason: 'released hold retained as evidence' };
};

const classifyRecord = (container, record, context = {}) => {
  if (container === 'users') return classifyUser(record);
  if (container === 'posts') return classifyPost(record);
  if (container === 'privacy_requests') return classifyPrivacyRequest(record, context);
  if (container === 'legal_holds') return classifyLegalHold(record);
  if (container === 'profiles') {
    return context.explicitTestUserIds?.has(record.userId)
      ? { classification: CLASSIFICATIONS.DISCARD, reason: 'profile belongs to an explicit test identity' }
      : { classification: CLASSIFICATIONS.MIGRATE, reason: 'profile has unresolved account-continuity and privacy relationships' };
  }
  if (container === 'custom_feeds') {
    return record.testSessionId || hasOperationalMarker(record)
      ? { classification: CLASSIFICATIONS.DISCARD, reason: 'synthetic custom feed' }
      : { classification: CLASSIFICATIONS.BLOCKED, reason: 'custom-feed owner authority is unresolved' };
  }
  if (container === 'counters') {
    return { classification: CLASSIFICATIONS.DISCARD, reason: 'derived runtime counter' };
  }
  if (container === 'moderation_decisions') {
    return context.testPostIds?.has(record.itemId)
      ? { classification: CLASSIFICATIONS.DISCARD, reason: 'decision belongs to synthetic content' }
      : { classification: CLASSIFICATIONS.BLOCKED, reason: 'moderation subject authority is unresolved' };
  }
  if (container === 'receipt_events') {
    return context.testPostIds?.has(record.postId)
      ? { classification: CLASSIFICATIONS.DISCARD, reason: 'receipt belongs to synthetic content' }
      : { classification: CLASSIFICATIONS.BLOCKED, reason: 'receipt subject authority is unresolved' };
  }
  if (container === 'audit_logs' || container === 'privacy_audit') {
    return { classification: CLASSIFICATIONS.EVIDENCE, reason: 'operational or privacy audit evidence is not application state' };
  }
  return { classification: CLASSIFICATIONS.BLOCKED, reason: 'no approved canonical record mapping' };
};

export {
  CLASSIFICATIONS,
  classifyLegalHold,
  classifyPost,
  classifyPrivacyRequest,
  classifyRecord,
  classifyUser,
  hasOperationalMarker,
  isExplicitTestUser,
};
