import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  upstream,
} from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    const response = NextResponse.json({ detail: "No refresh token" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
  const res = await upstream("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const data = await res.json().catch(() => ({ detail: "Refresh failed" }));
  if (!res.ok) {
    const response = NextResponse.json(data, { status: res.status });
    clearAuthCookies(response);
    return response;
  }
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, data);
  // Touch access cookie presence for clients that check ACCESS_COOKIE existence.
  void ACCESS_COOKIE;
  return response;
}
