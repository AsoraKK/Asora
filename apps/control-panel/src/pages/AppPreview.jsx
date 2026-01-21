import { useState, useCallback } from 'react';
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
 * Interactive mock screen content for each flow
 */
const FlowContent = ({ flow, liveMode, onNavigate, appState, setAppState }) => {
  const flowConfig = PREVIEW_FLOWS.find(f => f.id === flow);
  
  // Handle button clicks with visual feedback
  const handleAction = (action, nextFlow) => {
    // Add to action log
    setAppState(prev => ({
      ...prev,
      actionLog: [...(prev.actionLog || []).slice(-9), { action, time: new Date().toLocaleTimeString() }]
    }));
    
    if (nextFlow) {
      onNavigate(nextFlow);
    }
  };

  return (
    <div className="flow-screen">
      {/* Flow-specific interactive content */}
      {flow === 'authChoice' && (
        <div className="mock-auth">
          <div className="mock-logo">Lythaus</div>
          <div className="mock-tagline">Connect • Create • Inspire</div>
          <div className="mock-buttons">
            <button 
              className="mock-btn primary"
              onClick={() => handleAction('Sign In clicked', 'homeFeed')}
            >
              Sign In
            </button>
            <button 
              className="mock-btn secondary"
              onClick={() => handleAction('Create Account clicked', 'onboardingIntro')}
            >
              Create Account
            </button>
          </div>
          <div className="mock-divider">or continue with</div>
          <div className="mock-social">
            <button className="social-btn" onClick={() => handleAction('Apple Sign In', 'homeFeed')}>🍎</button>
            <button className="social-btn" onClick={() => handleAction('Google Sign In', 'homeFeed')}>G</button>
          </div>
        </div>
      )}

      {flow === 'onboardingIntro' && (
        <div className="mock-onboarding">
          <div className="mock-illustration">🌟</div>
          <h3>Welcome to Lythaus</h3>
          <p>A space for authentic connection and creative expression.</p>
          <div className="mock-dots">
            <span className={`dot ${appState.onboardingStep === 0 ? 'active' : ''}`} />
            <span className={`dot ${appState.onboardingStep === 1 ? 'active' : ''}`} />
            <span className={`dot ${appState.onboardingStep === 2 ? 'active' : ''}`} />
          </div>
          <button 
            className="mock-btn primary"
            onClick={() => handleAction('Get Started clicked', 'onboardingModeration')}
          >
            Get Started
          </button>
          <button 
            className="mock-btn ghost"
            onClick={() => handleAction('Skip onboarding', 'homeFeed')}
          >
            Skip
          </button>
        </div>
      )}

      {flow === 'onboardingModeration' && (
        <div className="mock-moderation-setup">
          <h3>Content Safety</h3>
          <p>Choose your comfort level for content filtering.</p>
          <div className="mock-options">
            <label 
              className={`mock-option ${appState.moderationLevel === 'strict' ? 'selected' : ''}`}
              onClick={() => setAppState(prev => ({ ...prev, moderationLevel: 'strict' }))}
            >
              <span>🛡️</span>
              <div>
                <strong>Strict</strong>
                <small>Maximum filtering</small>
              </div>
            </label>
            <label 
              className={`mock-option ${appState.moderationLevel === 'balanced' ? 'selected' : ''}`}
              onClick={() => setAppState(prev => ({ ...prev, moderationLevel: 'balanced' }))}
            >
              <span>⚖️</span>
              <div>
                <strong>Balanced</strong>
                <small>Recommended</small>
              </div>
            </label>
            <label 
              className={`mock-option ${appState.moderationLevel === 'relaxed' ? 'selected' : ''}`}
              onClick={() => setAppState(prev => ({ ...prev, moderationLevel: 'relaxed' }))}
            >
              <span>🔓</span>
              <div>
                <strong>Relaxed</strong>
                <small>Minimal filtering</small>
              </div>
            </label>
          </div>
          <button 
            className="mock-btn primary"
            onClick={() => handleAction(`Moderation set to ${appState.moderationLevel}`, 'onboardingFeed')}
          >
            Continue
          </button>
        </div>
      )}

      {flow === 'onboardingFeed' && (
        <div className="mock-feed-setup">
          <h3>Personalize Your Feed</h3>
          <p>Select topics you're interested in.</p>
          <div className="topic-grid">
            {['Photography', 'Art', 'Music', 'Tech', 'Food', 'Travel'].map(topic => (
              <button
                key={topic}
                className={`topic-chip ${appState.selectedTopics?.includes(topic) ? 'selected' : ''}`}
                onClick={() => {
                  setAppState(prev => {
                    const topics = prev.selectedTopics || [];
                    return {
                      ...prev,
                      selectedTopics: topics.includes(topic) 
                        ? topics.filter(t => t !== topic) 
                        : [...topics, topic]
                    };
                  });
                }}
              >
                {topic}
              </button>
            ))}
          </div>
          <button 
            className="mock-btn primary"
            onClick={() => handleAction(`Selected topics: ${(appState.selectedTopics || []).join(', ')}`, 'homeFeed')}
          >
            Start Exploring
          </button>
        </div>
      )}

      {flow === 'homeFeed' && (
        <div className="mock-feed">
          {/* Navigation bar */}
          <div className="mock-nav-bar">
            <button className="nav-icon active" onClick={() => handleAction('Home tapped')}>🏠</button>
            <button className="nav-icon" onClick={() => handleAction('Search tapped')}>🔍</button>
            <button className="nav-icon add" onClick={() => handleAction('Create tapped', 'createPost')}>➕</button>
            <button className="nav-icon" onClick={() => handleAction('Rewards tapped', 'rewards')}>🏆</button>
            <button className="nav-icon" onClick={() => handleAction('Profile tapped', 'profile')}>👤</button>
          </div>
          
          {/* Post content */}
          <div className="mock-feed-content">
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
              <button 
                className={`action-btn ${appState.liked ? 'active' : ''}`}
                onClick={() => {
                  setAppState(prev => ({ ...prev, liked: !prev.liked, likeCount: (prev.likeCount || 234) + (prev.liked ? -1 : 1) }));
                  handleAction(appState.liked ? 'Unliked post' : 'Liked post');
                }}
              >
                {appState.liked ? '❤️' : '🤍'} {appState.likeCount || 234}
              </button>
              <button className="action-btn" onClick={() => handleAction('Comment tapped')}>💬 18</button>
              <button className="action-btn" onClick={() => handleAction('Share tapped')}>🔄 12</button>
            </div>
          </div>
        </div>
      )}

      {flow === 'createPost' && (
        <div className="mock-create">
          <div className="mock-create-nav">
            <button className="back-btn" onClick={() => handleAction('Back', 'homeFeed')}>← Back</button>
            <span>New Post</span>
            <button 
              className={`post-btn ${appState.postText ? '' : 'disabled'}`}
              onClick={() => {
                if (appState.postText) {
                  handleAction(`Posted: "${appState.postText}"`, 'homeFeed');
                  setAppState(prev => ({ ...prev, postText: '' }));
                }
              }}
            >
              Post
            </button>
          </div>
          <div className="mock-create-area">
            <span className="mock-avatar-sm">👤</span>
            <textarea 
              className="mock-textarea-input"
              placeholder="What's on your mind?"
              value={appState.postText || ''}
              onChange={(e) => setAppState(prev => ({ ...prev, postText: e.target.value }))}
            />
          </div>
          <div className="mock-media-row">
            <button className="media-btn" onClick={() => handleAction('Photo picker opened')}>📷 Photo</button>
            <button className="media-btn" onClick={() => handleAction('Video picker opened')}>🎥 Video</button>
            <button className="media-btn" onClick={() => handleAction('Location picker opened')}>📍 Location</button>
          </div>
          <div className="char-counter">{(appState.postText || '').length}/500</div>
        </div>
      )}

      {flow === 'profile' && (
        <div className="mock-profile">
          <button className="back-btn top-left" onClick={() => handleAction('Back', 'homeFeed')}>← Back</button>
          <div className="mock-profile-header">
            <div className="mock-avatar-lg">👤</div>
            <h3>@testuser</h3>
            <p>Digital creator • Photography enthusiast</p>
          </div>
          <div className="mock-stats">
            <div onClick={() => handleAction('Posts tapped')}><strong>1.2K</strong><span>Posts</span></div>
            <div onClick={() => handleAction('Followers tapped')}><strong>45.3K</strong><span>Followers</span></div>
            <div onClick={() => handleAction('Following tapped')}><strong>892</strong><span>Following</span></div>
          </div>
          <button 
            className="mock-btn secondary"
            onClick={() => handleAction('Edit Profile tapped', 'settings')}
          >
            Edit Profile
          </button>
          <button 
            className="mock-btn ghost"
            onClick={() => handleAction('Settings tapped', 'settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      )}

      {flow === 'settings' && (
        <div className="mock-settings">
          <div className="settings-header">
            <button className="back-btn" onClick={() => handleAction('Back', 'profile')}>← Back</button>
            <h3>Settings</h3>
          </div>
          <div className="settings-list">
            <button className="settings-item" onClick={() => handleAction('Account tapped')}>
              <span>👤 Account</span><span>›</span>
            </button>
            <button className="settings-item" onClick={() => handleAction('Privacy tapped')}>
              <span>🔒 Privacy</span><span>›</span>
            </button>
            <button className="settings-item" onClick={() => handleAction('Notifications tapped')}>
              <span>🔔 Notifications</span><span>›</span>
            </button>
            <button 
              className="settings-item" 
              onClick={() => handleAction('Content Safety tapped', 'onboardingModeration')}
            >
              <span>🛡️ Content Safety</span><span>›</span>
            </button>
            <button className="settings-item" onClick={() => handleAction('Help tapped')}>
              <span>❓ Help & Support</span><span>›</span>
            </button>
            <button 
              className="settings-item danger" 
              onClick={() => handleAction('Signed out', 'authChoice')}
            >
              <span>🚪 Sign Out</span><span></span>
            </button>
          </div>
        </div>
      )}

      {flow === 'rewards' && (
        <div className="mock-rewards">
          <button className="back-btn top-left" onClick={() => handleAction('Back', 'homeFeed')}>← Back</button>
          <div className="rewards-header">
            <span className="rewards-icon">🏆</span>
            <h3>Your Rewards</h3>
            <div className="points-display">{appState.points || 1250} pts</div>
          </div>
          <div className="rewards-list">
            <button 
              className="reward-item"
              onClick={() => {
                setAppState(prev => ({ ...prev, points: (prev.points || 1250) + 50 }));
                handleAction('Daily check-in claimed +50pts');
              }}
            >
              <span>📅 Daily Check-in</span>
              <span className="reward-value">+50 pts</span>
            </button>
            <button 
              className="reward-item completed"
              onClick={() => handleAction('Already completed')}
            >
              <span>📝 First Post</span>
              <span className="reward-value">✓ Done</span>
            </button>
            <button 
              className="reward-item"
              onClick={() => handleAction('Invite friends tapped')}
            >
              <span>👥 Invite Friends</span>
              <span className="reward-value">+100 pts</span>
            </button>
          </div>
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
  const [appState, setAppState] = useState({
    moderationLevel: 'balanced',
    selectedTopics: [],
    liked: false,
    likeCount: 234,
    postText: '',
    points: 1250,
    onboardingStep: 0,
    actionLog: []
  });

  const handleReset = () => {
    setResetKey(prev => prev + 1);
    setCurrentFlow('authChoice');
    setAppState({
      moderationLevel: 'balanced',
      selectedTopics: [],
      liked: false,
      likeCount: 234,
      postText: '',
      points: 1250,
      onboardingStep: 0,
      actionLog: []
    });
  };

  const handleNewSession = () => {
    setResetKey(Date.now());
    handleReset();
  };

  const handleNavigate = useCallback((flowId) => {
    setCurrentFlow(flowId);
  }, []);

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
              Test Lythaus app flows with device emulation. Click buttons in the phone to navigate!
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

          {/* Action Log */}
          {appState.actionLog?.length > 0 && (
            <LythCard variant="panel" className="action-log">
              <h4>📋 Action Log</h4>
              <div className="log-entries">
                {appState.actionLog.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="log-entry">
                    <span className="log-time">{entry.time}</span>
                    <span className="log-action">{entry.action}</span>
                  </div>
                ))}
              </div>
            </LythCard>
          )}

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
              onNavigate={handleNavigate}
              appState={appState}
              setAppState={setAppState}
            />
          </DeviceEmulator>
        </div>
      </div>
    </section>
  );
}

export default AppPreview;
