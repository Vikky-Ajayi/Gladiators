import { useCallback, useEffect, useState } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../types/api';
import { applyDemoOverlay } from '../lib/demoState';

const TOKEN_KEY = 'landrify_token';
const AUTH_EVENT = 'landrify:auth-change';

function readToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(readToken());

  const refresh = useCallback(async () => {
    if (!readToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await getMe();
      setUser(applyDemoOverlay(profile));
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      emitAuthChange();
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync this instance whenever ANY component writes the token,
  // and across tabs via the native storage event.
  useEffect(() => {
    const sync = () => setToken(readToken());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (token) refresh(); else { setUser(null); setLoading(false); }
  }, [token, refresh]);

  const loginUser = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    emitAuthChange();
  };

  const logoutUser = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    emitAuthChange();
  };

  return { user, loading, token, loginUser, logoutUser, refresh, isAuthenticated: !!token };
}
