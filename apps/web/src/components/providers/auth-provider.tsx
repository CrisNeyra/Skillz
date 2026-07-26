"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api";
import type { TokenResponse, UserOut } from "@/types/api";

type AuthContextValue = {
  user: UserOut | null;
  accessToken: string | null;
  loading: boolean;
  enter: (displayName: string) => Promise<UserOut>;
  login: (email: string, password: string) => Promise<UserOut>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    display_name: string;
  }) => Promise<UserOut>;
  logout: () => void;
  getAccessToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY = "skillz_access";
const REFRESH_KEY = "skillz_refresh";

function readStoredTokens() {
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((tokens: TokenResponse) => {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    setAccessToken(tokens.access_token);
  }, []);

  const loadMe = useCallback(async (token: string) => {
    const me = await apiClient<UserOut>("/auth/me", { token });
    setUser(me);
    return me;
  }, []);

  const refreshSession = useCallback(async (): Promise<string> => {
    const { refresh } = readStoredTokens();
    if (!refresh) {
      throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
    }
    const tokens = await apiClient<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
    persist(tokens);
    await loadMe(tokens.access_token);
    return tokens.access_token;
  }, [loadMe, persist]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const { access, refresh } = readStoredTokens();
    if (access) {
      try {
        const me = await apiClient<UserOut>("/auth/me", { token: access });
        setUser(me);
        setAccessToken(access);
        return access;
      } catch {
        /* refresh */
      }
    }
    if (!refresh) {
      setUser(null);
      setAccessToken(null);
      throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
    }
    try {
      return await refreshSession();
    } catch {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setUser(null);
      setAccessToken(null);
      throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
    }
  }, [refreshSession]);

  useEffect(() => {
    const boot = async () => {
      try {
        await getAccessToken();
      } catch {
        /* guest */
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, [getAccessToken]);

  const enter = useCallback(
    async (displayName: string) => {
      const tokens = await apiClient<TokenResponse>("/auth/enter", {
        method: "POST",
        body: JSON.stringify({ display_name: displayName }),
      });
      persist(tokens);
      return loadMe(tokens.access_token);
    },
    [loadMe, persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiClient<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persist(tokens);
      return loadMe(tokens.access_token);
    },
    [loadMe, persist],
  );

  const register = useCallback(
    async (data: {
      email: string;
      username: string;
      password: string;
      display_name: string;
    }) => {
      const tokens = await apiClient<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      persist(tokens);
      return loadMe(tokens.access_token);
    },
    [loadMe, persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      enter,
      login,
      register,
      logout,
      getAccessToken,
    }),
    [user, accessToken, loading, enter, login, register, logout, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
