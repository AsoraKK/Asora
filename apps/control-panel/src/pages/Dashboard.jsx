import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminRequest,
  getAbsoluteAdminApiUrl,
  getAdminToken
} from '../api/adminApi.js';
import PageLayout from '../components/PageLayout.jsx';
import SessionPanel from '../components/SessionPanel.jsx';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';
import { formatDateTime } from '../utils/formatters.js';

const DASHBOARD_GUIDE = {
  title: 'How to use this dashboard',
  summary:
    'This is the command center for control.asora.co.za. It prioritizes platform health and active operational risk.',
  items: [
    'Check API/Readiness status before processing moderation actions.',
    'Use queue pressure cards to decide where moderators should focus first.',
    'Confirm your admin session is valid before making any write actions.',
    'Use quick actions to jump directly into flags, appeals, users, and audits.',
    'Refresh every 45 seconds or run a manual refresh before incident decisions.'
  ],
  footnote:
    'If API health is degraded or down, pause moderation writes and follow the incident runbook.'
};

const QUICK_ACTIONS = [
  {
    title: 'Flags queue',
    description: 'Triage open content reports and apply publish/block decisions.',
    to: '/flags'
  },
  {
    title: 'Appeals queue',
    description:
      'Review community voting outcomes and execute moderator overrides when needed.',
    to: '/appeals'
  },
  {
    title: 'User safety',
    description:
      'Search and disable high-risk accounts, then re-enable after remediation.',
    to: '/users'
  },
  {
    title: 'Audit trail',
    description:
      'Verify who changed what, when, and with which reason codes.',
    to: '/audit'
  }
];

function normalizeHealthStatus(payload) {
  if (!payload) {
    return 'down';
  }
  const raw = String(payload.status || payload.state || '').toLowerCase();
  if (raw.includes('ready') || raw.includes('ok') || raw.includes('healthy')) {
    return 'healthy';
  }
  if (raw.includes('degrad') || raw.includes('warn')) {
    return 'degraded';
  }
  return 'down';
}

function formatCountWithOverflow(items, nextCursor) {
  const size = Array.isArray(items) ? items.length : 0;
  return nextCursor ? `${size}+` : String(size);
}

