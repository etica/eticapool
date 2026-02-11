import { BrowserProvider } from 'ethers';

const STORAGE_KEY = 'eticapool_wallet_address';
const WALLET_KEY = 'eticapool_wallet_id';

let provider = null;         // ethers BrowserProvider (lazy, only created when needed for signing)
let activeEthProvider = null; // the raw EIP-1193 provider for the chosen wallet

// ─── EIP-6963 wallet discovery ────────────────────────────────────────────────
// Used ONLY for listing available wallets in the modal.
// For actual connection, we always prefer the legacy window.ethereum injection
// because EIP-6963 proxies can hang on Firefox.
const eip6963Providers = new Map();
let eip6963Listening = false;

function startEIP6963Listening() {
  if (eip6963Listening) return;
  eip6963Listening = true;

  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider: p } = event.detail;
    if (info && p) {
      eip6963Providers.set(info.rdns, { info, provider: p });
    }
  });

  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

startEIP6963Listening();

// Friendly name overrides for known rdns values
const RDNS_NAMES = {
  'io.metamask':          'MetaMask',
  'com.trustwallet.app':  'Trust Wallet',
  'com.coinbase.wallet':  'Coinbase Wallet',
  'io.rabby':             'Rabby',
  'com.brave.wallet':     'Brave Wallet',
  'com.okex.wallet':      'OKX Wallet',
};

/**
 * Given an rdns id, find the matching legacy provider from window.ethereum.
 * This is the provider that reliably triggers the wallet popup.
 */
function findLegacyProvider(rdns) {
  // Multi-wallet: window.ethereum.providers array
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    for (const p of window.ethereum.providers) {
      if (rdns === 'io.metamask' && p.isMetaMask && !p.isTrust && !p.isBraveWallet && !p.isRabby && !p.isCoinbaseWallet && !p.isOkxWallet) return p;
      if (rdns === 'com.trustwallet.app' && p.isTrust) return p;
      if (rdns === 'com.coinbase.wallet' && p.isCoinbaseWallet) return p;
      if (rdns === 'io.rabby' && p.isRabby) return p;
      if (rdns === 'com.brave.wallet' && p.isBraveWallet) return p;
      if (rdns === 'com.okex.wallet' && p.isOkxWallet) return p;
    }
  }
  // Dedicated globals
  if (rdns === 'com.trustwallet.app' && window.trustwallet) return window.trustwallet;
  if (rdns === 'com.coinbase.wallet' && window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
  if (rdns === 'com.okex.wallet' && window.okxwallet) return window.okxwallet;
  // Bare window.ethereum
  if (window.ethereum) {
    const p = window.ethereum;
    if (rdns === 'io.metamask' && p.isMetaMask) return p;
    if (rdns === 'com.trustwallet.app' && p.isTrust) return p;
    if (rdns === 'com.coinbase.wallet' && p.isCoinbaseWallet) return p;
    if (rdns === 'io.rabby' && p.isRabby) return p;
    if (rdns === 'com.brave.wallet' && p.isBraveWallet) return p;
    if (rdns === 'com.okex.wallet' && p.isOkxWallet) return p;
  }
  return null;
}

/**
 * Detect all injected wallet providers.
 * Uses EIP-6963 for discovery (listing names), but resolves each to its
 * legacy window.ethereum provider for actual connection.
 * Returns an array of { id, name, provider } objects.
 */
