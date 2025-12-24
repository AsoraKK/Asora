const tiles = [
  {
    title: 'Moderation',
    text: 'Review thresholds, queue volume, and policy signals.'
  },
  {
    title: 'Audit',
    text: 'Track moderator actions and sensitive configuration changes.'
  },
  {
    title: 'System status',
    text: 'Monitor service health across regions and pipelines.'
  },
  {
    title: 'Escalations',
    text: 'See items waiting for senior review and approval.'
  },
  {
    title: 'Risk heatmap',
    text: 'Spot emerging abuse patterns and unexpected spikes.'
  }
];

function Dashboard() {
  return (
    <section className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Overview snapshots for moderation, audit, and system health.
        </p>
      </div>
      <div className="card-grid">
        {tiles.map((tile) => (
          <article key={tile.title} className="card">
            <h2>{tile.title}</h2>
            <p>{tile.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
