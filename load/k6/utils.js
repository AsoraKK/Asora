export function resolveUrl(base, path) {
  const normalizedBase = base.replace(/\/+$/, '');
  if (!path) return normalizedBase;
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
