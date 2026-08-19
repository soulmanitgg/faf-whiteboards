// Format an epoch-ms timestamp as a compact relative time ("2 hours ago").
export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} week${wk !== 1 ? 's' : ''} ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} month${mo !== 1 ? 's' : ''} ago`;
  const yr = Math.round(day / 365);
  return `${yr} year${yr !== 1 ? 's' : ''} ago`;
}

// Small deterministic-ish id for new boards/types. Not cryptographic.
let counter = 0;
export function uid(prefix = 'b') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

// Stable content signature of a board's drawn elements, for duplicate detection
// on import. Ignores nothing — two exports of the same file hash identical;
// an edited board hashes differently. Fast 32-bit FNV-ish hash of the JSON.
export function hashElements(elements) {
  const str = JSON.stringify(elements || []);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Ensure a title is unique among `existing` titles by appending " (2)", " (3)"…
export function uniqueTitle(title, existing) {
  const set = new Set(existing);
  if (!set.has(title)) return title;
  let n = 2;
  while (set.has(`${title} (${n})`)) n += 1;
  return `${title} (${n})`;
}
