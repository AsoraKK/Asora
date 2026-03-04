export function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

export function formatList(values, fallback = '-') {
  if (!values || values.length === 0) {
    return fallback;
  }
  return values.join(', ');
}
