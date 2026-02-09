export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (window.location.protocol + '//' + window.location.hostname + ':2053');
export const ETICASCAN_URL = 'https://eticascan.org';
export const PORT_COLORS = {
  3333: '#34d399',
  5555: '#f97316',
  7777: '#fbbf24',
  9999: '#f87171',
};

// Port metadata — difficulties match worker.js hardcoded values
export const PORT_META = {
  3333: { difficulty: 400015, label: 'Low-end CPU' },
  5555: { difficulty: 500001, label: 'Mid-range CPU' },
  7777: { difficulty: 1000001, label: 'High-end CPU' },
  9999: { difficulty: 2000001, label: 'Very-High-end CPU' },
};

// Build full port objects from a plain array of port numbers
export function buildStratumPorts(portNumbers) {
  if (!Array.isArray(portNumbers)) return [];
  return portNumbers.map((p) => {
    const num = typeof p === 'object' ? p.port : p;
    const meta = PORT_META[num] || { difficulty: 0, label: '' };
    return { port: num, difficulty: meta.difficulty, label: meta.label };
  });
}
