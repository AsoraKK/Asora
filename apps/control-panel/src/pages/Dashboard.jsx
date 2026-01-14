import SessionPanel from '../components/SessionPanel.jsx';
import LythCard from '../components/LythCard.jsx';

const tiles = [
  {
    title: 'Flagged content',
    text: 'Triage flagged posts and comments with block or publish actions.'
  },
  {
    title: 'Appeals',
    text: 'Resolve disputes and flip content state when needed.'
  },
  {
    title: 'User safety',
    text: 'Disable abusive users and restore access quickly.'
  },
  {
    title: 'Invites',
    text: 'Create and revoke beta invites while tracking usage.'
  },
  {
    title: 'Audit trail',
    text: 'Review admin actions and system changes.'
  }
];

function Dashboard() {
  return (
    <section className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Operational shortcuts for Lythaus beta administration.
        </p>
      </div>
      <SessionPanel />
      <div className="card-grid">
        {tiles.map((tile) => (
          <LythCard key={tile.title} as="article" variant="tile">
            <h2>{tile.title}</h2>
            <p>{tile.text}</p>
          </LythCard>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
