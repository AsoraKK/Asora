export function resolveUrl(base, path) {
  const normalizedBase = base.replace(/\/+$/, '');
  if (!path) return normalizedBase;
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function durationToMs(value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('Duration value is required');
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m|h)$/);
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    default:
      throw new Error(`Unhandled duration unit: ${unit}`);
  }
}

export function deterministicJitter(vu, iteration, amplitudeSeconds = 0) {
  if (!amplitudeSeconds) return 0;

  const hash = Math.sin((vu + 1) * 12.9898 + (iteration + 1) * 78.233) * 43758.5453;
  const normalized = hash - Math.floor(hash);
  return (normalized - 0.5) * 2 * amplitudeSeconds;
}

export function clamp(value, min, max) {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}
