import { useState, useMemo } from 'react';

/**
 * Device presets for emulating various mobile devices
 */
const DEVICE_PRESETS = {
  iPhoneSE: { width: 320, height: 568, name: 'iPhone SE', dpi: 2 },
  iPhone14: { width: 390, height: 844, name: 'iPhone 14', dpi: 3 },
  iPhone14ProMax: { width: 430, height: 932, name: 'iPhone 14 Pro Max', dpi: 3 },
  iPhone15Pro: { width: 393, height: 852, name: 'iPhone 15 Pro', dpi: 3 },
  pixel7: { width: 412, height: 915, name: 'Pixel 7', dpi: 2.625 },
  pixel8Pro: { width: 448, height: 998, name: 'Pixel 8 Pro', dpi: 3 },
  galaxyS23: { width: 360, height: 780, name: 'Galaxy S23', dpi: 3 },
  galaxyS24Ultra: { width: 384, height: 824, name: 'Galaxy S24 Ultra', dpi: 3.375 }
};

const DEVICE_OPTIONS = Object.entries(DEVICE_PRESETS).map(([key, preset]) => ({
  value: key,
  label: `${preset.name} (${preset.width}×${preset.height})`
}));

/**
 * DeviceEmulator - React port of the Flutter device emulator widget
 * Renders a phone frame with controllable device type, orientation, and scale
 */
function DeviceEmulator({
  children,
  showControls = true,
  initialDevice = 'iPhone15Pro',
  initialOrientation = 'portrait',
  className = ''
}) {
  const [device, setDevice] = useState(initialDevice);
  const [orientation, setOrientation] = useState(initialOrientation);
  const [scale, setScale] = useState(0.75);
  const [showNotch, setShowNotch] = useState(true);
  const [showHomeIndicator, setShowHomeIndicator] = useState(true);

  const preset = DEVICE_PRESETS[device] || DEVICE_PRESETS.iPhone15Pro;

  // Swap dimensions for landscape
  const deviceWidth = orientation === 'portrait' ? preset.width : preset.height;
  const deviceHeight = orientation === 'portrait' ? preset.height : preset.width;

  const frameStyle = useMemo(() => ({
    transform: `scale(${scale})`,
    transformOrigin: 'top center'
  }), [scale]);

  const isPortrait = orientation === 'portrait';
  const bezelWidth = 12;
  const notchHeight = 34;
  const homeIndicatorHeight = 5;
  const borderRadius = isPortrait ? 44 : 32;
  const innerRadius = isPortrait ? 32 : 22;

  return (
    <div className={`device-emulator ${className}`.trim()}>
      {showControls && (
        <div className="device-controls">
          <h3 className="device-controls-title">Device Preview</h3>

          {/* Device Selector */}
          <div className="control-group">
            <label htmlFor="device-select">Device</label>
            <select
              id="device-select"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="device-select"
            >
              {DEVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="device-meta">
              {deviceWidth} × {deviceHeight} @ {preset.dpi}x
            </span>
          </div>

          {/* Orientation Toggle */}
          <div className="control-group">
            <label>Orientation</label>
            <div className="orientation-toggle">
              <button
                type="button"
                className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => setOrientation('portrait')}
                aria-pressed={orientation === 'portrait'}
              >
                <span className="orientation-icon">📱</span>
                Portrait
              </button>
              <button
                type="button"
                className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => setOrientation('landscape')}
                aria-pressed={orientation === 'landscape'}
              >
                <span className="orientation-icon">📲</span>
                Landscape
              </button>
            </div>
          </div>

          {/* Scale Slider */}
          <div className="control-group">
            <label htmlFor="scale-slider">Scale: {Math.round(scale * 100)}%</label>
            <input
              id="scale-slider"
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="scale-slider"
            />
          </div>

          <hr className="control-divider" />

          {/* Device Chrome */}
          <div className="control-group">
            <label>Device Chrome</label>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={showNotch}
                onChange={(e) => setShowNotch(e.target.checked)}
              />
              <span>Notch / Dynamic Island</span>
            </label>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={showHomeIndicator}
                onChange={(e) => setShowHomeIndicator(e.target.checked)}
              />
              <span>Home Indicator</span>
            </label>
          </div>

          <hr className="control-divider" />

          {/* Tips */}
          <div className="device-tips">
            <strong>💡 Preview Tips</strong>
            <ul>
              <li>Use flow selector to switch screens</li>
              <li>Test different device sizes</li>
              <li>Rotate for landscape testing</li>
            </ul>
          </div>
        </div>
      )}

      {/* Device Frame */}
      <div className="device-viewport">
        <div className="device-frame-wrapper" style={frameStyle}>
          <div
            className="device-frame"
            style={{
              width: deviceWidth + bezelWidth * 2,
              height: deviceHeight + bezelWidth * 2,
              borderRadius
            }}
          >
            <div
              className="device-screen"
              style={{
                width: deviceWidth,
                height: deviceHeight,
                borderRadius: innerRadius,
                paddingTop: showNotch && isPortrait ? notchHeight : 24,
                paddingBottom: showHomeIndicator ? homeIndicatorHeight + 16 : 20
              }}
            >
              {/* Notch (portrait) */}
              {showNotch && isPortrait && (
                <div className="device-notch">
                  <div className="notch-camera" />
                </div>
              )}

              {/* Notch (landscape - left side) */}
              {showNotch && !isPortrait && <div className="device-notch-landscape" />}

              {/* Content */}
              <div className="device-content">{children}</div>

              {/* Home Indicator */}
              {showHomeIndicator && (
                <div
                  className="device-home-indicator"
                  style={{ width: isPortrait ? 134 : 180 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceEmulator;
