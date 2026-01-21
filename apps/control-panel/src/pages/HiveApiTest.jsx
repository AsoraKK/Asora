import { useState } from 'react';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';
import { adminRequest, getAdminToken } from '../api/adminApi.js';

const HIVE_API_URL = import.meta.env.VITE_HIVE_API_URL || 'https://api.thehive.ai/api/v2/task/sync';

/**
 * Test moderation categories with their Hive class names
 */
const MODERATION_CLASSES = [
  { key: 'hate', label: 'Hate Speech', icon: '🚫' },
  { key: 'violence', label: 'Violence', icon: '⚠️' },
  { key: 'sexual', label: 'Adult Content', icon: '🔞' },
  { key: 'harassment', label: 'Harassment', icon: '💢' },
  { key: 'spam', label: 'Spam', icon: '📧' },
  { key: 'self_harm', label: 'Self-Harm', icon: '🩹' }
];

/**
 * Sample test strings for quick testing
 */
const SAMPLE_TEXTS = [
  { label: 'Safe greeting', text: 'Hello! How are you today? 😊' },
  { label: 'Borderline aggressive', text: 'I really hate when people do that, it makes me so angry!' },
  { label: 'Food content', text: 'Just made an amazing pasta carbonara with fresh ingredients.' },
  { label: 'Question', text: 'Does anyone know a good restaurant near downtown?' }
];

