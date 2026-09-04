import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  apiBase,
  cookieOptions,
} from "@/lib/auth-cookies";

export async function middleware(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (access || !refresh) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.next();
    }
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    const response = NextResponse.next();
    const accessMinutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 15);
    const refreshDays = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? 7);
    response.cookies.set(ACCESS_COOKIE, data.access_token, cookieOptions(accessMinutes * 60));
    response.cookies.set(
      REFRESH_COOKIE,
      data.refresh_token,
      cookieOptions(refreshDays * 24 * 60 * 60),
    );
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
