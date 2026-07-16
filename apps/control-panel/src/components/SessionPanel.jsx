import { useEffect, useState } from 'react';
import {
  ADMIN_SESSION_CHANGE_EVENT,
  getAdminApiUrl,
  getAdminToken,
  getAdminTokenExpiry,
  setAdminApiUrl,
  setAdminToken
} from '../api/adminApi.js';
import LythButton from './LythButton.jsx';
import LythCard from './LythCard.jsx';
import LythInput from './LythInput.jsx';

function SessionPanel() {
  const [apiUrl, setApiUrl] = useState(getAdminApiUrl());
  const [token, setToken] = useState(getAdminToken());
  const [expiresAt, setExpiresAt] = useState(getAdminTokenExpiry());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncSession = () => {
      setApiUrl(getAdminApiUrl());
      setToken(getAdminToken());
      setExpiresAt(getAdminTokenExpiry());
    };

    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, syncSession);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, syncSession);
  }, []);

  const handleSave = () => {
    setAdminApiUrl(apiUrl);
    setAdminToken(token);
    setApiUrl(getAdminApiUrl());
    setToken(getAdminToken());
    setExpiresAt(getAdminTokenExpiry());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const handleClear = () => {
    setAdminApiUrl('');
    setAdminToken('');
    setApiUrl(getAdminApiUrl());
    setToken('');
    setExpiresAt(getAdminTokenExpiry());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <LythCard variant="panel">
      <div className="panel-header">
        <h2>Admin session</h2>
        <p>Store the admin API base URL and access token for this tab only.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Admin API base URL</span>
          <LythInput
            type="text"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://admin-api.lythaus.co/api"
          />
        </label>
        <label className="field">
          <span className="field-label">Admin access token</span>
          <LythInput
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste admin JWT"
          />
        </label>
      </div>
      <div className="panel-actions">
        <LythButton type="button" onClick={handleSave}>
          Save for this tab
        </LythButton>
        <LythButton variant="ghost" type="button" onClick={handleClear}>
          Clear session
        </LythButton>
        <span
          className={saved ? 'saved-indicator show' : 'saved-indicator'}
          aria-live="polite"
        >
          Saved
        </span>
      </div>
      <p className="panel-hint">
        The admin JWT lives in <code>sessionStorage</code>, clears on tab close,
        and is capped to 15 minutes or the token&apos;s own <code>exp</code>,
        whichever comes first.
      </p>
      <p className="panel-hint">
        {expiresAt
          ? `Current token expires at ${expiresAt.toLocaleTimeString()}.`
          : 'A 401 response clears the current token and forces re-entry.'}
      </p>
      <p className="panel-hint">
        XSS in an active control-panel tab can still exfiltrate the token until it expires or is cleared.
      </p>
    </LythCard>
  );
}

export default SessionPanel;
