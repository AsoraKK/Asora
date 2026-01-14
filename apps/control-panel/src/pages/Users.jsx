import { useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime } from '../utils/formatters.js';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';
import LythInput from '../components/LythInput.jsx';

function Users() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const runSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter a user id, handle, or email to search.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await adminRequest('_admin/users/search', {
        query: { q: trimmed, limit: 25 }
      });
      setItems(response?.items || []);
      setSelected(null);
    } catch (err) {
      setError(err.message || 'Failed to search users.');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action) => {
    if (!selected) {
      return;
    }
    const trimmedReason = reasonCode.trim();
    const trimmedNote = note.trim();
    if (action === 'disable') {
      if (!trimmedReason) {
        setActionMessage('Reason code is required.');
        return;
      }
      if (!trimmedNote) {
        setActionMessage('Internal note is required for disable.');
        return;
      }
    }
    setActionBusy(true);
    setActionMessage('');
    try {
      await adminRequest(`_admin/users/${selected.userId}/${action}`, {
        method: 'POST',
        body: {
          reasonCode: trimmedReason || undefined,
          note: trimmedNote || undefined
        }
      });
      setReasonCode('');
      setNote('');
      await runSearch({ preventDefault: () => {} });
    } catch (err) {
      setActionMessage(err.message || 'User update failed.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <h1>Users</h1>
        <p className="page-subtitle">
          Find users and disable abusive accounts immediately.
        </p>
      </div>
      <LythCard variant="panel">
        <form className="form-row" onSubmit={runSearch}>
          <LythInput
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by user id, handle, or email"
          />
          <LythButton type="submit" disabled={loading}>
            Search
          </LythButton>
        </form>
        {error ? <div className="notice error">{error}</div> : null}
        <div className="data-table">
          <div className="data-row header">
            <span>User</span>
            <span>Created</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {items.map((user) => (
            <div key={user.userId} className="data-row">
              <span>
                <strong>{user.displayName || user.handle || 'User'}</strong>
                <span className="muted">{user.userId}</span>
                {user.email ? <span className="muted">{user.email}</span> : null}
              </span>
              <span>{formatDateTime(user.createdAt)}</span>
              <span>
                <span className={`status-pill ${String(user.status).toLowerCase()}`}>
                  {user.status}
                </span>
              </span>
              <span>
                <LythButton
                  variant="ghost"
                  type="button"
                  onClick={() => setSelected(user)}
                >
                  Select
                </LythButton>
              </span>
            </div>
          ))}
        </div>
        {!items.length && !loading ? (
          <div className="empty-state">No users found.</div>
        ) : null}
      </LythCard>
      <LythCard variant="panel">
        <div className="panel-header">
          <h2>Action</h2>
        </div>
        {!selected ? (
          <div className="empty-state">Select a user to enable or disable.</div>
        ) : (
          <>
            <div className="detail-list">
              <div>
                <span className="detail-label">User id</span>
                <span>{selected.userId}</span>
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
                <LythInput
                  type="text"
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  placeholder="ABUSE_PATTERN"
                />
              </label>
              <label className="field">
                <span className="field-label">Internal note</span>
                <LythInput
                  as="textarea"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Required for disabling a user"
                />
              </label>
            </div>
            <div className="panel-actions">
              <LythButton
                variant="danger"
                type="button"
                onClick={() => runAction('disable')}
                disabled={actionBusy}
              >
                Disable user
              </LythButton>
              <LythButton
                variant="secondary"
                type="button"
                onClick={() => runAction('enable')}
                disabled={actionBusy}
              >
                Enable user
              </LythButton>
            </div>
          </>
        )}
      </LythCard>
    </section>
  );
}

export default Users;
