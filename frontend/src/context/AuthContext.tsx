import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User } from '../types';
import { getMe } from '../api/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'onlok_user';
const TOKEN_KEY = 'onlok_token';

const loadStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);

  const login = useCallback((userData: User) => {
    localStorage.setItem(TOKEN_KEY, userData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Merge partial fields into the stored user — used after profile picture upload etc.
  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Re-fetch the user profile from the server and merge into state
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await getMe();
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, ...fresh };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // silently ignore — user remains logged in with stale data
    }
  }, []);

  useEffect(() => {
    if (user?.token) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token: user?.token ?? null,
      isAuthenticated: !!user,
      login,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, login, logout, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook — throws if used outside AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
