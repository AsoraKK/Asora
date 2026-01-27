import { useEffect, useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime } from '../utils/formatters.js';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';
import LythInput from '../components/LythInput.jsx';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overridden', label: 'Overridden' },
  { value: 'all', label: 'All' }
];

const OVERRIDE_REASON_OPTIONS = [
  { value: 'policy_exception', label: 'Policy exception' },
  { value: 'false_positive', label: 'False positive' },
  { value: 'safety_risk', label: 'Safety risk' },
  { value: 'other', label: 'Other' }
];

function formatTimeRemaining(seconds) {
  if (seconds === null || seconds === undefined) {
    return '-';
  }
  if (seconds <= 0) {
    return '0m';
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function normalizeStatusValue(value) {
  const normalized = String(value || '').toLowerCase();
  if (['pending', 'approved', 'rejected', 'overridden'].includes(normalized)) {
    return normalized;
  }
  return 'pending';
}

function formatStatusLabel(value) {
  const normalized = normalizeStatusValue(value);
  switch (normalized) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'overridden':
      return 'Overridden';
    default:
      return 'Pending';
  }
}

function buildIdempotencyKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `override-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Appeals() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending');
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState('allow');
  const [overrideReasonCode, setOverrideReasonCode] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState('');
  const [overrideKey, setOverrideKey] = useState('');

  const loadAppeals = async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminRequest('_admin/appeals', {
        query: { status, limit: 25, cursor: reset ? undefined : cursor }
      });
      const nextItems = reset ? response?.items || [] : [...items, ...(response?.items || [])];
      setItems(nextItems);
      setCursor(response?.nextCursor || null);
      if (reset) {
        setSelected(null);
        setDetail(null);
        setDetailError('');
      }
    } catch (err) {
      setError(err.message || 'Failed to load appeals.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailError('');
    try {
      const response = await adminRequest(`_admin/appeals/${item.appealId}`);
      setDetail(response);
    } catch (err) {
      setDetailError(err.message || 'Failed to load appeal details.');
    }
  };

  const openOverride = () => {
    setOverrideDecision('allow');
    setOverrideReasonCode('other');
    setOverrideNote('');
    setOverrideMessage('');
    setOverrideKey(buildIdempotencyKey());
    setOverrideOpen(true);
  };

  const closeOverride = () => {
    if (overrideBusy) {
      return;
    }
    setOverrideOpen(false);
  };

  const runOverride = async () => {
    if (!selected) {
      return;
    }
    const trimmedReason = overrideReasonCode.trim();
    if (!trimmedReason) {
      setOverrideMessage('Reason is required.');
      return;
    }
    if (!overrideDecision) {
      setOverrideMessage('Decision is required.');
      return;
    }
    setOverrideBusy(true);
    setOverrideMessage('');
    try {
      await adminRequest(`_admin/appeals/${selected.appealId}/override`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': overrideKey
        },
        body: {
          decision: overrideDecision,
          reasonCode: trimmedReason,
          reasonNote: overrideNote.trim() || undefined
        }
      });
      setOverrideOpen(false);
      setOverrideReasonCode('');
      setOverrideNote('');
      setOverrideKey('');
      await loadAppeals(true);
    } catch (err) {
      setOverrideMessage(err.message || 'Override failed.');
    } finally {
      setOverrideBusy(false);
    }
  };

  const statusValue = detail ? normalizeStatusValue(detail.status || detail.appeal?.status) : '';
  const voteStats = detail?.votes || {
    for: detail?.appeal?.votesFor ?? 0,
    against: detail?.appeal?.votesAgainst ?? 0,
    total: detail?.appeal?.totalVotes ?? 0
  };
  const quorum = detail?.quorum || {
    required: detail?.appeal?.requiredVotes ?? 0,
    reached: detail?.appeal?.hasReachedQuorum ?? false
  };
  const auditSummary = detail?.auditSummary || null;
  const auditReason = auditSummary
    ? [auditSummary.lastReasonCode, auditSummary.lastReasonNote].filter(Boolean).join(' — ')
    : '';
  const overrideAllowed = detail?.moderatorOverrideAllowed ?? false;
  const finalDecisionLabel =
    detail?.finalDecision === 'allow' ? 'Allow' : detail?.finalDecision === 'block' ? 'Block' : '-';

  useEffect(() => {
    loadAppeals(true);
  }, [status]);

  return (
    <section className="page">
      <div className="page-header">
        <h1>Appeals</h1>
        <p className="page-subtitle">
          Appeals are the only review path for blocked content.
        </p>
      </div>
      <div className="page-grid">
        <LythCard variant="panel">
          <div className="panel-header">
            <h2>Queue</h2>
            <div className="panel-actions">
              <LythInput
                as="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </LythInput>
              <LythButton
                variant="ghost"
                type="button"
                onClick={() => loadAppeals(true)}
                disabled={loading}
              >
                Refresh
              </LythButton>
            </div>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="data-table">
            <div className="data-row header">
              <span>Appeal</span>
              <span>Content</span>
              <span>Author</span>
              <span>Status</span>
              <span>Reason</span>
              <span>Votes</span>
              <span>Time left</span>
              <span>Actions</span>
            </div>
            {items.map((item) => (
              <div key={item.appealId} className="data-row">
                <span>
                  <strong>{item.appealId}</strong>
                  <span className="muted">{formatDateTime(item.submittedAt)}</span>
                </span>
                <span>
                  {item.contentId}
                </span>
                <span>{item.authorId || 'Unknown'}</span>
                <span>
                  <span className={`status-pill ${normalizeStatusValue(item.status)}`}>
                    {formatStatusLabel(item.status)}
                  </span>
                </span>
                <span>{item.originalReasonCategory || '-'}</span>
                <span>
                  <strong>{item.votesFor ?? 0}/{item.votesAgainst ?? 0}</strong>
                  <span className="muted">{item.totalVotes ?? 0} total</span>
                </span>
                <span>
                  <strong>{formatTimeRemaining(item.timeRemainingSeconds)}</strong>
                  <span className="muted">{formatDateTime(item.expiresAt)}</span>
                </span>
                <span>
                  <LythButton
                    variant="ghost"
                    type="button"
                    onClick={() => loadDetail(item)}
                  >
                    Open
                  </LythButton>
                </span>
              </div>
            ))}
          </div>
          {!items.length && !loading ? (
            <div className="empty-state">No appeals found.</div>
          ) : null}
          {cursor ? (
            <div className="panel-actions">
              <LythButton
                variant="secondary"
                type="button"
                onClick={() => loadAppeals(false)}
                disabled={loading}
              >
                Load more
              </LythButton>
            </div>
          ) : null}
        </LythCard>
        <LythCard variant="panel">
          <div className="panel-header">
            <h2>Detail</h2>
          </div>
          {!selected ? (
            <div className="empty-state">Select an appeal to review.</div>
          ) : (
            <>
              {detailError ? <div className="notice error">{detailError}</div> : null}
              {detail ? (
                <>
                  <div className="detail-grid">
                    <div>
                      <h3>Appeal</h3>
                      <div className="detail-list">
                        <div>
                          <span className="detail-label">Appeal id</span>
                          <span>{detail.appeal.appealId}</span>
                        </div>
                        <div>
                          <span className="detail-label">Submitted</span>
                          <span>{formatDateTime(detail.appeal.submittedAt)}</span>
                        </div>
                        <div>
                          <span className="detail-label">Status</span>
                          <span className={`status-pill ${statusValue}`}>
                            {formatStatusLabel(statusValue)}
                          </span>
                        </div>
                        <div>
                          <span className="detail-label">Final decision</span>
                          <span>{finalDecisionLabel}</span>
                        </div>
                        <div>
                          <span className="detail-label">Appeal type</span>
                          <span>{detail.appeal.appealType || '-'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Time remaining</span>
                          <span>{formatTimeRemaining(detail.appeal.timeRemainingSeconds)}</span>
                        </div>
                        <div>
                          <span className="detail-label">Expires</span>
                          <span>{formatDateTime(detail.appeal.expiresAt)}</span>
                        </div>
                      </div>
                      <div className="preview-card">
                        {detail.appeal.userStatement || 'No user statement provided.'}
                      </div>
                      {detail.appeal.evidenceUrls?.length ? (
                        <div className="pill-list">
                          {detail.appeal.evidenceUrls.map((url) => (
                            <span key={url} className="tag">
                              {url}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <h3>Content</h3>
                      <div className="detail-list">
                        <div>
                          <span className="detail-label">Content id</span>
                          <span>{detail.content.contentId}</span>
                        </div>
                        <div>
                          <span className="detail-label">Type</span>
                          <span>{detail.content.type}</span>
                        </div>
                        <div>
                          <span className="detail-label">Created</span>
                          <span>{formatDateTime(detail.content.createdAt)}</span>
                        </div>
                      </div>
                      <div className="preview-card">
                        {detail.content.preview || 'No preview available.'}
                      </div>
                      <div className="detail-note">
                        Moderation actions are recorded in the audit trail.
                      </div>
                    </div>
                  </div>
                  <div className="detail-grid detail-grid--secondary">
                    <div className="detail-panel">
                      <h3>Vote tally</h3>
                      <div className="tally-grid">
                        <div>
                          <span className="detail-label">👍 For</span>
                          <strong>{voteStats.for}</strong>
                        </div>
                        <div>
                          <span className="detail-label">👎 Against</span>
                          <strong>{voteStats.against}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Total votes</span>
                          <strong>{voteStats.total}</strong>
                        </div>
                      </div>
                      <div className={`quorum-badge ${quorum.reached ? 'reached' : 'pending'}`}>
                        {quorum.reached ? 'Quorum reached' : 'Awaiting votes'}
                      </div>
                      <div className="muted">Required: {quorum.required}</div>
                    </div>
                    <div className="detail-panel">
                      <h3>Audit</h3>
                      {auditSummary ? (
                        <div className="detail-list">
                          <div>
                            <span className="detail-label">Last actor role</span>
                            <span>{auditSummary.lastActorRole}</span>
                          </div>
                          <div>
                            <span className="detail-label">Actor id</span>
                            <span>{auditSummary.lastActorId || '-'}</span>
                          </div>
                          <div>
                            <span className="detail-label">Last action</span>
                            <span>{auditSummary.lastAction}</span>
                          </div>
                          <div>
                            <span className="detail-label">Reason</span>
                            <span>{auditReason || '-'}</span>
                          </div>
                          <div>
                            <span className="detail-label">Last action at</span>
                            <span>{formatDateTime(auditSummary.lastActionAt)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-state">No audit activity yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">Loading details...</div>
              )}
              <div className="divider" />
              <div className="override-header">
                <h3>Moderator override</h3>
                {statusValue ? (
                  <span className={`status-pill ${statusValue}`}>
                    {formatStatusLabel(statusValue)}
                  </span>
                ) : null}
              </div>
              {statusValue === 'overridden' ? (
                <div className="notice">Appeal already overridden.</div>
              ) : null}
              <div className="panel-actions">
                <LythButton
                  type="button"
                  variant="secondary"
                  onClick={openOverride}
                  disabled={!overrideAllowed || overrideBusy}
                >
                  Moderator Override
                </LythButton>
                {!overrideAllowed ? (
                  <p className="panel-hint">Override enabled when pending or quorum reached.</p>
                ) : null}
              </div>
              {overrideOpen ? (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                  <div className="modal">
                    <div className="modal-header">
                      <h3>Moderator Override</h3>
                    </div>
                    <div className="modal-body">
                      <div className="tally-summary">
                        <div>
                          <span className="detail-label">👍 For</span>
                          <strong>{voteStats.for}</strong>
                        </div>
                        <div>
                          <span className="detail-label">👎 Against</span>
                          <strong>{voteStats.against}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Total votes</span>
                          <strong>{voteStats.total}</strong>
                        </div>
                      </div>
                      {overrideMessage ? <div className="notice error">{overrideMessage}</div> : null}
                      <div className="form-grid">
                        <div className="field">
                          <span className="field-label">Decision</span>
                          <div className="radio-group">
                            <label className="radio-option">
                              <input
                                type="radio"
                                name="overrideDecision"
                                value="allow"
                                checked={overrideDecision === 'allow'}
                                onChange={() => setOverrideDecision('allow')}
                              />
                              <span>Allow</span>
                            </label>
                            <label className="radio-option">
                              <input
                                type="radio"
                                name="overrideDecision"
                                value="block"
                                checked={overrideDecision === 'block'}
                                onChange={() => setOverrideDecision('block')}
                              />
                              <span>Block</span>
                            </label>
                          </div>
                        </div>
                        <label className="field">
                          <span className="field-label">Reason</span>
                          <LythInput
                            as="select"
                            value={overrideReasonCode}
                            onChange={(event) => setOverrideReasonCode(event.target.value)}
                          >
                            <option value="">Select a reason</option>
                            {OVERRIDE_REASON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </LythInput>
                        </label>
                        <label className="field">
                          <span className="field-label">Optional note</span>
                          <LythInput
                            as="textarea"
                            rows={3}
                            maxLength={500}
                            value={overrideNote}
                            onChange={(event) => setOverrideNote(event.target.value)}
                            placeholder="Optional context"
                          />
                        </label>
                      </div>
                      <div className="notice warning">This action is logged and irreversible.</div>
                    </div>
                    <div className="modal-actions">
                      <LythButton
                        type="button"
                        variant="secondary"
                        onClick={closeOverride}
                        disabled={overrideBusy}
                      >
                        Cancel
                      </LythButton>
                      <LythButton
                        type="button"
                        onClick={runOverride}
                        disabled={overrideBusy || !overrideReasonCode}
                      >
                        Confirm Override
                      </LythButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </LythCard>
      </div>
    </section>
  );
}

export default Appeals;
