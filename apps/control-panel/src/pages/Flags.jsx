import { useEffect, useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime, formatList } from '../utils/formatters.js';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' }
];

function Flags() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('open');
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const historyEntries = [];
  if (detail?.history?.flags?.length) {
    detail.history.flags.forEach((entry, index) => {
      historyEntries.push({
        id: `flag-${entry.at}-${index}`,
        at: entry.at,
        label: `Flagged: ${entry.reason || 'unknown'}`
      });
    });
  }
  if (detail?.history?.adminActions?.length) {
    detail.history.adminActions.forEach((entry, index) => {
      historyEntries.push({
        id: `admin-${entry.at}-${index}`,
        at: entry.at,
        label: `${entry.action}${entry.reasonCode ? ` (${entry.reasonCode})` : ''}`
      });
    });
  }
  if (detail?.history?.appeal) {
    historyEntries.push({
      id: `appeal-${detail.history.appeal.at}`,
      at: detail.history.appeal.at,
      label: `Appeal ${detail.history.appeal.status}`
    });
  }
  historyEntries.sort((a, b) => new Date(b.at) - new Date(a.at));

  const loadFlags = async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminRequest('_admin/flags', {
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
      setError(err.message || 'Failed to load flags.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailError('');
    const flagId = item?.flags?.flagId;
    if (!flagId) {
      setDetailError('No flag id available for this item.');
      return;
    }
    try {
      const response = await adminRequest(`_admin/flags/${flagId}`);
      setDetail(response);
    } catch (err) {
      setDetailError(err.message || 'Failed to load flag details.');
    }
  };

  const runContentAction = async (action) => {
    if (!selected) {
      return;
    }
    const trimmedReason = reasonCode.trim();
    if (!trimmedReason) {
      setActionMessage('Reason code is required.');
      return;
    }
    setActionBusy(true);
    setActionMessage('');
    try {
      await adminRequest(`_admin/content/${selected.content.contentId}/${action}`, {
        method: 'POST',
        body: {
          contentType: selected.content.type,
          reasonCode: trimmedReason,
          note: note.trim() || undefined
        }
      });
      setReasonCode('');
      setNote('');
      await loadFlags(true);
    } catch (err) {
      setActionMessage(err.message || 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const runResolve = async () => {
    if (!selected) {
      return;
    }
    const trimmedReason = reasonCode.trim();
    if (!trimmedReason) {
      setActionMessage('Reason code is required.');
      return;
    }
    const flagId = selected?.flags?.flagId;
    if (!flagId) {
      setActionMessage('No flag id available to resolve.');
      return;
    }
    setActionBusy(true);
    setActionMessage('');
    try {
      await adminRequest(`_admin/flags/${flagId}/resolve`, {
        method: 'POST',
        body: {
          reasonCode: trimmedReason,
          note: note.trim() || undefined
        }
      });
      setReasonCode('');
      setNote('');
      await loadFlags(true);
    } catch (err) {
      setActionMessage(err.message || 'Resolve failed.');
    } finally {
      setActionBusy(false);
    }
  };

  useEffect(() => {
    loadFlags(true);
  }, [status]);

  return (
    <section className="page">
      <div className="page-header">
        <h1>Flagged content</h1>
        <p className="page-subtitle">
          Review flags and apply a binary publish or block decision.
        </p>
      </div>
      <div className="page-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Queue</h2>
            <div className="panel-actions">
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                className="ghost-button"
                type="button"
                onClick={() => loadFlags(true)}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="data-table">
            <div className="data-row header">
              <span>Content</span>
              <span>Author</span>
              <span>Flags</span>
              <span>Moderation</span>
              <span>State</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {items.map((item) => (
              <div key={item.content.contentId} className="data-row">
                <span>
                  <strong>{item.content.type}</strong>
                  <span className="muted">{item.content.contentId}</span>
                  <span className="muted">
                    {formatDateTime(item.content.createdAt)}
                  </span>
                </span>
                <span>
                  {item.author.displayName || 'Unknown'}
                  <span className="muted">{item.author.authorId}</span>
                </span>
                <span>
                  <strong>{item.flags.flagCount}</strong>
                  <span className="muted">
                    {formatList(item.flags.reasonCategories)}
                  </span>
                  <span className="muted">
                    {formatDateTime(item.flags.lastFlaggedAt)}
                  </span>
                </span>
                <span>
                  <span className="muted">
                    {formatDateTime(item.moderation.lastDecisionAt)}
                  </span>
                  <span className="muted">
                    Config {item.moderation.configVersionUsed ?? '-'}
                  </span>
                </span>
                <span>
                  <span className={`status-pill ${String(item.state).toLowerCase()}`}>
                    {item.state}
                  </span>
                </span>
                <span>
                  <span className={`status-pill ${String(item.status).toLowerCase()}`}>
                    {item.status}
                  </span>
                </span>
                <span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => loadDetail(item)}
                  >
                    Open
                  </button>
                </span>
              </div>
            ))}
          </div>
          {!items.length && !loading ? (
            <div className="empty-state">No flagged content found.</div>
          ) : null}
          {cursor ? (
            <div className="panel-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => loadFlags(false)}
                disabled={loading}
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>Detail</h2>
          </div>
          {!selected ? (
            <div className="empty-state">
              Select a queue item to see details and take action.
            </div>
          ) : (
            <>
              {detailError ? <div className="notice error">{detailError}</div> : null}
              {detail ? (
                <>
                  <div className="detail-grid">
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
                      <div>
                        <span className="detail-label">State</span>
                        <span className={`status-pill ${String(detail.content.state).toLowerCase()}`}>
                          {detail.content.state}
                        </span>
                      </div>
                    </div>
                    <div className="preview-card">
                      {detail.content.preview || 'No preview available.'}
                    </div>
                  </div>
                  <div>
                    <h3>Flags</h3>
                    <div className="detail-list">
                      <div>
                        <span className="detail-label">Flag count</span>
                        <span>{detail.flags.flagCount}</span>
                      </div>
                      <div>
                        <span className="detail-label">Reporters</span>
                        <span>{detail.flags.reporterCount}</span>
                      </div>
                      <div>
                        <span className="detail-label">Status</span>
                        <span className={`status-pill ${String(detail.flags.status).toLowerCase()}`}>
                          {detail.flags.status}
                        </span>
                      </div>
                      <div>
                        <span className="detail-label">Last decision</span>
                        <span>{formatDateTime(detail.moderation.lastDecisionAt)}</span>
                      </div>
                      <div>
                        <span className="detail-label">Config version</span>
                        <span>{detail.moderation.configVersionUsed ?? '-'}</span>
                      </div>
                    </div>
                    <div className="pill-list">
                      {detail.flags.reasons.map((reason, index) => (
                        <span key={`${reason.reason}-${index}`} className="tag">
                          {reason.reason}
                        </span>
                      ))}
                    </div>
                    {detail.appeal ? (
                      <div className="detail-note">
                        Appeal: {detail.appeal.status}
                      </div>
                    ) : null}
                  </div>
                </div>
                  <div className="divider" />
                  <h3>History</h3>
                  {historyEntries.length ? (
                    <div className="timeline">
                      {historyEntries.map((entry) => (
                        <div key={entry.id} className="timeline-item">
                          <span className="muted">{formatDateTime(entry.at)}</span>
                          <span>{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No history entries yet.</div>
                  )}
                </>
              ) : (
                <div className="empty-state">Loading details...</div>
              )}
              <div className="divider" />
              <h3>Decision</h3>
              {actionMessage ? <div className="notice error">{actionMessage}</div> : null}
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Reason code</span>
                  <input
                    className="input"
                    type="text"
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                    placeholder="POLICY_123"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Internal note</span>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional internal context"
                  />
                </label>
              </div>
              <div className="panel-actions">
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => runContentAction('block')}
                  disabled={actionBusy}
                >
                  Block content
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => runContentAction('publish')}
                  disabled={actionBusy}
                >
                  Publish content
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={runResolve}
                  disabled={actionBusy}
                >
                  Resolve flag
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Flags;
