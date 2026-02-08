export function formatHashrate(h) {
  if (h >= 1e9) return (h / 1e9).toFixed(2) + ' GH/s';
  if (h >= 1e6) return (h / 1e6).toFixed(2) + ' MH/s';
  if (h >= 1e3) return (h / 1e3).toFixed(2) + ' KH/s';
  return h.toFixed(0) + ' H/s';
}

export function timeAgo(timestamp) {
  if (!timestamp) return 'never';
  // Detect seconds-based timestamps (< year 2001 in ms = before ~978B)
  // and convert to milliseconds
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function truncateAddress(addr, len = 8) {
  if (!addr || addr.length <= len * 2 + 3) return addr;
  return addr.slice(0, len + 2) + '...' + addr.slice(-len);
}

export function rawToFormatted(raw, decimals = 18) {
  if (!raw) return '0';
  // Convert to full integer string, handling scientific notation from large JS numbers
  let str;
  if (typeof raw === 'number') {
    // Use BigInt to avoid scientific notation for large numbers
    try {
      str = BigInt(Math.round(raw)).toString();
    } catch {
      str = raw.toLocaleString('fullwide', { useGrouping: false }).replace(/\.\d+$/, '');
    }
  } else {
    str = raw.toString().replace(/\.\d+$/, '');
  }
  str = str.padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const frac = str.slice(-decimals).slice(0, 4);
  return whole + '.' + frac;
}

/**
 * Subtract two raw token values (BigInt-safe). Returns "0" if result is negative.
 */
export function rawSubtract(a, b) {
  try {
    const bigA = BigInt(a || 0);
    const bigB = BigInt(b || 0);
    const diff = bigA - bigB;
    return diff > 0n ? diff.toString() : '0';
  } catch {
    return '0';
  }
}

export function mintStatusLabel(poolstatus) {
  if (poolstatus === 0) return 'unprocessed';
  if (poolstatus === 2) return 'processed + rewards';
  return 'confirmed';
}
