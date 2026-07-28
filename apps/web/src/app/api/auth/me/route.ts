import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  upstream,
} from "@/lib/auth-cookies";

async function refreshAccess(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const res = await upstream("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; refresh_token: string };
}

export async function GET(request: NextRequest) {
  let access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  let refreshed: { access_token: string; refresh_token: string } | null = null;

  const tryMe = async (token: string) =>
    upstream("/auth/me", { method: "GET", token });

  let res = access ? await tryMe(access) : null;
  if (!res || res.status === 401) {
    refreshed = await refreshAccess(request);
    if (!refreshed) {
      const response = NextResponse.json({ detail: "No autenticado" }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
    access = refreshed.access_token;
    res = await tryMe(access);
  }

  const data = await res!.json().catch(() => ({ detail: "Error" }));
  if (!res!.ok) {
    const response = NextResponse.json(data, { status: res!.status });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json(data);
  if (refreshed) setAuthCookies(response, refreshed);
  return response;
}
