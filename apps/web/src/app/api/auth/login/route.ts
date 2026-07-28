import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies, upstream } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await upstream("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      login: body.login ?? body.email,
      email: body.email,
      password: body.password,
    }),
  });
  const data = await res.json().catch(() => ({ detail: "Login failed" }));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, data);
  return response;
}
