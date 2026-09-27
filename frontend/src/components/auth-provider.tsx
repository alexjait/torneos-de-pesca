'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, ApiError, configureAuthRecovery, type SessionPayload, type SessionUser } from '@/lib/api';

type AuthContextValue = {
  session: SessionPayload | null;
  user: SessionUser | null;
  accessToken: string | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<SessionPayload>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    configureAuthRecovery({
      refreshAccessToken: async () => {
        const response = await api.refresh();
        setSession(response.data);
        return response.data.accessToken;
      },
      onSessionInvalid: () => setSession(null),
    });
    api.refresh().then((response) => setSession(response.data)).catch(() => setSession(null)).finally(() => setIsReady(true));
    return () => configureAuthRecovery(null);
  }, []);

  async function login(email: string, password: string) {
    const response = await api.login(email, password);
    setSession(response.data);
    return response.data;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setSession(null);
    }
  }

  async function refreshSession() {
    if (!session) {
      throw new ApiError('No hay sesion iniciada.', 401);
    }

    const response = await api.me(session.accessToken);
    const updated = {
      accessToken: session.accessToken,
      user: response.data,
    };
    setSession(updated);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isReady,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
