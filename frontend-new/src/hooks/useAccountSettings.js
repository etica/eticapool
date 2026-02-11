import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants';

export function useAccountSettings(token) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/account/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateDifficulty = useCallback(async (value) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/api/v2/account/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ customMiningDifficulty: value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    const data = await res.json();
    setSettings((prev) => ({ ...prev, customMiningDifficulty: data.customMiningDifficulty }));
    return data;
  }, [token]);

  return { settings, isLoading, error, updateDifficulty, refetch: fetchSettings };
}
