import { useState } from 'react';
import DeviceEmulator from '../components/DeviceEmulator.jsx';
import LythCard from '../components/LythCard.jsx';
import LythButton from '../components/LythButton.jsx';

/**
 * Preview flows matching Flutter's PreviewFlow enum
 */
const PREVIEW_FLOWS = [
  { id: 'authChoice', label: 'Auth Choice', desc: 'Sign in / Sign up screen', icon: '🔐' },
  { id: 'onboardingIntro', label: 'Onboarding Intro', desc: 'Welcome introduction', icon: '👋' },
  { id: 'onboardingModeration', label: 'Moderation Prompt', desc: 'Content safety settings', icon: '🛡️' },
  { id: 'onboardingFeed', label: 'Feed Customization', desc: 'Personalize your feed', icon: '🎯' },
  { id: 'homeFeed', label: 'Home Feed', desc: 'Main content feed', icon: '🏠' },
  { id: 'createPost', label: 'Create Post', desc: 'New post creation', icon: '➕' },
  { id: 'profile', label: 'Profile', desc: 'User profile view', icon: '👤' },
  { id: 'settings', label: 'Settings', desc: 'App settings screen', icon: '⚙️' },
  { id: 'rewards', label: 'Rewards', desc: 'Rewards dashboard', icon: '🏆' }
];

/**
 * Mock screen content for each flow
 */
const FlowContent = ({ flow, liveMode }) => {
  const flowConfig = PREVIEW_FLOWS.find(f => f.id === flow);

  return (
    <div className="flow-screen">
      <div className="flow-header">
        <span className="flow-icon-lg">{flowConfig?.icon || '📱'}</span>
        <h2 className="flow-title">{flowConfig?.label || 'Preview'}</h2>
        <p className="flow-desc">{flowConfig?.desc}</p>
      </div>

      {/* Flow-specific mock content */}
      {flow === 'authChoice' && (
        <div className="mock-auth">
          <div className="mock-logo">Lythaus</div>
          <div className="mock-tagline">Connect • Create • Inspire</div>
          <div className="mock-buttons">
            <button className="mock-btn primary">Sign In</button>
            <button className="mock-btn secondary">Create Account</button>
          </div>
          <div className="mock-divider">or continue with</div>
          <div className="mock-social">
            <span>🍎</span>
            <span>G</span>
          </div>
        </div>
      )}

      {flow === 'onboardingIntro' && (
        <div className="mock-onboarding">
          <div className="mock-illustration">🌟</div>
          <h3>Welcome to Lythaus</h3>
          <p>A space for authentic connection and creative expression.</p>
          <div className="mock-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <button className="mock-btn primary">Get Started</button>
        </div>
      )}

      {flow === 'onboardingModeration' && (
        <div className="mock-moderation-setup">
          <h3>Content Safety</h3>
          <p>Choose your comfort level for content filtering.</p>
          <div className="mock-options">
            <label className="mock-option selected">
              <span>🛡️</span>
              <div>
                <strong>Strict</strong>
                <small>Maximum filtering</small>
              </div>
            </label>
            <label className="mock-option">
              <span>⚖️</span>
              <div>
                <strong>Balanced</strong>
                <small>Recommended</small>
              </div>
            </label>
            <label className="mock-option">
              <span>🔓</span>
              <div>
                <strong>Relaxed</strong>
                <small>Minimal filtering</small>
              </div>
            </label>
          </div>
        </div>
      )}

      {flow === 'homeFeed' && (
        <div className="mock-feed">
          <div className="mock-feed-header">
            <span className="mock-avatar">👤</span>
            <span className="mock-user">@creativesoul</span>
            <span className="mock-time">2h</span>
          </div>
          <div className="mock-post-content">
            Just finished my latest photography project! 📸 The golden hour light was absolutely magical today.
          </div>
          <div className="mock-post-image">🖼️</div>
          <div className="mock-post-actions">
            <span>❤️ 234</span>
            <span>💬 18</span>
            <span>🔄 12</span>
          </div>
        </div>
      )}

      {flow === 'createPost' && (
        <div className="mock-create">
          <div className="mock-create-header">New Post</div>
          <div className="mock-create-area">
            <span className="mock-avatar-sm">👤</span>
            <div className="mock-textarea">What's on your mind?</div>
          </div>
          <div className="mock-media-row">
            <span>📷</span>
            <span>🎥</span>
            <span>🎵</span>
            <span>📍</span>
          </div>
          <button className="mock-btn primary disabled">Post</button>
        </div>
      )}

      {flow === 'profile' && (
        <div className="mock-profile">
          <div className="mock-profile-header">
            <div className="mock-avatar-lg">👤</div>
            <h3>@testuser</h3>
            <p>Digital creator • Photography enthusiast</p>
          </div>
          <div className="mock-stats">
            <div><strong>1.2K</strong><span>Posts</span></div>
            <div><strong>45.3K</strong><span>Followers</span></div>
            <div><strong>892</strong><span>Following</span></div>
          </div>
          <button className="mock-btn secondary">Edit Profile</button>
        </div>
      )}

      {(flow === 'settings' || flow === 'onboardingFeed' || flow === 'rewards') && (
        <div className="mock-placeholder">
          <span className="mock-icon">{flowConfig?.icon}</span>
          <p>{flowConfig?.label} Screen</p>
          <small>Content preview placeholder</small>
        </div>
      )}

      {/* Live Mode Indicator */}
      {liveMode && (
        <div className="live-indicator">
          <span className="live-dot" />
          LIVE
        </div>
      )}
    </div>
  );
};

