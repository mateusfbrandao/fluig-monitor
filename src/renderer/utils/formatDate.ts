/**
 * Safely parse any date representation into a valid Date object or null.
 * Handles Date objects, timestamps (in ms or s), numeric strings (e.g. "1793899364461"),
 * ISO strings, and undefined/null.
 */
export function safeDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') {
    return null;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val > 10_000_000_000 ? val : val * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    // Check if the string consists purely of digits (Unix epoch timestamp as string)
    if (/^\d+$/.test(val)) {
      const num = parseInt(val, 10);
      const d = new Date(num > 10_000_000_000 ? num : num * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatTimeLocale(val: unknown, fallback = '-'): string {
  const d = safeDate(val);
  return d ? d.toLocaleTimeString() : fallback;
}

export function formatDateLocale(val: unknown, fallback = '-'): string {
  const d = safeDate(val);
  return d ? d.toLocaleDateString() : fallback;
}

export function formatDateTimeLocale(val: unknown, fallback = '-'): string {
  const d = safeDate(val);
  return d ? d.toLocaleString() : fallback;
}
