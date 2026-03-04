import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const CHECKLIST_STORAGE_KEY = 'lythaus.operatorChecklist.v1';

const CHECKLIST_PHASES = [
  { id: 'triage', label: 'Triage' },
  { id: 'containment', label: 'Containment' },
  { id: 'recovery', label: 'Recovery' }
];

const CHECKLIST_ITEMS = {
  triage: [
    { id: 'triage-queue', label: 'Confirm queue pressure and impacted categories.' },
    { id: 'triage-auth', label: 'Verify admin auth/session and role access health.' },
    { id: 'triage-scope', label: 'Identify affected surfaces and escalation owner.' }
  ],
  containment: [
    { id: 'containment-writes', label: 'Pause non-essential moderation writes if unstable.' },
    { id: 'containment-safety', label: 'Prioritize high-severity flags and pending appeals.' },
    { id: 'containment-comms', label: 'Post status update with current mitigation steps.' }
  ],
  recovery: [
    { id: 'recovery-verify', label: 'Validate health/readiness and queue normalization.' },
    { id: 'recovery-audit', label: 'Review audit trail for all incident-era overrides.' },
    { id: 'recovery-postmortem', label: 'Capture timeline and follow-up remediation tasks.' }
  ]
};

const DASHBOARD_GUIDE = {
  title: 'How to use this dashboard',
  summary:
    'This is the command center for control.asora.co.za. Severity is backend-computed and trends are directional operational signals.',
  items: [
    'Read incident severity first; this state is computed server-side, not in browser.',
    'Use trend cards to spot direction changes in flags/appeals over 24h or 7d.',
    'Use checklist mode for incident workflows; checklist completion is local per operator.',
    'Use queue pressure cards to allocate moderator focus in real time.',
    'Confirm your admin session is valid before making any write actions.',
    'Use quick actions to jump directly into flags, appeals, users, and audits.'
  ],
  footnote:
    'Incident severity does not include queue thresholds in v1; use trend direction and queue counts together.'
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

function unwrapApiData(payload) {
  if (payload && typeof payload === 'object' && payload.data !== undefined) {
    return payload.data;
  }
  return payload;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTrendBuckets(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      t: typeof item?.t === 'string' ? item.t : null,
      count: normalizeNumber(item?.count, 0)
    }))
    .filter((item) => item.t);
}

function emptyMetrics(window = '24h') {
  return {
    incident: {
      severity: 'incident',
      healthStatus: 'error',
      readinessStatus: 'degraded',
      severityReasons: ['metrics_unavailable'],
      generatedAt: null
    },
    queues: {
      openFlags: 0,
      pendingAppeals: 0,
      audit24h: 0
    },
    trends: {
      window,
      bucketSeconds: window === '7d' ? 86400 : 3600,
      flags: [],
      appeals: []
    },
    signals: {
      flagsDeltaBuckets: 0,
      appealsDeltaBuckets: 0
    },
    partial: false,
    errors: []
  };
}

function parseOpsMetrics(payload, window) {
  const value = unwrapApiData(payload) || {};
  const fallback = emptyMetrics(window);
  return {
    incident: {
      severity: value?.incident?.severity || fallback.incident.severity,
      healthStatus: value?.incident?.healthStatus || fallback.incident.healthStatus,
      readinessStatus: value?.incident?.readinessStatus || fallback.incident.readinessStatus,
      severityReasons: Array.isArray(value?.incident?.severityReasons)
        ? value.incident.severityReasons
        : fallback.incident.severityReasons,
      generatedAt: value?.incident?.generatedAt || null
    },
    queues: {
      openFlags: normalizeNumber(value?.queues?.openFlags, fallback.queues.openFlags),
      pendingAppeals: normalizeNumber(value?.queues?.pendingAppeals, fallback.queues.pendingAppeals),
      audit24h: normalizeNumber(value?.queues?.audit24h, fallback.queues.audit24h)
    },
    trends: {
      window: value?.trends?.window || window,
      bucketSeconds: normalizeNumber(value?.trends?.bucketSeconds, fallback.trends.bucketSeconds),
      flags: parseTrendBuckets(value?.trends?.flags),
      appeals: parseTrendBuckets(value?.trends?.appeals)
    },
    signals: {
      flagsDeltaBuckets: normalizeNumber(value?.signals?.flagsDeltaBuckets, 0),
      appealsDeltaBuckets: normalizeNumber(value?.signals?.appealsDeltaBuckets, 0)
    },
    partial: Boolean(value?.partial),
    errors: Array.isArray(value?.errors) ? value.errors : []
  };
}