function AppPreview() {
  const [currentFlow, setCurrentFlow] = useState('authChoice');
  const [liveMode, setLiveMode] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = () => {
    setResetKey(prev => prev + 1);
  };

  const handleNewSession = () => {
    setResetKey(Date.now());
  };

  return (
    <section className="page app-preview-page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>
              App Preview
              {liveMode && <span className="header-live-badge">🔴 LIVE</span>}
            </h1>
            <p className="page-subtitle">
              Test Lythaus app flows with device emulation.
            </p>
          </div>
          <div className="preview-actions">
            <button
              type="button"
              className={`live-toggle ${liveMode ? 'active' : ''}`}
              onClick={() => setLiveMode(!liveMode)}
            >
              {liveMode ? '🔴 Live Mode' : '🔵 Mock Mode'}
            </button>
            <button type="button" className="reset-btn" onClick={handleReset}>
              🔄 Reset State
            </button>
            {liveMode && (
              <button type="button" className="session-btn" onClick={handleNewSession}>
                ✨ New Session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="preview-layout">
        {/* Flow Selector */}
        <div className="flow-selector">
          <h3>Preview Flows</h3>
          <div className="flow-list">
            {PREVIEW_FLOWS.map((flow) => (
              <button
                key={flow.id}
                type="button"
                className={`flow-item ${currentFlow === flow.id ? 'active' : ''}`}
                onClick={() => setCurrentFlow(flow.id)}
              >
                <span className="flow-icon">{flow.icon}</span>
                <div className="flow-info">
                  <span className="flow-label">{flow.label}</span>
                  <span className="flow-description">{flow.desc}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Live Mode Warning */}
          {liveMode && (
            <LythCard variant="panel" className="live-warning">
              <div className="warning-content">
                <span className="warning-icon">⚠️</span>
                <div>
                  <strong>Live Test Mode Active</strong>
                  <p>API calls count against rate limits. Test data is marked with <code>isTestPost: true</code>.</p>
                </div>
              </div>
            </LythCard>
          )}
        </div>

        {/* Device Emulator */}
        <div className="emulator-container">
          <DeviceEmulator showControls={true}>
            <FlowContent
              key={`${currentFlow}-${resetKey}`}
              flow={currentFlow}
              liveMode={liveMode}
            />
          </DeviceEmulator>
        </div>
      </div>
    </section>
  );
}

export default AppPreview;
