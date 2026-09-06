// BLUEWRITE — Date Formatting Utilities

/**
 * Format a date string or Date object into a readable format.
 * @param {string|Date|null} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string or Date object into a readable date and time format.
 * @param {string|Date|null} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}