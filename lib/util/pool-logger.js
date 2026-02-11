// Colored console logger for pool operations
// POOL_DEBUG=1 enables verbose debug output

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const IS_DEBUG = process.env.POOL_DEBUG === '1' || process.env.POOL_DEBUG === 'true';

function timestamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function truncateHash(hash, len = 10) {
  if (!hash || typeof hash !== 'string') return String(hash);
  if (hash.length <= len + 6) return hash;
  return hash.slice(0, len) + '...' + hash.slice(-4);
}

const PoolLogger = {

  // Always shown — important pool events
  info(msg) {
    console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ${msg}`);
  },

  // Always shown — successful operations (green)
  success(msg) {
    console.log(`${COLORS.green}${COLORS.bold}[${timestamp()}] OK${COLORS.reset} ${COLORS.green}${msg}${COLORS.reset}`);
  },

  // Always shown — warnings (yellow)
  warn(msg) {
    console.log(`${COLORS.yellow}[${timestamp()}] WARN${COLORS.reset} ${COLORS.yellow}${msg}${COLORS.reset}`);
  },

  // Always shown — errors (red)
  error(msg, err) {
    console.log(`${COLORS.red}${COLORS.bold}[${timestamp()}] ERROR${COLORS.reset} ${COLORS.red}${msg}${COLORS.reset}`);
    if (err) console.error(err);
  },

  // Always shown — transaction lifecycle events (magenta)
  tx(msg) {
    console.log(`${COLORS.magenta}[${timestamp()}] TX${COLORS.reset} ${msg}`);
  },

  // Only shown when POOL_DEBUG=1
  debug(msg, data) {
    if (!IS_DEBUG) return;
    if (data !== undefined) {
      console.log(`${COLORS.gray}[${timestamp()}] DBG ${msg}${COLORS.reset}`, data);
    } else {
      console.log(`${COLORS.gray}[${timestamp()}] DBG ${msg}${COLORS.reset}`);
    }
  },

  truncateHash,
};

export default PoolLogger;
