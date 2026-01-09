import { useEffect, useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime } from '../utils/formatters.js';

function parseOptionalInt(value) {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function Invites() {
  const [invites, setInvites] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState({
    email: '',
    maxUses: '',
    label: '',
    expiresInDays: ''
  });
  const [batchForm, setBatchForm] = useState({
    count: '',
    maxUses: '',
    label: '',
    expiresInDays: ''
  });
  const [formMessage, setFormMessage] = useState('');

  const [selected, setSelected] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadInvites = async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminRequest('_admin/invites', {
        query: { limit: 25, cursor: reset ? undefined : cursor }
      });
      const nextInvites = reset ? response?.invites || [] : [...invites, ...(response?.invites || [])];
      setInvites(nextInvites);
      setCursor(response?.nextCursor || null);
      if (reset) {
        setSelected(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load invites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites(true);
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormMessage('');
    const maxUses = parseOptionalInt(createForm.maxUses);
    const expiresInDays = parseOptionalInt(createForm.expiresInDays);
    if (maxUses === null || expiresInDays === null) {
      setFormMessage('Max uses and expiry must be positive integers.');
      return;
    }
    try {
      await adminRequest('_admin/invites', {
        method: 'POST',
        body: {
          email: createForm.email.trim() || undefined,
          maxUses,
          label: createForm.label.trim() || undefined,
          expiresInDays
        }
      });
      setCreateForm({ email: '', maxUses: '', label: '', expiresInDays: '' });
      await loadInvites(true);
    } catch (err) {
      setFormMessage(err.message || 'Failed to create invite.');
    }
  };

  const handleBatch = async (event) => {
    event.preventDefault();
    setFormMessage('');
    const count = parseOptionalInt(batchForm.count);
    const maxUses = parseOptionalInt(batchForm.maxUses);
    const expiresInDays = parseOptionalInt(batchForm.expiresInDays);
    if (!count || maxUses === null || expiresInDays === null) {
      setFormMessage('Batch count and numeric fields must be positive integers.');
      return;
    }
    try {
      await adminRequest('_admin/invites/batch', {
        method: 'POST',
        body: {
          count,
          maxUses,
          label: batchForm.label.trim() || undefined,
          expiresInDays
        }
      });
      setBatchForm({ count: '', maxUses: '', label: '', expiresInDays: '' });
      await loadInvites(true);
    } catch (err) {
      setFormMessage(err.message || 'Failed to create invite batch.');
    }
  };

  const handleRevoke = async () => {
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
      await adminRequest(`_admin/invites/${selected.inviteCode}/revoke`, {
        method: 'POST',
        body: {
          reasonCode: trimmedReason,
          note: note.trim() || undefined
        }
      });
      setReasonCode('');
      setNote('');
      await loadInvites(true);
    } catch (err) {
      setActionMessage(err.message || 'Failed to revoke invite.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <h1>Invites</h1>
        <p className="page-subtitle">
          Generate and revoke beta invites with usage tracking.
        </p>
      </div>
      <div className="page-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Create invite</h2>
          </div>
          <form className="form-grid" onSubmit={handleCreate}>
            <label className="field">
              <span className="field-label">Email restriction (optional)</span>
              <input
                className="input"
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="user@example.com"
              />
            </label>
            <label className="field">
              <span className="field-label">Max uses</span>
              <input
                className="input"
                type="number"
                min="1"
                value={createForm.maxUses}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, maxUses: event.target.value }))
                }
                placeholder="1"
              />
            </label>
            <label className="field">
              <span className="field-label">Expiry (days)</span>
              <input
                className="input"
                type="number"
                min="1"
                value={createForm.expiresInDays}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, expiresInDays: event.target.value }))
                }
                placeholder="30"
              />
            </label>
            <label className="field">
              <span className="field-label">Label</span>
              <input
                className="input"
                type="text"
                value={createForm.label}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Press outreach"
              />
            </label>
            <div className="panel-actions">
              <button className="primary-button" type="submit">
                Create invite
              </button>
            </div>
          </form>
          <div className="divider" />
          <div className="panel-header">
            <h2>Batch create</h2>
          </div>
          <form className="form-grid" onSubmit={handleBatch}>
            <label className="field">
              <span className="field-label">Count</span>
              <input
                className="input"
                type="number"
                min="1"
                value={batchForm.count}
                onChange={(event) =>
                  setBatchForm((prev) => ({ ...prev, count: event.target.value }))
                }
                placeholder="10"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Max uses</span>
              <input
                className="input"
                type="number"
                min="1"
                value={batchForm.maxUses}
                onChange={(event) =>
                  setBatchForm((prev) => ({ ...prev, maxUses: event.target.value }))
                }
                placeholder="1"
              />
            </label>
            <label className="field">
              <span className="field-label">Expiry (days)</span>
              <input
                className="input"
                type="number"
                min="1"
                value={batchForm.expiresInDays}
                onChange={(event) =>
                  setBatchForm((prev) => ({ ...prev, expiresInDays: event.target.value }))
                }
                placeholder="30"
              />
            </label>
            <label className="field">
              <span className="field-label">Label</span>
              <input
                className="input"
                type="text"
                value={batchForm.label}
                onChange={(event) =>
                  setBatchForm((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Partner batch"
              />
            </label>
            <div className="panel-actions">
              <button className="secondary-button" type="submit">
                Create batch
              </button>
            </div>
          </form>
          {formMessage ? <div className="notice error">{formMessage}</div> : null}
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>Invites</h2>
            <div className="panel-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => loadInvites(true)}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="data-table">
            <div className="data-row header">
              <span>Invite</span>
              <span>Status</span>
              <span>Usage</span>
              <span>Last used</span>
              <span>Actions</span>
            </div>
            {invites.map((invite) => (
              <div key={invite.inviteCode} className="data-row">
                <span>
                  <strong>{invite.inviteCode}</strong>
                  <span className="muted">{invite.label || '-'}</span>
                  <span className="muted">{invite.email || 'Any email'}</span>
                </span>
                <span>
                  <span className={`status-pill ${String(invite.status).toLowerCase()}`}>
                    {invite.status}
                  </span>
                </span>
                <span>
                  {invite.usageCount}/{invite.maxUses}
                </span>
                <span>{formatDateTime(invite.lastUsedAt)}</span>
                <span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setSelected(invite)}
                  >
                    Select
                  </button>
                </span>
              </div>
            ))}
          </div>
          {!invites.length && !loading ? (
            <div className="empty-state">No invites found.</div>
          ) : null}
          {cursor ? (
            <div className="panel-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => loadInvites(false)}
                disabled={loading}
              >
                Load more
              </button>
            </div>
          ) : null}
          <div className="divider" />
          <div className="panel-header">
            <h2>Revoke invite</h2>
          </div>
          {!selected ? (
            <div className="empty-state">Select an invite to revoke.</div>
          ) : (
            <>
              <div className="detail-list">
                <div>
                  <span className="detail-label">Invite</span>
                  <span>{selected.inviteCode}</span>
                </div>
                <div>
                  <span className="detail-label">Status</span>
                  <span className={`status-pill ${String(selected.status).toLowerCase()}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              {actionMessage ? <div className="notice error">{actionMessage}</div> : null}
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Reason code</span>
                  <input
                    className="input"
                    type="text"
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                    placeholder="INVITE_ABUSE"
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
                  onClick={handleRevoke}
                  disabled={actionBusy || selected.status !== 'ACTIVE'}
                >
                  Revoke invite
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Invites;