function loadChecklistProgress() {
  if (typeof window === 'undefined') {
    return {
      phase: 'triage',
      completed: {}
    };
  }
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) {
      return { phase: 'triage', completed: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      phase: parsed?.phase || 'triage',
      completed: typeof parsed?.completed === 'object' && parsed.completed ? parsed.completed : {}
    };
  } catch {
    return { phase: 'triage', completed: {} };
  }
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
  const [trendWindow, setTrendWindow] = useState('24h');
  const [metrics, setMetrics] = useState(emptyMetrics('24h'));
  const [opsState, setOpsState] = useState({
    schemaVersion: 1,
    operatorChecklistMode: false,
    updatedAt: null,
    updatedBy: null
  });
  const [checklistProgress, setChecklistProgress] = useState(loadChecklistProgress);
  const [loading, setLoading] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [avgLatencyMs, setAvgLatencyMs] = useState('-');
  const requestSequenceRef = useRef(0);

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
    async (background = false, selectedWindow = trendWindow) => {
      const requestId = ++requestSequenceRef.current;
      const isStale = () => requestId !== requestSequenceRef.current;

      if (!background) {
        setLoading(true);
      }
      setError('');
      setWarning('');

      const token = getAdminToken();

      const start = performance.now();
      const tasks = [
        adminRequest('_admin/ops/metrics', { query: { window: selectedWindow } }),
        adminRequest('_admin/ops/state'),
        fetchJson(`${apiOrigin}/api/health`, token),
        fetchJson(`${apiOrigin}/api/ready`, token)
      ];

      const results = await Promise.allSettled(tasks);
      if (isStale()) {
        return;
      }
      const elapsedMs = Math.round(performance.now() - start);
      setAvgLatencyMs(`${elapsedMs}ms`);

      const opsMetricsResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const opsStateResult =
        results[1].status === 'fulfilled' ? results[1].value : null;
      const healthResult = results[2].status === 'fulfilled' ? results[2].value : null;
      const readyResult = results[3].status === 'fulfilled' ? results[3].value : null;

      if (opsMetricsResult) {
        const parsedMetrics = parseOpsMetrics(opsMetricsResult, selectedWindow);
        if (!parsedMetrics.incident.severityReasons.length) {
          const fallbackReasons = [];
          if (String(healthResult?.status || '').toLowerCase() !== parsedMetrics.incident.healthStatus) {
            fallbackReasons.push('health_source_mismatch');
          }
          if (String(readyResult?.status || '').toLowerCase() !== parsedMetrics.incident.readinessStatus) {
            fallbackReasons.push('ready_source_mismatch');
          }
          parsedMetrics.incident.severityReasons = fallbackReasons;
        }
        setMetrics(parsedMetrics);
        if (parsedMetrics.partial || parsedMetrics.errors.length) {
          setWarning(
            `Partial metrics loaded (${parsedMetrics.errors.length} source${parsedMetrics.errors.length === 1 ? '' : 's'} failed).`
          );
        }
      }

      if (opsStateResult) {
        const parsedState = unwrapApiData(opsStateResult) || {};
        setOpsState({
          schemaVersion: normalizeNumber(parsedState.schemaVersion, 1),
          operatorChecklistMode: Boolean(parsedState.operatorChecklistMode),
          updatedAt: parsedState.updatedAt || null,
          updatedBy: parsedState.updatedBy || null
        });
      }

      setLastUpdated(new Date().toISOString());

      const failedCount = results.filter((entry) => entry.status === 'rejected').length;
      if (failedCount > 0) {
        setError(
          `${failedCount} ops source${failedCount > 1 ? 's' : ''} failed. Check session token and API availability.`
        );
      }

      if (!background) {
        setLoading(false);
      }
    },
    [apiOrigin, trendWindow]
  );

  useEffect(() => {
    refreshMetrics(false, trendWindow).catch((err) => {
      setError(err.message || 'Failed to load dashboard metrics.');
      setLoading(false);
    });
    const intervalId = window.setInterval(() => {
      refreshMetrics(true, trendWindow).catch(() => {
        // Silent background refresh failures are surfaced in the error banner.
      });
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [refreshMetrics, trendWindow]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklistProgress));
  }, [checklistProgress]);

  const tokenPresent = Boolean(getAdminToken());
  const severity = metrics.incident.severity || 'incident';
  const severityLabel =
    severity === 'normal' ? 'System normal' : severity === 'degraded' ? 'System degraded' : 'Incident active';

  const toggleChecklistMode = async () => {
    const next = !opsState.operatorChecklistMode;
    setToggleBusy(true);
    setError('');
    try {
      await adminRequest('_admin/ops/state', {
        method: 'PUT',
        body: { operatorChecklistMode: next }
      });
      const refreshed = unwrapApiData(await adminRequest('_admin/ops/state')) || {};
      setOpsState({
        schemaVersion: normalizeNumber(refreshed.schemaVersion, 1),
        operatorChecklistMode: Boolean(refreshed.operatorChecklistMode),
        updatedAt: refreshed.updatedAt || null,
        updatedBy: refreshed.updatedBy || null
      });
    } catch (err) {
      setError(err.message || 'Failed to update checklist mode.');
    } finally {
      setToggleBusy(false);
    }
  };

  const setPhase = (phase) => {
    setChecklistProgress((prev) => ({ ...prev, phase }));
  };

  const toggleChecklistItem = (phase, itemId) => {
    setChecklistProgress((prev) => {
      const completed = { ...(prev.completed || {}) };
      const phaseMap = { ...(completed[phase] || {}) };
      phaseMap[itemId] = !phaseMap[itemId];
      completed[phase] = phaseMap;
      return { ...prev, completed };
    });
  };

  const resetChecklist = () => {
    setChecklistProgress({ phase: 'triage', completed: {} });
  };

  return (
    <PageLayout
      title="Operations Dashboard"
      subtitle="Live incident status, queue pressure, and directional moderation signals for Lythaus."
      guide={DASHBOARD_GUIDE}
      headerActions={
        <div className="panel-actions">
          <LythButton
            variant="ghost"
            type="button"
            onClick={() => refreshMetrics(false, trendWindow)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh now'}
          </LythButton>
          <span className={`health-pill ${severity}`}>
            {severityLabel}
          </span>
        </div>
      }
    >
      <LythCard variant="panel" className={`incident-banner ${severity}`}>
        <div className="panel-header">
          <h2>Incident state</h2>
          <div className="incident-meta">
            <span className={`status-pill ${severity}`}>{severity}</span>
            <span className="muted">
              Generated {metrics.incident.generatedAt ? formatDateTime(metrics.incident.generatedAt) : '-'}
            </span>
          </div>
        </div>
        <p className="panel-hint">
          Health: <strong>{metrics.incident.healthStatus}</strong> · Readiness: <strong>{metrics.incident.readinessStatus}</strong>
        </p>
        {metrics.incident.severityReasons?.length ? (
          <div className="pill-list">
            {metrics.incident.severityReasons.map((reason) => (
              <span key={reason} className="tag">
                {reason}
              </span>
            ))}
          </div>
        ) : null}
      </LythCard>

      <div className="ops-kpi-grid">
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>API Health</h2>
          <strong className={`kpi-value ${metrics.incident.healthStatus}`}>
            {metrics.incident.healthStatus}
          </strong>
          <p>Backend-computed health severity source.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Readiness</h2>
          <strong className={`kpi-value ${metrics.incident.readinessStatus}`}>
            {metrics.incident.readinessStatus}
          </strong>
          <p>Dependency readiness from backend checks.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Open Flags</h2>
          <strong className="kpi-value">{metrics.queues.openFlags}</strong>
          <p>Current count of active content flags.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Pending Appeals</h2>
          <strong className="kpi-value">{metrics.queues.pendingAppeals}</strong>
          <p>Appeals waiting for vote completion or moderator decision.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Audit (24h)</h2>
          <strong className="kpi-value">{metrics.queues.audit24h}</strong>
          <p>Human admin/moderator actions in last 24 hours.</p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card">
          <h2>Round-trip Latency</h2>
          <strong className="kpi-value">{avgLatencyMs}</strong>
          <p>Combined fetch latency for dashboard probes.</p>
        </LythCard>
      </div>

      <div className="ops-kpi-grid">
        <LythCard variant="tile" as="article" className="kpi-card sparkline-card">
          <div className="panel-header">
            <h2>Flags trend</h2>
            <span className="muted">{metrics.trends.window}</span>
          </div>
          <Sparkline data={metrics.trends.flags} label="Flags trend" />
          <p>
            Delta: <strong>{metrics.signals.flagsDeltaBuckets >= 0 ? '+' : ''}{metrics.signals.flagsDeltaBuckets}</strong>
          </p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card sparkline-card">
          <div className="panel-header">
            <h2>Appeals trend</h2>
            <span className="muted">{metrics.trends.window}</span>
          </div>
          <Sparkline data={metrics.trends.appeals} label="Appeals trend" />
          <p>
            Delta: <strong>{metrics.signals.appealsDeltaBuckets >= 0 ? '+' : ''}{metrics.signals.appealsDeltaBuckets}</strong>
          </p>
        </LythCard>
        <LythCard variant="tile" as="article" className="kpi-card trend-window-card">
          <h2>Trend window</h2>
          <div className="trend-window-actions">
            <LythButton
              type="button"
              variant={trendWindow === '24h' ? 'primary' : 'ghost'}
              onClick={() => setTrendWindow('24h')}
            >
              24h
            </LythButton>
            <LythButton
              type="button"
              variant={trendWindow === '7d' ? 'primary' : 'ghost'}
              onClick={() => setTrendWindow('7d')}
            >
              7d
            </LythButton>
          </div>
          <p>Switches sparkline resolution without changing incident severity logic.</p>
        </LythCard>
      </div>

      {error ? <div className="notice warning">{error}</div> : null}
      {warning ? <div className="notice warning">{warning}</div> : null}

      <div className="panel-header dashboard-section-heading">
        <h2>Control session</h2>
        <span className={`status-pill ${tokenPresent ? 'active' : 'disabled'}`}>
          {tokenPresent ? 'Token loaded' : 'Token missing'}
        </span>
      </div>
      <SessionPanel />
      <p className="panel-hint dashboard-last-updated">
        Last updated: {lastUpdated ? formatDateTime(lastUpdated) : 'Never'}
      </p>

      <LythCard variant="panel">
        <div className="panel-header">
          <h2>Operator checklist mode</h2>
          <div className="panel-actions">
            <label className="switch-label" htmlFor="operator-checklist-toggle">
              <input
                id="operator-checklist-toggle"
                type="checkbox"
                checked={Boolean(opsState.operatorChecklistMode)}
                onChange={toggleChecklistMode}
                disabled={toggleBusy}
              />
              Shared mode
            </label>
            <span className="muted">
              {toggleBusy
                ? 'Saving...'
                : `Updated ${opsState.updatedAt ? formatDateTime(opsState.updatedAt) : 'never'} by ${opsState.updatedBy || '-'}`}
            </span>
          </div>
        </div>
        <p className="panel-hint">
          Shared mode is global for operators. Checklist completion remains local to this browser.
        </p>
        {opsState.operatorChecklistMode ? (
          <div className="ops-checklist">
            <div className="panel-actions">
              {CHECKLIST_PHASES.map((phase) => (
                <LythButton
                  key={phase.id}
                  type="button"
                  variant={checklistProgress.phase === phase.id ? 'primary' : 'ghost'}
                  onClick={() => setPhase(phase.id)}
                >
                  {phase.label}
                </LythButton>
              ))}
              <LythButton type="button" variant="secondary" onClick={resetChecklist}>
                Reset my checklist
              </LythButton>
            </div>
            <div className="ops-checklist-phase">
              {(CHECKLIST_ITEMS[checklistProgress.phase] || []).map((item) => {
                const checked = Boolean(checklistProgress.completed?.[checklistProgress.phase]?.[item.id]);
                return (
                  <label key={item.id} className="ops-checklist-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklistItem(checklistProgress.phase, item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </LythCard>

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

function Sparkline({ data, label }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="sparkline-empty">No trend data.</div>;
  }

  const width = 220;
  const height = 62;
  const values = data.map((point) => normalizeNumber(point.count, 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = values
    .map((value, index) => {
      const x = Math.round(index * step * 100) / 100;
      const y = Math.round((height - ((value - min) / range) * height) * 100) / 100;
      return `${x},${y}`;
    })
    .join(' ');

  const latest = values[values.length - 1] ?? 0;

  return (
    <div className="sparkline-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" role="img" aria-label={label}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="sparkline-value">{latest}</span>
    </div>
  );
}

export default Dashboard;
