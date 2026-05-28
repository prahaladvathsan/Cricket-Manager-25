/**
 * @file sanitizeSvg.js
 * @description Reject SVG data URLs that contain script execution vectors.
 * Run at every image-import boundary (skin pack, club editor uploads).
 */

const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /\son\w+\s*=/i,                  // onload=, onclick=, etc.
  /<foreignobject\b/i,
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
  /javascript\s*:/i,
  /xlink:href\s*=\s*["']?\s*(?:https?:|\/\/)/i,
  /\bhref\s*=\s*["']?\s*(?:javascript:|data:text)/i
];

function decodeSvgDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:image/svg+xml')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  try {
    if (meta.includes(';base64')) {
      return atob(payload);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * Check an SVG data URL for unsafe content.
 * Non-SVG data URLs pass through unconditionally.
 * @param {string} dataUrl
 * @returns {{valid: boolean, reason?: string}}
 */
export function sanitizeSvgDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { valid: true };
  if (!dataUrl.startsWith('data:image/svg+xml')) return { valid: true };

  const svg = decodeSvgDataUrl(dataUrl);
  if (svg === null) return { valid: false, reason: 'Malformed SVG data URL' };

  for (const re of DANGEROUS_PATTERNS) {
    if (re.test(svg)) {
      return { valid: false, reason: `SVG contains disallowed pattern: ${re.source}` };
    }
  }
  return { valid: true };
}

/**
 * Validate an arbitrary set of (kind, dataUrl) pairs.
 * Returns the first failure encountered.
 * @param {Array<[string, string|null|undefined]>} entries
 * @returns {{valid: boolean, reason?: string}}
 */
export function sanitizeAll(entries) {
  for (const [kind, dataUrl] of entries) {
    if (!dataUrl) continue;
    const res = sanitizeSvgDataUrl(dataUrl);
    if (!res.valid) return { valid: false, reason: `${kind}: ${res.reason}` };
  }
  return { valid: true };
}
