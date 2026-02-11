import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet as walletConnect,
  disconnect as walletDisconnect,
  getConnectedAddress,
  getAvailableWallets,
  requestWalletsAsync,
  onAccountsChanged,
  tryReconnect,
} from '../lib/wallet';

export function useWallet() {
  const [address, setAddress] = useState(() => getConnectedAddress());
  const [showModal, setShowModal] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  // Silent reconnect on mount
  useEffect(() => {
    if (getConnectedAddress()) {
      tryReconnect().then((addr) => {
        if (addr) setAddress(addr);
      });
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    const cleanup = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        walletDisconnect();
        setAddress(null);
      } else {
        const newAddr = accounts[0].toLowerCase();
        localStorage.setItem('eticapool_wallet_address', newAddr);
        setAddress(newAddr);
      }
    });
    return cleanup;
  }, []);

  // "Connect" — re-request EIP-6963, then show the wallet picker modal
  const connect = useCallback(async () => {
    // Re-fire EIP-6963 request and wait briefly for any late announcements
    const detected = await requestWalletsAsync(300);
    if (detected.length === 0) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
    }
    setWallets(detected);
    setShowModal(true);
  }, []);

  // Called from the modal when user picks a wallet
  const selectWallet = useCallback(async (wallet) => {
    if (connecting) return;
    setConnectError(null);
    setConnectSuccess(false);
    setConnecting(true);
    try {
      console.log('[useWallet] selectWallet called for', wallet.id, wallet.name);
      const { address: addr } = await walletConnect(wallet.provider, wallet.id);
      setAddress(addr);
      setConnecting(false);
      setConnectSuccess(true);
      // Show success checkmark briefly, then close modal
      setTimeout(() => {
        setShowModal(false);
        setConnectSuccess(false);
      }, 1200);
      return addr;
    } catch (err) {
      console.error('[useWallet] selectWallet error:', err);
      setConnectError(err.message);
      setConnecting(false);
      // Re-show modal so user can retry or pick another wallet
      setShowModal(true);
    }
  }, [connecting]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const disconnect = useCallback(() => {
    walletDisconnect();
    setAddress(null);
  }, []);

  return {
    address,
    isConnected: !!address,
    connect,
    disconnect,
    showModal,
    wallets,
    selectWallet,
    closeModal,
    connecting,
    connectError,
    connectSuccess,
  };
}
