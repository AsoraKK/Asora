import { useEffect, useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime } from '../utils/formatters.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

function Appeals() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending');
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

  const runDecision = async (decision) => {
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
      await adminRequest(`_admin/appeals/${selected.appealId}/${decision}`, {
        method: 'POST',
        body: {
          reasonCode: trimmedReason,
          note: note.trim() || undefined
        }
      });
      setReasonCode('');
      setNote('');
      await loadAppeals(true);
    } catch (err) {
      setActionMessage(err.message || 'Decision failed.');
    } finally {
      setActionBusy(false);
    }
  };

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
                onClick={() => loadAppeals(true)}
                disabled={loading}
              >
                Refresh
              </button>
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
                  <span className="muted">
                    Config {item.configVersionUsed ?? '-'}
                  </span>
                </span>
                <span>{item.authorId || 'Unknown'}</span>
                <span>
                  <span className={`status-pill ${String(item.status).toLowerCase()}`}>
                    {item.status}
                  </span>
                </span>
                <span>{item.originalReasonCategory || '-'}</span>
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
            <div className="empty-state">No appeals found.</div>
          ) : null}
          {cursor ? (
            <div className="panel-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => loadAppeals(false)}
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
            <div className="empty-state">Select an appeal to review.</div>
          ) : (
            <>
              {detailError ? <div className="notice error">{detailError}</div> : null}
              {detail ? (
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
                        <span className={`status-pill ${String(detail.appeal.status).toLowerCase()}`}>
                          {detail.appeal.status}
                        </span>
                      </div>
                      <div>
                        <span className="detail-label">Appeal type</span>
                        <span>{detail.appeal.appealType || '-'}</span>
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
                      Original decision: {detail.originalDecision.decision}
                      {detail.originalDecision.decidedAt
                        ? ` on ${formatDateTime(detail.originalDecision.decidedAt)}`
                        : ''}
                    </div>
                    <div className="pill-list">
                      {detail.originalDecision.reasonCodes?.length
                        ? detail.originalDecision.reasonCodes.map((reason) => (
                            <span key={reason} className="tag">
                              {reason}
                            </span>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
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
                    placeholder="APPEAL_POLICY"
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
                  className="primary-button"
                  type="button"
                  onClick={() => runDecision('approve')}
                  disabled={actionBusy}
                >
                  Approve appeal
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => runDecision('reject')}
                  disabled={actionBusy}
                >
                  Reject appeal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Appeals;
