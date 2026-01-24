import { useState, useRef, useCallback } from 'react';
import LythButton from '../components/LythButton.jsx';
import LythCard from '../components/LythCard.jsx';
import { adminRequest, getAdminApiUrl } from '../api/adminApi.js';

const HIVE_API_URL = import.meta.env.VITE_HIVE_API_URL || 'https://api.thehive.ai/api/v2/task/sync';

// Local storage key for analysis logs
const ANALYSIS_LOG_KEY = 'hive_analysis_logs';

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
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [liveMode, setLiveMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ANALYSIS_LOG_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [showLogs, setShowLogs] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const fileInputRef = useRef(null);

  // Save log entry
  const saveLogEntry = useCallback((type, input, result) => {
    const entry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      input: type === 'text' ? input : (uploadedFile?.name || input),
      liveMode,
      result
    };
    const updatedLogs = [entry, ...analysisLogs].slice(0, 100); // Keep last 100
    setAnalysisLogs(updatedLogs);
    localStorage.setItem(ANALYSIS_LOG_KEY, JSON.stringify(updatedLogs));
  }, [analysisLogs, liveMode, uploadedFile]);

  // File handling for drag & drop
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Supported: JPG, PNG, GIF, WebP, MP4, MOV');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB');
      return;
    }
    
    setUploadedFile(file);
    setImageUrl(''); // Clear URL when file is uploaded
    setError(null);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleTestText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to test');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);

    try {
      let response;
      const startTime = performance.now();
      
      if (liveMode) {
        // Real API call via backend proxy
        try {
          response = await adminRequest('/moderation/test', {
            method: 'POST',
            body: {
              type: 'text',
              content: inputText,
              isTestMode: true
            }
          });
        } catch (apiError) {
          const endTime = performance.now();
          const debugData = {
            mode: 'live',
            endpoint: '/moderation/test',
            method: 'POST',
            duration: `${(endTime - startTime).toFixed(2)}ms`,
            error: {
              message: apiError.message,
              status: apiError.status,
              payload: apiError.payload
            },
            timestamp: new Date().toISOString(),
            apiUrl: adminRequest.__getApiUrl?.() || getAdminApiUrl?.() || 'unknown'
          };
          setDebugInfo(debugData);
          console.error('Hive AI API Error:', debugData);
          throw apiError;
        }
      } else {
        // Mock response for demo
        await new Promise(resolve => setTimeout(resolve, 800));
        response = generateMockTextResult(inputText);
      }
      
      const endTime = performance.now();
      setResult(response);
      setDebugInfo({
        mode: liveMode ? 'live' : 'mock',
        endpoint: '/moderation/test',
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        responseSize: `${JSON.stringify(response).length} bytes`
      });
      saveLogEntry('text', inputText, response);
    } catch (err) {
      setError(err.message || 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  };

  const handleTestImage = async () => {
    const hasInput = uploadedFile || imageUrl.trim();
    if (!hasInput) {
      setError('Please upload an image or enter an image URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);

    try {
      let response;
      const startTime = performance.now();
      
      if (liveMode) {
        try {
          if (uploadedFile) {
            // Upload file to backend for analysis
            const formData = new FormData();
            formData.append('file', uploadedFile);
            formData.append('type', testMode === 'deepfake' ? 'deepfake' : 'image');
            formData.append('isTestMode', 'true');
            
            response = await adminRequest('/moderation/test/upload', {
              method: 'POST',
              body: formData,
              isFormData: true
            });
          } else {
            response = await adminRequest('/moderation/test', {
              method: 'POST',
              body: {
                type: testMode === 'deepfake' ? 'deepfake' : 'image',
                url: imageUrl,
                isTestMode: true
              }
            });
          }
        } catch (apiError) {
          const endTime = performance.now();
          const debugData = {
            mode: 'live',
            endpoint: uploadedFile ? '/moderation/test/upload' : '/moderation/test',
            method: 'POST',
            duration: `${(endTime - startTime).toFixed(2)}ms`,
            contentType: uploadedFile ? 'file' : 'url',
            error: {
              message: apiError.message,
              status: apiError.status,
              payload: apiError.payload
            },
            timestamp: new Date().toISOString(),
            apiUrl: getAdminApiUrl?.() || 'unknown'
          };
          setDebugInfo(debugData);
          console.error('Hive AI API Error:', debugData);
          throw apiError;
        }
      } else {
        // Mock response for demo
        await new Promise(resolve => setTimeout(resolve, 1200));
        response = generateMockImageResult(uploadedFile?.name || imageUrl);
      }
      
      const endTime = performance.now();
      setResult(response);
      setDebugInfo({
        mode: liveMode ? 'live' : 'mock',
        endpoint: uploadedFile ? '/moderation/test/upload' : '/moderation/test',
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        responseSize: `${JSON.stringify(response).length} bytes`
      });
      saveLogEntry(testMode, uploadedFile?.name || imageUrl, response);
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
            Drag & drop an image, or provide a URL to analyze for visual policy violations.
          </p>

          {/* Drag & Drop Zone */}
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            {uploadedFile ? (
              <div className="upload-preview-container">
                {uploadPreview && (
                  <img src={uploadPreview} alt="Preview" className="upload-preview-img" />
                )}
                <div className="upload-file-info">
                  <span className="upload-file-name">{uploadedFile.name}</span>
                  <span className="upload-file-size">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    className="clear-upload-btn"
                    onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="drop-icon">📁</span>
                <span className="drop-text">
                  Drag & drop an image here, or click to browse
                </span>
                <span className="drop-hint">Supports JPG, PNG, GIF, WebP (max 50MB)</span>
              </div>
            )}
          </div>

          {/* OR Divider */}
          {!uploadedFile && (
            <>
              <div className="or-divider">
                <span>or enter URL</span>
              </div>
              <input
                type="url"
                className="test-input"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </>
          )}

          {imageUrl && !uploadedFile && (
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
              disabled={loading || (!imageUrl.trim() && !uploadedFile)}
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
            Drag & drop media or provide a URL to analyze for AI-generated or manipulated content.
          </p>

          {/* Drag & Drop Zone */}
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            {uploadedFile ? (
              <div className="upload-preview-container">
                {uploadPreview && (
                  <img src={uploadPreview} alt="Preview" className="upload-preview-img" />
                )}
                <div className="upload-file-info">
                  <span className="upload-file-name">{uploadedFile.name}</span>
                  <span className="upload-file-size">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    className="clear-upload-btn"
                    onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="drop-icon">🎭</span>
                <span className="drop-text">
                  Drag & drop an image or video here, or click to browse
                </span>
                <span className="drop-hint">Supports JPG, PNG, MP4, MOV (max 50MB)</span>
              </div>
            )}
          </div>

          {/* OR Divider */}
          {!uploadedFile && (
            <>
              <div className="or-divider">
                <span>or enter URL</span>
              </div>
              <input
                type="url"
                className="test-input"
                placeholder="https://example.com/video.mp4 or image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </>
          )}

          <div className="deepfake-info">
            <span className="info-icon">ℹ️</span>
            Supports JPG, PNG, MP4, and MOV files. Maximum 50MB.
          </div>

          <div className="panel-actions">
            <LythButton
              type="button"
              onClick={handleTestImage}
              disabled={loading || (!imageUrl.trim() && !uploadedFile)}
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

      {/* Debug Info Panel */}
      {debugInfo && (
        <LythCard variant="panel" className="debug-card">
          <div className="debug-header">
            <h3>🔧 Debug Information</h3>
            <button
              type="button"
              className="debug-toggle-btn"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showDebug && (
            <div className="debug-content">
              <table className="debug-table">
                <tbody>
                  {Object.entries(debugInfo).map(([key, value]) => (
                    <tr key={key}>
                      <td className="debug-key">{key}</td>
                      <td className="debug-value">
                        {typeof value === 'object' ? (
                          <pre className="debug-json">{JSON.stringify(value, null, 2)}</pre>
                        ) : (
                          String(value)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="debug-actions">
                <button
                  type="button"
                  className="copy-debug-btn"
                  onClick={() => {
                    const text = JSON.stringify(debugInfo, null, 2);
                    navigator.clipboard.writeText(text);
                    alert('Debug info copied to clipboard');
                  }}
                >
                  📋 Copy JSON
                </button>
                <button
                  type="button"
                  className="check-browser-console-btn"
                  onClick={() => console.log('Full Debug Info:', debugInfo)}
                >
                  🖥️ Log to Console
                </button>
              </div>
              
              <div className="debug-hint">
                <span>💡</span>
                Open browser DevTools (F12) → Console tab to see detailed error logs
              </div>
            </div>
          )}
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

      {/* Analysis Logs Section */}
      <LythCard variant="panel" className="logs-section">
        <div className="logs-header">
          <h3>📋 Analysis Logs</h3>
          <div className="logs-actions">
            <button
              type="button"
              className="logs-toggle-btn"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? 'Hide Logs' : `Show Logs (${analysisLogs.length})`}
            </button>
            {analysisLogs.length > 0 && (
              <>
                <button
                  type="button"
                  className="logs-export-btn"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(analysisLogs, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `hive-analysis-logs-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  📥 Export JSON
                </button>
                <button
                  type="button"
                  className="logs-export-btn"
                  onClick={() => {
                    const csvRows = [
                      ['Timestamp', 'Type', 'Input', 'Mode', 'Action', 'Confidence', 'Categories', 'Request ID']
                    ];
                    analysisLogs.forEach(log => {
                      csvRows.push([
                        log.timestamp,
                        log.type,
                        log.input,
                        log.liveMode ? 'LIVE' : 'MOCK',
                        log.result?.action || '',
                        log.result?.confidence ? (log.result.confidence * 100).toFixed(1) + '%' : '',
                        log.result?.categories?.join('; ') || '',
                        log.result?.requestId || ''
                      ]);
                    });
                    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `hive-analysis-logs-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  📊 Export CSV
                </button>
                <button
                  type="button"
                  className="logs-clear-btn"
                  onClick={() => {
                    if (window.confirm('Clear all analysis logs?')) {
                      setAnalysisLogs([]);
                      localStorage.removeItem(ANALYSIS_LOG_KEY);
                    }
                  }}
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        </div>
        
        {showLogs && (
          <div className="logs-list">
            {analysisLogs.length === 0 ? (
              <p className="logs-empty">No analysis logs yet. Run some tests to start logging.</p>
            ) : (
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Input</th>
                    <th>Mode</th>
                    <th>Result</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisLogs.map(log => (
                    <tr key={log.id} className={`log-row action-${log.result?.action?.toLowerCase() || 'allow'}`}>
                      <td className="log-time">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="log-type">
                        {log.type === 'text' ? '📝' : log.type === 'deepfake' ? '🎭' : '🖼️'}
                        {log.type}
                      </td>
                      <td className="log-input" title={log.input}>
                        {log.input.length > 40 ? log.input.slice(0, 40) + '...' : log.input}
                      </td>
                      <td className="log-mode">
                        <span className={`mode-badge ${log.liveMode ? 'live' : 'mock'}`}>
                          {log.liveMode ? 'LIVE' : 'MOCK'}
                        </span>
                      </td>
                      <td className="log-result">
                        <span className={`result-badge ${log.result?.action?.toLowerCase() || 'allow'}`}>
                          {log.result?.action || 'N/A'}
                        </span>
                      </td>
                      <td className="log-confidence">
                        {log.result?.confidence ? `${(log.result.confidence * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </LythCard>
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
