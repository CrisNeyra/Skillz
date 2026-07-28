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
import type { UserOut } from "@/types/api";

type AuthContextValue = {
  user: UserOut | null;
  accessToken: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<UserOut>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    display_name: string;
  }) => Promise<UserOut>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseError(res: Response) {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
  } catch {
    /* ignore */
  }
  return "Error de autenticación";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setUser(null);
      throw new Error(await parseError(res));
    }
    const me = (await res.json()) as UserOut;
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        await loadMe();
      } catch {
        /* guest */
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, [loadMe]);

  const login = useCallback(
    async (loginId: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginId, password }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return loadMe();
    },
    [loadMe],
  );

  const register = useCallback(
    async (data: {
      email: string;
      username: string;
      password: string;
      display_name: string;
    }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  /** Session is cookie-based; returns opaque marker for callers that await auth readiness. */
  const getAccessToken = useCallback(async () => {
    await loadMe();
    return "cookie";
  }, [loadMe]);

  const value = useMemo(
    () => ({
      user,
      accessToken: user ? "cookie" : null,
      loading,
      login,
      register,
      logout,
      getAccessToken,
    }),
    [user, loading, login, register, logout, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
