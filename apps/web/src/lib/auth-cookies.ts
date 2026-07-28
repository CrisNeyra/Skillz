import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "skillz_access";
export const REFRESH_COOKIE = "skillz_refresh";

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiBase() {
  return API_BASE.replace(/\/$/, "");
}

export function cookieOptions(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function setAuthCookies(
  response: NextResponse,
  tokens: { access_token: string; refresh_token: string },
) {
  const accessMinutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 15);
  const refreshDays = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? 7);
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(accessMinutes * 60));
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    cookieOptions(refreshDays * 24 * 60 * 60),
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function upstream(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${apiBase()}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  return res;
}
