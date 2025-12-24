import { useState } from 'react';

const STORAGE_KEY = 'controlPanelModeration';
const defaultValues = {
  textThreshold: 72,
  imageThreshold: 61,
  spamSensitivity: 38
};

const sliderConfig = [
  { key: 'textThreshold', label: 'Text threshold', min: 0, max: 100 },
  { key: 'imageThreshold', label: 'Image threshold', min: 0, max: 100 },
  { key: 'spamSensitivity', label: 'Spam sensitivity', min: 0, max: 100 }
];

const getInitialValues = () => {
  if (typeof window === 'undefined') {
    return defaultValues;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultValues;
  }
  try {
    const parsed = JSON.parse(stored);
    return { ...defaultValues, ...parsed };
  } catch (error) {
    return defaultValues;
  }
};

function Moderation() {
  const [values, setValues] = useState(getInitialValues);
  const [saved, setSaved] = useState(false);

  const handleChange = (key) => (event) => {
    const nextValue = Number(event.target.value);
    setValues((prev) => ({ ...prev, [key]: nextValue }));
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section className="page">
      <div className="page-header">
        <h1>Moderation</h1>
        <p className="page-subtitle">
          Tune placeholder thresholds while the backend wiring is in progress.
        </p>
      </div>
      <div className="panel">
        {sliderConfig.map((item) => {
          const sliderId = `slider-${item.key}`;
          return (
            <div key={item.key} className="slider-row">
              <label className="slider-label" htmlFor={sliderId}>
                {item.label}
                <span className="slider-value">{values[item.key]}</span>
              </label>
              <input
                className="slider"
                id={sliderId}
                min={item.min}
                max={item.max}
                step={1}
                type="range"
                value={values[item.key]}
                onChange={handleChange(item.key)}
              />
            </div>
          );
        })}
        <div className="panel-actions">
          <button className="primary-button" type="button" onClick={handleSave}>
            Save thresholds
          </button>
          <span
            className={saved ? 'saved-indicator show' : 'saved-indicator'}
            aria-live="polite"
          >
            Saved
          </span>
        </div>
      </div>
    </section>
  );
}

export default Moderation;
