import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Audit from './pages/Audit.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Moderation from './pages/Moderation.jsx';

const NotFound = () => (
  <section className="page">
    <div className="page-header">
      <h1>Page not found</h1>
      <p className="page-subtitle">
        The page you requested does not exist in this console.
      </p>
    </div>
  </section>
);

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Nav />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/moderation" element={<Moderation />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
