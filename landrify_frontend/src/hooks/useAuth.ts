import { useCallback, useEffect, useState } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../types/api';
import { applyDemoOverlay } from '../lib/demoState';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('landrify_token'));

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('landrify_token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await getMe();
      setUser(applyDemoOverlay(profile));
    } catch {
      localStorage.removeItem('landrify_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) refresh(); else setLoading(false);
  }, [token, refresh]);

  const loginUser = (newToken: string) => {
    localStorage.setItem('landrify_token', newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    localStorage.removeItem('landrify_token');
    setToken(null);
    setUser(null);
  };

  return { user, loading, token, loginUser, logoutUser, refresh, isAuthenticated: !!token };
}