async function fetchJson(url, token) {
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function Dashboard() {
  const [metrics, setMetrics] = useState({
    apiHealth: 'down',
    readiness: 'down',
    openFlags: '-',
    pendingAppeals: '-',
    audit24h: '-',
    avgLatencyMs: '-',
    tokenPresent: false,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiOrigin = useMemo(() => {
    try {
      return new URL(getAbsoluteAdminApiUrl()).origin;
    } catch {
      if (typeof window !== 'undefined') {
        return window.location.origin;
      }
      return '';
    }
  }, []);

  const refreshMetrics = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
      }
      setError('');

      const token = getAdminToken();
      const tokenPresent = Boolean(token);

      const start = performance.now();
      const tasks = [
        adminRequest('_admin/flags', { query: { status: 'open', limit: 25 } }),
        adminRequest('_admin/appeals', {
          query: { status: 'pending', limit: 25 }
        }),
        adminRequest('_admin/audit', { query: { limit: 50 } }),
        fetchJson(`${apiOrigin}/api/health`, token),
        fetchJson(`${apiOrigin}/api/ready`, token)
      ];

      const results = await Promise.allSettled(tasks);
      const elapsedMs = Math.round(performance.now() - start);

      const flagsResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const appealsResult =
        results[1].status === 'fulfilled' ? results[1].value : null;
      const auditResult = results[2].status === 'fulfilled' ? results[2].value : null;
      const healthResult = results[3].status === 'fulfilled' ? results[3].value : null;
      const readyResult = results[4].status === 'fulfilled' ? results[4].value : null;

      const audits = Array.isArray(auditResult?.items) ? auditResult.items : [];
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const audit24h = audits.filter((item) => {
        const timestamp = item?.timestamp ? Date.parse(item.timestamp) : NaN;
        return Number.isFinite(timestamp) && timestamp >= cutoff;
      }).length;

      setMetrics({
        apiHealth: normalizeHealthStatus(healthResult),
        readiness: normalizeHealthStatus(readyResult),
        openFlags: formatCountWithOverflow(
          flagsResult?.items,
          flagsResult?.nextCursor
        ),
        pendingAppeals: formatCountWithOverflow(
          appealsResult?.items,
          appealsResult?.nextCursor
        ),
        audit24h: String(audit24h),
        avgLatencyMs: `${elapsedMs}ms`,
        tokenPresent,
        lastUpdated: new Date().toISOString()
      });

      const failedCount = results.filter((entry) => entry.status === 'rejected').length;
      if (failedCount > 0) {
        setError(
          `${failedCount} metric source${failedCount > 1 ? 's' : ''} failed. Check session token and API availability.`
        );
      }

      if (!background) {
        setLoading(false);
      }
    },
    [apiOrigin]
  );

  useEffect(() => {
    refreshMetrics().catch((err) => {
      setError(err.message || 'Failed to load dashboard metrics.');
      setLoading(false);
    });
    const intervalId = window.setInterval(() => {
      refreshMetrics(true).catch(() => {
        // Silent background refresh failures are surfaced in the error banner.
      });
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [refreshMetrics]);

  const overallStatus =
    metrics.apiHealth === 'healthy' && metrics.readiness === 'healthy'
      ? 'healthy'
      : metrics.apiHealth === 'down' || metrics.readiness === 'down'
        ? 'down'
        : 'degraded';

  return (
    <PageLayout
      title="Operations Dashboard"
      subtitle="Live health, queue pressure, and moderation control signals for Lythaus."
      guide={DASHBOARD_GUIDE}
      headerActions={
        <div className="panel-actions">
          <LythButton
            variant="ghost"
            type="button"
            onClick={() => refreshMetrics()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh now'}
          </LythButton>
          <span className={`health-pill ${overallStatus}`}>
            {overallStatus === 'healthy'
              ? 'System healthy'
              : overallStatus === 'degraded'
                ? 'System degraded'
                : 'System down'}
          </span>
        </div>
      }
    >
      <div className="ops-kpi-grid">
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>API Health</h2>
          <strong className={`kpi-value ${metrics.apiHealth}`}>
            {metrics.apiHealth}
          </strong>
          <p>Checks `/api/health` for service availability.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Readiness</h2>
          <strong className={`kpi-value ${metrics.readiness}`}>
            {metrics.readiness}
          </strong>
          <p>Checks `/api/ready` for dependency readiness.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Open Flags</h2>
          <strong className="kpi-value">{metrics.openFlags}</strong>
          <p>Current page-size view of open moderation reports.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Pending Appeals</h2>
          <strong className="kpi-value">{metrics.pendingAppeals}</strong>
          <p>Appeals waiting for vote completion or moderator decision.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Audit (24h)</h2>
          <strong className="kpi-value">{metrics.audit24h}</strong>
          <p>Admin actions recorded in the last 24 hours.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Round-trip Latency</h2>
          <strong className="kpi-value">{metrics.avgLatencyMs}</strong>
          <p>Combined fetch latency for dashboard probes.</p>
        </LythCard>
      </div>

      {error ? <div className="notice warning">{error}</div> : null}

      <div className="panel-header dashboard-section-heading">
        <h2>Control session</h2>
        <span className={`status-pill ${metrics.tokenPresent ? 'active' : 'disabled'}`}>
          {metrics.tokenPresent ? 'Token loaded' : 'Token missing'}
        </span>
      </div>
      <SessionPanel />
      <p className="panel-hint dashboard-last-updated">
        Last updated: {metrics.lastUpdated ? formatDateTime(metrics.lastUpdated) : 'Never'}
      </p>

      <div className="card-grid">
        {QUICK_ACTIONS.map((action) => (
          <LythCard key={action.title} as="article" variant="tile" className="quick-action-card">
            <h2>{action.title}</h2>
            <p>{action.description}</p>
            <Link className="inline-link" to={action.to}>
              Open page
            </Link>
          </LythCard>
        ))}
      </div>
    </PageLayout>
  );
}

export default Dashboard;
