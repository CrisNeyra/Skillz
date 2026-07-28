import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  upstream,
} from "@/lib/auth-cookies";

async function refreshTokens(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const res = await upstream("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; refresh_token: string };
}

async function ensureAccess(request: NextRequest) {
  let access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  if (access) return { access, refreshed: null as null | { access_token: string; refresh_token: string } };

  const tokens = await refreshTokens(request);
  if (!tokens) return { access: null, refreshed: null };
  return { access: tokens.access_token, refreshed: tokens };
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "GET");
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "POST");
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "PUT");
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "PATCH");
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "DELETE");
}

async function proxy(request: NextRequest, ctx: Ctx, method: string) {
  const { path } = await ctx.params;
  const targetPath = `/${path.join("/")}${request.nextUrl.search}`;
  let { access, refreshed } = await ensureAccess(request);

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : isMultipart
        ? await request.formData()
        : await request.text();

  const forward = (token: string | null) =>
    upstream(targetPath, {
      method,
      token,
      body,
      headers: isMultipart ? {} : { "Content-Type": contentType || "application/json" },
    });

  let res = await forward(access);

  // Access may be expired while cookie still present — refresh once and retry.
  if (res.status === 401 && request.cookies.get(REFRESH_COOKIE)?.value) {
    const tokens = await refreshTokens(request);
    if (tokens) {
      refreshed = tokens;
      access = tokens.access_token;
      res = await forward(access);
    }
  }

  const buffer = await res.arrayBuffer();
  const response = new NextResponse(buffer, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });

  if (refreshed) setAuthCookies(response, refreshed);
  if (res.status === 401) clearAuthCookies(response);
  return response;
}
