import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, upstream } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await upstream("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ detail: "Register failed" }));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, data);
  return response;
}
