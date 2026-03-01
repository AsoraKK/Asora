import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import { adminRequest, getAbsoluteAdminApiUrl, getAdminApiUrl, getAdminToken } from '../api/adminApi.js';

vi.mock('../api/adminApi.js', () => ({
  adminRequest: vi.fn(),
  getAbsoluteAdminApiUrl: vi.fn(),
  getAdminApiUrl: vi.fn(),
  getAdminToken: vi.fn(),
}));

function healthFetchPayload(status, responseStatus = 200) {
  return Promise.resolve({
    ok: true,
    status: responseStatus,
    statusText: 'OK',
    json: async () => ({ status }),
  });
}

function metricsPayload(overrides = {}) {
  return {
    data: {
      schemaVersion: 1,
      partial: false,
      incident: {
        severity: 'degraded',
        healthStatus: 'degraded',
        readinessStatus: 'ready',
        severityReasons: ['fcm_not_configured'],
        generatedAt: '2026-03-01T10:00:00.000Z',
      },
      queues: {
        openFlags: 8,
        pendingAppeals: 3,
        audit24h: 21,
      },
      trends: {
        window: '24h',
        bucketSeconds: 3600,
        flags: [
          { t: '2026-03-01T08:00:00.000Z', count: 2 },
          { t: '2026-03-01T09:00:00.000Z', count: 4 },
          { t: '2026-03-01T10:00:00.000Z', count: 6 },
        ],
        appeals: [
          { t: '2026-03-01T08:00:00.000Z', count: 1 },
          { t: '2026-03-01T09:00:00.000Z', count: 1 },
          { t: '2026-03-01T10:00:00.000Z', count: 2 },
        ],
      },
      signals: {
        flagsDeltaBuckets: 2,
        appealsDeltaBuckets: 1,
      },
      errors: [],
      ...overrides,
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.useRealTimers();

    getAbsoluteAdminApiUrl.mockReturnValue('https://control.asora.co.za/api/admin');
    getAdminApiUrl.mockReturnValue('/api/admin');
    getAdminToken.mockReturnValue('token');

    global.fetch = vi.fn((url) => {
      if (String(url).includes('/api/health')) {
        return healthFetchPayload('healthy');
      }
      if (String(url).includes('/api/ready')) {
        return healthFetchPayload('ready');
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      });
    });
  });

  it('renders backend-derived incident banner and sparklines', async () => {
    adminRequest.mockImplementation((path) => {
      if (path === '_admin/ops/metrics') {
        return Promise.resolve(metricsPayload());
      }
      if (path === '_admin/ops/state') {
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            operatorChecklistMode: false,
            updatedAt: '2026-03-01T10:00:00.000Z',
            updatedBy: 'admin-1',
          },
        });
      }
      return Promise.resolve({});
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    await screen.findByText('Incident state');
    expect(screen.getByText('System degraded')).toBeInTheDocument();
    expect(screen.getByText('fcm_not_configured')).toBeInTheDocument();
    expect(screen.getByLabelText('Flags trend')).toBeInTheDocument();
    expect(screen.getByLabelText('Appeals trend')).toBeInTheDocument();
  });

  it('switches trend window and requests 7d metrics', async () => {
    adminRequest.mockImplementation((path, options) => {
      if (path === '_admin/ops/metrics') {
        const selected = options?.query?.window || '24h';
        return Promise.resolve(
          metricsPayload({
            trends: {
              window: selected,
              bucketSeconds: selected === '7d' ? 86400 : 3600,
              flags: [{ t: '2026-03-01T00:00:00.000Z', count: selected === '7d' ? 7 : 1 }],
              appeals: [{ t: '2026-03-01T00:00:00.000Z', count: selected === '7d' ? 4 : 1 }],
            },
          })
        );
      }
      if (path === '_admin/ops/state') {
        return Promise.resolve({
          data: { schemaVersion: 1, operatorChecklistMode: false, updatedAt: null, updatedBy: null },
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    await screen.findByText('Trend window');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '7d' }));
    });

    await waitFor(() =>
      expect(adminRequest).toHaveBeenCalledWith(
        '_admin/ops/metrics',
        expect.objectContaining({ query: expect.objectContaining({ window: '7d' }) })
      )
    );
  });

  it('toggles shared checklist mode with PUT then GET reconciliation', async () => {
    let mode = false;
    adminRequest.mockImplementation((path, options) => {
      if (path === '_admin/ops/metrics') {
        return Promise.resolve(metricsPayload());
      }
      if (path === '_admin/ops/state' && !options?.method) {
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            operatorChecklistMode: mode,
            updatedAt: '2026-03-01T10:00:00.000Z',
            updatedBy: 'admin-1',
          },
        });
      }
      if (path === '_admin/ops/state' && options?.method === 'PUT') {
        mode = Boolean(options?.body?.operatorChecklistMode);
        return Promise.resolve({ data: { ok: true } });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    const toggle = await screen.findByLabelText('Shared mode');
    expect(toggle).not.toBeChecked();

    await act(async () => {
      await user.click(toggle);
    });

    await waitFor(() => expect(toggle).toBeChecked());
    expect(adminRequest).toHaveBeenCalledWith(
      '_admin/ops/state',
      expect.objectContaining({
        method: 'PUT',
        body: { operatorChecklistMode: true },
      })
    );
  });

  it('persists local checklist progress and supports reset', async () => {
    adminRequest.mockImplementation((path) => {
      if (path === '_admin/ops/metrics') {
        return Promise.resolve(metricsPayload());
      }
      if (path === '_admin/ops/state') {
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            operatorChecklistMode: true,
            updatedAt: '2026-03-01T10:00:00.000Z',
            updatedBy: 'admin-1',
          },
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    const checklistItem = await screen.findByLabelText('Confirm queue pressure and impacted categories.');
    await act(async () => {
      await user.click(checklistItem);
    });

    const stored = JSON.parse(window.localStorage.getItem('lythaus.operatorChecklist.v1'));
    expect(stored.completed.triage['triage-queue']).toBe(true);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Reset my checklist' }));
    });

    const resetStored = JSON.parse(window.localStorage.getItem('lythaus.operatorChecklist.v1'));
    expect(resetStored.phase).toBe('triage');
    expect(resetStored.completed).toEqual({});
  });

  it('shows partial warning when metrics payload is partial', async () => {
    adminRequest.mockImplementation((path) => {
      if (path === '_admin/ops/metrics') {
        return Promise.resolve(
          metricsPayload({
            partial: true,
            errors: [{ code: 'flags_trend_unavailable', message: 'timeout' }],
          })
        );
      }
      if (path === '_admin/ops/state') {
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            operatorChecklistMode: false,
            updatedAt: null,
            updatedBy: null,
          },
        });
      }
      return Promise.resolve({});
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    await screen.findByText(/Partial metrics loaded/i);
  });

  it('ignores stale older metrics responses after a newer window switch', async () => {
    const firstMetrics = deferred();
    const secondMetrics = deferred();
    let metricsCalls = 0;

    adminRequest.mockImplementation((path, options) => {
      if (path === '_admin/ops/metrics') {
        metricsCalls += 1;
        return metricsCalls === 1 ? firstMetrics.promise : secondMetrics.promise;
      }
      if (path === '_admin/ops/state') {
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            operatorChecklistMode: false,
            updatedAt: null,
            updatedBy: null,
          },
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText('Trend window');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '7d' }));
    });

    await act(async () => {
      secondMetrics.resolve(
        metricsPayload({
          queues: {
            openFlags: 777,
            pendingAppeals: 9,
            audit24h: 33,
          },
          trends: {
            window: '7d',
            bucketSeconds: 86400,
            flags: [{ t: '2026-03-01T00:00:00.000Z', count: 10 }],
            appeals: [{ t: '2026-03-01T00:00:00.000Z', count: 4 }],
          },
        })
      );
    });
    await screen.findByText('777');

    await act(async () => {
      firstMetrics.resolve(
        metricsPayload({
          queues: {
            openFlags: 111,
            pendingAppeals: 1,
            audit24h: 1,
          },
          trends: {
            window: '24h',
            bucketSeconds: 3600,
            flags: [{ t: '2026-03-01T00:00:00.000Z', count: 1 }],
            appeals: [{ t: '2026-03-01T00:00:00.000Z', count: 1 }],
          },
        })
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('777')).toBeInTheDocument();
    expect(screen.queryByText('111')).toBeNull();
  });
});
