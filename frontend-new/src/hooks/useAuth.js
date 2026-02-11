import { useState, useEffect, useCallback } from 'react';
import { signMessage, getConnectedAddress } from '../lib/wallet';
import { API_BASE_URL } from '../config/constants';

const TOKEN_KEY = 'eticapool_auth_token';

function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function useAuth(walletAddress) {
  const [token, setToken] = useState(() => getStoredToken());

  // Clear token when wallet disconnects or address changes to a different account
  useEffect(() => {
    if (!walletAddress) {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    // If we have a token, check if it belongs to the current address
    const existing = getStoredToken();
    if (existing) {
      try {
        const payload = JSON.parse(atob(existing.split('.')[1]));
        if (payload.address && payload.address !== walletAddress.toLowerCase()) {
          // Token is for a different address — clear it
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }, [walletAddress]);

  const login = useCallback(async (address) => {
    const addr = address || walletAddress;
    if (!addr) throw new Error('No wallet connected');

    const nonceRes = await fetch(`${API_BASE_URL}/api/v2/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
    });
    if (!nonceRes.ok) throw new Error('Failed to get nonce');
    const { nonce, message } = await nonceRes.json();

    const signature = await signMessage(message);

    const verifyRes = await fetch(`${API_BASE_URL}/api/v2/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr, signature, nonce }),
    });
    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error || 'Authentication failed');
    }
    const { token: newToken } = await verifyRes.json();

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    return newToken;
  }, [walletAddress]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };
}
