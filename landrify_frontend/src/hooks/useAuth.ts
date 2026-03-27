import { useState, useEffect } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../types/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('landrify_token'));

  useEffect(() => {
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('landrify_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const loginUser = (newToken: string) => {
    localStorage.setItem('landrify_token', newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    localStorage.removeItem('landrify_token');
    setToken(null);
    setUser(null);
  };

  return { user, loading, token, loginUser, logoutUser, isAuthenticated: !!token };
}
