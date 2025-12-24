import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/moderation', label: 'Moderation' },
  { to: '/audit', label: 'Audit' }
];

function Nav() {
  return (
    <header className="nav">
      <div className="brand">
        <span className="brand-mark">Asora</span>
        <span className="brand-sub">Control Panel</span>
      </div>
      <nav className="nav-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-meta">Ops Preview</div>
    </header>
  );
}

export default Nav;
