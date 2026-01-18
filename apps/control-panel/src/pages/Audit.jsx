import { useEffect, useState } from 'react';
import { adminRequest } from '../api/adminApi.js';
import { formatDateTime } from '../utils/formatters.js';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';

function formatActionLabel(entry) {
  const action = entry.action || 'UNKNOWN';
  const reason = entry.reasonCode ? ` (${entry.reasonCode})` : '';
  return `${action}${reason}`;
}

function Audit() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminRequest('_admin/audit', {
        query: { limit: 50 }
      });
      setItems(response?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <section className="page">
      <div className="page-header">
        <h1>Audit</h1>
        <p className="page-subtitle">
          Recent admin actions with audit trail details.
        </p>
      </div>
      <LythCard variant="panel">
        <div className="panel-header">
          <h2>Recent activity</h2>
          <div className="panel-actions">
            <LythButton
              variant="ghost"
              type="button"
              onClick={loadAudit}
              disabled={loading}
            >
              Refresh
            </LythButton>
          </div>
        </div>
        {error ? <div className="notice error">{error}</div> : null}
        <div className="audit-table">
          <div className="audit-row header">
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Target</span>
          </div>
          {items.map((entry) => (
            <div key={entry.id || entry.correlationId} className="audit-row">
              <span>{formatDateTime(entry.timestamp)}</span>
              <span>{entry.actorId || '-'}</span>
              <span>
                <strong>{formatActionLabel(entry)}</strong>
                {entry.note ? <span className="muted">{entry.note}</span> : null}
              </span>
              <span>
                <strong>{entry.subjectId || '-'}</strong>
                {entry.targetType ? (
                  <span className="muted">{entry.targetType}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        {!items.length && !loading ? (
          <div className="empty-state">No audit entries found.</div>
        ) : null}
      </LythCard>
    </section>
  );
}

export default Audit;
