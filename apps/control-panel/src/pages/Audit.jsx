const auditEvents = [
  {
    id: 'evt-1001',
    timestamp: '2025-01-14 09:12 UTC',
    actor: 'M. Patel',
    action: 'Content blocked',
    target: 'post_18e7'
  },
  {
    id: 'evt-1002',
    timestamp: '2025-01-14 08:54 UTC',
    actor: 'R. Silva',
    action: 'Appeal approved',
    target: 'appeal_1024'
  },
  {
    id: 'evt-1003',
    timestamp: '2025-01-13 17:20 UTC',
    actor: 'A. Brooks',
    action: 'User disabled',
    target: 'user_42f9'
  },
  {
    id: 'evt-1004',
    timestamp: '2025-01-13 16:02 UTC',
    actor: 'S. Nguyen',
    action: 'Invite revoked',
    target: 'invite_q1x8'
  },
  {
    id: 'evt-1005',
    timestamp: '2025-01-13 14:45 UTC',
    actor: 'N. Kim',
    action: 'Content published',
    target: 'comment_993a'
  },
  {
    id: 'evt-1006',
    timestamp: '2025-01-13 12:09 UTC',
    actor: 'L. Garcia',
    action: 'Invite created',
    target: 'batch_17'
  },
  {
    id: 'evt-1007',
    timestamp: '2025-01-13 11:32 UTC',
    actor: 'C. Martin',
    action: 'Appeal rejected',
    target: 'appeal_1011'
  },
  {
    id: 'evt-1008',
    timestamp: '2025-01-13 09:18 UTC',
    actor: 'T. Zhang',
    action: 'User enabled',
    target: 'user_2bb1'
  },
  {
    id: 'evt-1009',
    timestamp: '2025-01-12 18:27 UTC',
    actor: 'D. Rivera',
    action: 'Flag resolved',
    target: 'flag_704'
  },
  {
    id: 'evt-1010',
    timestamp: '2025-01-12 16:48 UTC',
    actor: 'E. Carter',
    action: 'Appeal reviewed',
    target: 'appeal_993'
  }
];

function Audit() {
  return (
    <section className="page">
      <div className="page-header">
        <h1>Audit</h1>
        <p className="page-subtitle">
          Recent admin actions and configuration changes (placeholder data).
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
