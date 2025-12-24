const auditEvents = [
  {
    id: 'evt-1001',
    timestamp: '2025-01-14 09:12 UTC',
    actor: 'M. Patel',
    action: 'Threshold update',
    target: 'Text threshold'
  },
  {
    id: 'evt-1002',
    timestamp: '2025-01-14 08:54 UTC',
    actor: 'R. Silva',
    action: 'Policy note added',
    target: 'Escalation queue'
  },
  {
    id: 'evt-1003',
    timestamp: '2025-01-13 17:20 UTC',
    actor: 'A. Brooks',
    action: 'Flag review',
    target: 'User 42F9'
  },
  {
    id: 'evt-1004',
    timestamp: '2025-01-13 16:02 UTC',
    actor: 'S. Nguyen',
    action: 'Rule override',
    target: 'Image safety'
  },
  {
    id: 'evt-1005',
    timestamp: '2025-01-13 14:45 UTC',
    actor: 'N. Kim',
    action: 'Appeal reviewed',
    target: 'Case 9982'
  },
  {
    id: 'evt-1006',
    timestamp: '2025-01-13 12:09 UTC',
    actor: 'L. Garcia',
    action: 'Queue reassigned',
    target: 'Region EU-West'
  },
  {
    id: 'evt-1007',
    timestamp: '2025-01-13 11:32 UTC',
    actor: 'C. Martin',
    action: 'Policy snapshot',
    target: 'Moderation v2'
  },
  {
    id: 'evt-1008',
    timestamp: '2025-01-13 09:18 UTC',
    actor: 'T. Zhang',
    action: 'Escalation resolved',
    target: 'Case 9911'
  },
  {
    id: 'evt-1009',
    timestamp: '2025-01-12 18:27 UTC',
    actor: 'D. Rivera',
    action: 'Keyword pack update',
    target: 'Spam sensitivity'
  },
  {
    id: 'evt-1010',
    timestamp: '2025-01-12 16:48 UTC',
    actor: 'E. Carter',
    action: 'Audit export',
    target: 'Last 24h'
  }
];

function Audit() {
  return (
    <section className="page">
      <div className="page-header">
        <h1>Audit</h1>
        <p className="page-subtitle">
          Recent moderation events and configuration changes (placeholder data).
        </p>
      </div>
      <div className="audit-table">
        <div className="audit-row header">
          <span>Timestamp</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Target</span>
        </div>
        {auditEvents.map((event) => (
          <div key={event.id} className="audit-row">
            <span>{event.timestamp}</span>
            <span>{event.actor}</span>
            <span>{event.action}</span>
            <span>{event.target}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Audit;
