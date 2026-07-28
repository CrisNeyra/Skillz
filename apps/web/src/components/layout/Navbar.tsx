"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SkillzLogo } from "@/components/brand/SkillzLogo";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout, loading, accessToken } = useAuth();
  const { t } = useLocale();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setUnread(0);
      return;
    }
    apiClient<{ count: number }>("/notifications/unread-count", { token: accessToken })
      .then((d) => setUnread(d.count))
      .catch(() => setUnread(0));
  }, [accessToken]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#6d28d9]/15 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <SkillzLogo size="sm" />
          <span
            className="text-lg font-medium tracking-tight text-[#1a1025]"
            style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
          >
            Skillz
          </span>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          {!loading && user ? (
            <>
              <Link
                href="/feed"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden text-[#1a1025] hover:bg-[#6d28d9]/10 sm:inline-flex",
                )}
              >
                Feed
              </Link>
              <Link
                href="/search"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-[#1a1025] hover:bg-[#6d28d9]/10",
                )}
              >
                Buscar
              </Link>
              <Link
                href="/notifications"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "relative text-[#1a1025] hover:bg-[#6d28d9]/10",
                )}
              >
                Alertas
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6d28d9] px-1 text-[10px] text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href={`/u/${user.username}`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden text-[#1a1025] hover:bg-[#6d28d9]/10 md:inline-flex",
                )}
              >
                {t.navProfile}
              </Link>
              <Link
                href="/settings/customizer"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden text-[#1a1025] hover:bg-[#6d28d9]/10 lg:inline-flex",
                )}
              >
                {t.navCustomize}
              </Link>
              <Button
                variant="outline"
                className="border-[#6d28d9]/25 bg-transparent text-[#1a1025] hover:bg-[#6d28d9]/10"
                onClick={() => void logout()}
              >
                {t.navLogout}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-[#1a1025] hover:bg-[#6d28d9]/10",
                )}
              >
                {t.navLogin}
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "bg-[#6d28d9] text-white hover:bg-[#5b21b6]",
                )}
              >
                {t.navRegister}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
