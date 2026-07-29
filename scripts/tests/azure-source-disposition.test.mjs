import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLASSIFICATIONS,
  classifyLegalHold,
  classifyPost,
  classifyPrivacyRequest,
  classifyRecord,
  classifyUser,
} from '../azure-exit/source-disposition.mjs';

test('explicit test users and posts are discarded', () => {
  assert.equal(classifyUser({ isTest: true }).classification, CLASSIFICATIONS.DISCARD);
  assert.equal(classifyUser({ testSessionId: 'session' }).classification, CLASSIFICATIONS.DISCARD);
  assert.equal(classifyPost({ content: 'acceptance drill post' }).classification, CLASSIFICATIONS.DISCARD);
});

test('possible real users require a verified relink', () => {
  const result = classifyUser({ id: '01900000-0000-7000-8000-000000000001' });
  assert.equal(result.classification, CLASSIFICATIONS.MIGRATE);
  assert.match(result.reason, /relink_required/);
});

test('privacy drills are discarded while obligations migrate', () => {
  assert.equal(
    classifyPrivacyRequest({ note: 'DSR drill', status: 'awaiting_review' }).classification,
    CLASSIFICATIONS.DISCARD,
  );
  assert.equal(
    classifyPrivacyRequest({ status: 'awaiting_review', type: 'export' }).classification,
    CLASSIFICATIONS.MIGRATE,
  );
  assert.equal(
    classifyPrivacyRequest({ status: 'canceled', type: 'delete' }, { hasMigratedActiveHold: true }).classification,
    CLASSIFICATIONS.MIGRATE,
  );
  assert.equal(
    classifyPrivacyRequest({ status: 'succeeded', type: 'delete' }).classification,
    CLASSIFICATIONS.MIGRATE,
  );
});

test('only active non-drill legal holds migrate', () => {
  assert.equal(classifyLegalHold({ active: true, reason: 'legal drill hold' }).classification, CLASSIFICATIONS.DISCARD);
  assert.equal(classifyLegalHold({ active: true, reason: 'hold pending disposition' }).classification, CLASSIFICATIONS.MIGRATE);
  assert.equal(classifyLegalHold({ active: false }).classification, CLASSIFICATIONS.EVIDENCE);
});

test('unknown non-empty sources remain blocked', () => {
  assert.equal(classifyRecord('unknown', { id: 'record' }).classification, CLASSIFICATIONS.BLOCKED);
});
