import { useState } from 'react';
import {
  getAdminApiUrl,
  getAdminToken,
  setAdminApiUrl,
  setAdminToken
} from '../api/adminApi.js';
import LythButton from './LythButton.jsx';
import LythCard from './LythCard.jsx';
import LythInput from './LythInput.jsx';

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
    <LythCard variant="panel">
      <div className="panel-header">
        <h2>Admin session</h2>
        <p>Store the admin API base URL and access token locally.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Admin API base URL</span>
          <LythInput
            type="text"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://admin-api.asora.co.za"
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
          Save session
        </LythButton>
        <LythButton variant="ghost" type="button" onClick={handleClear}>
          Clear saved values
        </LythButton>
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
    </LythCard>
  );
}

export default SessionPanel;