export function getAvailableWallets() {
  const wallets = [];
  const seenIds = new Set();

  function add(id, name, ethProvider) {
    if (!ethProvider || seenIds.has(id)) return;
    seenIds.add(id);
    wallets.push({ id, name, provider: ethProvider });
  }

  // 1. EIP-6963 for discovery, legacy provider for connection
  for (const [rdns, entry] of eip6963Providers) {
    const name = RDNS_NAMES[rdns] || entry.info.name || rdns;
    const legacy = findLegacyProvider(rdns);
    add(rdns, name, legacy || entry.provider);
  }

  // 2. Legacy: window.ethereum.providers array
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    for (const p of window.ethereum.providers) {
      if (p.isMetaMask && !p.isTrust && !p.isBraveWallet && !p.isRabby && !p.isCoinbaseWallet && !p.isOkxWallet) {
        add('io.metamask', 'MetaMask', p);
      }
      if (p.isTrust)          add('com.trustwallet.app', 'Trust Wallet', p);
      if (p.isCoinbaseWallet) add('com.coinbase.wallet', 'Coinbase Wallet', p);
      if (p.isRabby)          add('io.rabby', 'Rabby', p);
      if (p.isBraveWallet)    add('com.brave.wallet', 'Brave Wallet', p);
      if (p.isOkxWallet)      add('com.okex.wallet', 'OKX Wallet', p);
    }
  }

  // 3. Legacy: dedicated wallet globals
  if (window.trustwallet)             add('com.trustwallet.app', 'Trust Wallet', window.trustwallet);
  if (window.coinbaseWalletExtension) add('com.coinbase.wallet', 'Coinbase Wallet', window.coinbaseWalletExtension);
  if (window.okxwallet)               add('com.okex.wallet', 'OKX Wallet', window.okxwallet);

  // 4. Last resort: bare window.ethereum
  if (wallets.length === 0 && window.ethereum) {
    const p = window.ethereum;
    if (p.isTrust)               add('com.trustwallet.app', 'Trust Wallet', p);
    else if (p.isRabby)          add('io.rabby', 'Rabby', p);
    else if (p.isCoinbaseWallet) add('com.coinbase.wallet', 'Coinbase Wallet', p);
    else if (p.isBraveWallet)    add('com.brave.wallet', 'Brave Wallet', p);
    else if (p.isOkxWallet)      add('com.okex.wallet', 'OKX Wallet', p);
    else if (p.isMetaMask)       add('io.metamask', 'MetaMask', p);
    else                         add('browser', 'Browser Wallet', p);
  }

  return wallets;
}

/**
 * Re-request EIP-6963 announcements and return wallets after a short delay.
 */
export function requestWalletsAsync(timeoutMs = 200) {
  return new Promise((resolve) => {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => resolve(getAvailableWallets()), timeoutMs);
  });
}

/**
 * Connect to a specific wallet provider.
 * Uses window.ethereum.request() directly — the same pattern as eticaio —
 * which reliably triggers the wallet unlock popup on all browsers.
 */
export async function connectWallet(ethProvider, walletId) {
  // Prefer the passed provider, fall back to window.ethereum (like eticaio does)
  const ep = ethProvider || window.ethereum;
  if (!ep) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  activeEthProvider = ep;
  provider = null;

  console.log('[wallet] connectWallet: using', walletId || 'window.ethereum');

  // Direct request — same as eticaio's window.ethereum.request({ method: 'eth_requestAccounts' })
  const accounts = await ep.request({ method: 'eth_requestAccounts' });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned. Please unlock your wallet.');
  }
  const address = accounts[0].toLowerCase();
  console.log('[wallet] connected:', address);
  localStorage.setItem(STORAGE_KEY, address);
  if (walletId) localStorage.setItem(WALLET_KEY, walletId);
  return { address, provider: ep };
}

export async function signMessage(message) {
  const ep = activeEthProvider || window.ethereum;
  if (!ep) throw new Error('No wallet detected');
  if (!provider) {
    provider = new BrowserProvider(ep);
  }
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export function getConnectedAddress() {
  return localStorage.getItem(STORAGE_KEY);
}

export function getConnectedWalletId() {
  return localStorage.getItem(WALLET_KEY);
}

export function disconnect() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem('eticapool_auth_token');
  provider = null;
  activeEthProvider = null;
}

export function onAccountsChanged(callback) {
  const ep = activeEthProvider || window.ethereum;
  if (ep) {
    ep.on('accountsChanged', callback);
    return () => ep.removeListener('accountsChanged', callback);
  }
  return () => {};
}

/**
 * Try to silently reconnect to the previously chosen wallet.
 * Uses eth_accounts (non-prompting) like eticaio's setMetamask action.
 */
export async function tryReconnect() {
  const savedAddr = localStorage.getItem(STORAGE_KEY);
  const savedId = localStorage.getItem(WALLET_KEY);
  if (!savedAddr) return null;

  const wallets = getAvailableWallets();
  const match = wallets.find((w) => w.id === savedId) || wallets[0];
  if (!match) return null;

  activeEthProvider = match.provider;
  provider = null;

  try {
    const accounts = await match.provider.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      const addr = accounts[0].toLowerCase();
      localStorage.setItem(STORAGE_KEY, addr);
      return addr;
    }
  } catch {
    // Silent fail — user will need to reconnect manually
  }
  return null;
}