function HiveApiTest() {
  const [testMode, setTestMode] = useState('text');
  const [inputText, setInputText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [liveMode, setLiveMode] = useState(false);

  const handleTestText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to test');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (liveMode) {
        // Real API call via backend proxy
        const response = await adminRequest('/moderation/test', {
          method: 'POST',
          body: {
            type: 'text',
            content: inputText,
            isTestMode: true
          }
        });
        setResult(response);
      } else {
        // Mock response for demo
        await new Promise(resolve => setTimeout(resolve, 800));
        setResult(generateMockTextResult(inputText));
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  };

  const handleTestImage = async () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL to test');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (liveMode) {
        const response = await adminRequest('/moderation/test', {
          method: 'POST',
          body: {
            type: 'image',
            url: imageUrl,
            isTestMode: true
          }
        });
        setResult(response);
      } else {
        // Mock response for demo
        await new Promise(resolve => setTimeout(resolve, 1200));
        setResult(generateMockImageResult(imageUrl));
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (text) => {
    setInputText(text);
    setError(null);
    setResult(null);
  };

  return (
    <section className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Hive AI Testing</h1>
            <p className="page-subtitle">
              Test content moderation APIs with text and image analysis.
            </p>
          </div>
          <div className="live-mode-toggle">
            <label className="live-mode-label">
              <input
                type="checkbox"
                checked={liveMode}
                onChange={(e) => setLiveMode(e.target.checked)}
              />
              <span className={`live-badge ${liveMode ? 'active' : ''}`}>
                {liveMode ? '🔴 LIVE' : '🔵 MOCK'}
              </span>
            </label>
            <span className="live-hint">
              {liveMode ? 'Using real Hive AI API' : 'Using mock responses'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="test-tabs">
        <button
          type="button"
          className={`test-tab ${testMode === 'text' ? 'active' : ''}`}
          onClick={() => { setTestMode('text'); setResult(null); setError(null); }}
        >
          📝 Text Moderation
        </button>
        <button
          type="button"
          className={`test-tab ${testMode === 'image' ? 'active' : ''}`}
          onClick={() => { setTestMode('image'); setResult(null); setError(null); }}
        >
          🖼️ Image Moderation
        </button>
        <button
          type="button"
          className={`test-tab ${testMode === 'deepfake' ? 'active' : ''}`}
          onClick={() => { setTestMode('deepfake'); setResult(null); setError(null); }}
        >
          🎭 Deepfake Detection
        </button>
      </div>

      {/* Text Moderation */}
      {testMode === 'text' && (
        <LythCard variant="panel">
          <h3>Text Content Analysis</h3>
          <p className="card-desc">
            Enter text to analyze for policy violations using Hive AI's text moderation models.
          </p>

          {/* Sample Texts */}
          <div className="sample-chips">
            {SAMPLE_TEXTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="sample-chip"
                onClick={() => handleSampleClick(sample.text)}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <textarea
            className="test-textarea"
            placeholder="Enter text to analyze..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
          />

          <div className="panel-actions">
            <LythButton
              type="button"
              onClick={handleTestText}
              disabled={loading || !inputText.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze Text'}
            </LythButton>
            <span className="char-count">{inputText.length} characters</span>
          </div>
        </LythCard>
      )}

      {/* Image Moderation */}
      {testMode === 'image' && (
        <LythCard variant="panel">
          <h3>Image Content Analysis</h3>
          <p className="card-desc">
            Provide an image URL to analyze for visual policy violations.
          </p>

          <input
            type="url"
            className="test-input"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          {imageUrl && (
            <div className="image-preview">
              <img
                src={imageUrl}
                alt="Preview"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <div className="panel-actions">
            <LythButton
              type="button"
              onClick={handleTestImage}
              disabled={loading || !imageUrl.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze Image'}
            </LythButton>
          </div>
        </LythCard>
      )}

      {/* Deepfake Detection */}
      {testMode === 'deepfake' && (
        <LythCard variant="panel">
          <h3>Deepfake Detection</h3>
          <p className="card-desc">
            Analyze media for AI-generated or manipulated content.
          </p>

          <input
            type="url"
            className="test-input"
            placeholder="https://example.com/video.mp4 or image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div className="deepfake-info">
            <span className="info-icon">ℹ️</span>
            Supports JPG, PNG, MP4, and MOV files. Maximum 50MB.
          </div>

          <div className="panel-actions">
            <LythButton
              type="button"
              onClick={handleTestImage}
              disabled={loading || !imageUrl.trim()}
            >
              {loading ? 'Analyzing...' : 'Detect Deepfake'}
            </LythButton>
          </div>
        </LythCard>
      )}

      {/* Error Display */}
      {error && (
        <LythCard variant="panel" className="error-card">
          <div className="error-content">
            <span className="error-icon">❌</span>
            <span>{error}</span>
          </div>
        </LythCard>
      )}

      {/* Results Display */}
      {result && (
        <LythCard variant="panel" className="results-card">
          <h3>Analysis Results</h3>
          
          {/* Action Badge */}
          <div className={`action-badge action-${result.action?.toLowerCase() || 'allow'}`}>
            {result.action === 'BLOCK' && '🚫 BLOCK'}
            {result.action === 'WARN' && '⚠️ REVIEW'}
            {result.action === 'ALLOW' && '✅ ALLOW'}
          </div>

          {/* Confidence Score */}
          <div className="confidence-row">
            <span className="confidence-label">Confidence</span>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${(result.confidence || 0) * 100}%` }}
              />
            </div>
            <span className="confidence-value">
              {((result.confidence || 0) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Categories Detected */}
          {result.categories?.length > 0 && (
            <div className="categories-section">
              <h4>Detected Categories</h4>
              <div className="category-tags">
                {result.categories.map((cat, idx) => (
                  <span key={idx} className="category-tag">
                    {MODERATION_CLASSES.find(c => c.key === cat)?.icon || '📌'} {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reasons */}
          {result.reasons?.length > 0 && (
            <div className="reasons-section">
              <h4>Reasons</h4>
              <ul className="reasons-list">
                {result.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Class Scores (for detailed view) */}
          {result.classScores && (
            <div className="class-scores">
              <h4>Class Scores</h4>
              <div className="scores-grid">
                {Object.entries(result.classScores)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([className, score]) => (
                    <div key={className} className="score-item">
                      <span className="score-class">{className}</span>
                      <span className="score-value">{(score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Request ID */}
          {result.requestId && (
            <div className="request-id">
              Request ID: <code>{result.requestId}</code>
            </div>
          )}
        </LythCard>
      )}
    </section>
  );
}

/**
 * Generate mock text moderation result for demo mode
 */
function generateMockTextResult(text) {
  const lower = text.toLowerCase();
  const hasNegative = /hate|angry|kill|stupid|idiot|damn/.test(lower);
  const hasExplicit = /sex|nude|porn/.test(lower);

  let action = 'ALLOW';
  let confidence = 0.12 + Math.random() * 0.2;
  const categories = [];
  const reasons = [];

  if (hasExplicit) {
    action = 'BLOCK';
    confidence = 0.85 + Math.random() * 0.1;
    categories.push('sexual');
    reasons.push('Explicit content detected');
  } else if (hasNegative) {
    action = 'WARN';
    confidence = 0.55 + Math.random() * 0.2;
    categories.push('harassment');
    reasons.push('Potentially aggressive language detected');
  } else {
    reasons.push('No policy violations detected');
  }

  return {
    action,
    confidence,
    categories,
    reasons,
    requestId: `mock-${Date.now()}`,
    classScores: {
      hate: hasNegative ? 0.4 + Math.random() * 0.3 : Math.random() * 0.1,
      violence: hasNegative ? 0.3 + Math.random() * 0.2 : Math.random() * 0.05,
      sexual: hasExplicit ? 0.9 : Math.random() * 0.02,
      harassment: hasNegative ? 0.5 + Math.random() * 0.2 : Math.random() * 0.08,
      spam: Math.random() * 0.1,
      self_harm: Math.random() * 0.02
    }
  };
}

/**
 * Generate mock image moderation result for demo mode
 */
function generateMockImageResult(url) {
  const isUnsafe = /unsafe|adult|nsfw/i.test(url);

  return {
    action: isUnsafe ? 'BLOCK' : 'ALLOW',
    confidence: isUnsafe ? 0.92 : 0.08 + Math.random() * 0.15,
    categories: isUnsafe ? ['sexual'] : [],
    reasons: isUnsafe
      ? ['Image flagged for adult content']
      : ['Image passed all safety checks'],
    requestId: `mock-img-${Date.now()}`,
    classScores: {
      general_nsfw: isUnsafe ? 0.91 : Math.random() * 0.05,
      gore: Math.random() * 0.02,
      violence: Math.random() * 0.03,
      suggestive: isUnsafe ? 0.75 : Math.random() * 0.1,
      very_bloody: Math.random() * 0.01,
      hate_symbols: Math.random() * 0.01
    }
  };
}

export default HiveApiTest;
