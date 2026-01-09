import { useState } from 'react';
import {
  getAdminApiUrl,
  getAdminToken,
  setAdminApiUrl,
  setAdminToken
} from '../api/adminApi.js';

function SessionPanel() {
  const [apiUrl, setApiUrl] = useState(getAdminApiUrl());
  const [token, setToken] = useState(getAdminToken());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setAdminApiUrl(apiUrl);
    setAdminToken(token);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const handleClear = () => {
    setAdminApiUrl('');
    setAdminToken('');
    setApiUrl(getAdminApiUrl());
    setToken('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Admin session</h2>
        <p>Store the admin API base URL and access token locally.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Admin API base URL</span>
          <input
            className="input"
            type="text"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://admin-api.asora.co.za"
          />
        </label>
        <label className="field">
          <span className="field-label">Admin access token</span>
          <input
            className="input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste admin JWT"
          />
        </label>
      </div>
      <div className="panel-actions">
        <button className="primary-button" type="button" onClick={handleSave}>
          Save session
        </button>
        <button className="ghost-button" type="button" onClick={handleClear}>
          Clear saved values
        </button>
        <span
          className={saved ? 'saved-indicator show' : 'saved-indicator'}
          aria-live="polite"
        >
          Saved
        </span>
      </div>
      <p className="panel-hint">
        Values are stored in local storage for this browser only.
      </p>
    </div>
  );
}

export default SessionPanel;
