"use client";

import Link from "next/link";
import { SkillzLogo } from "@/components/brand/SkillzLogo";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[#6d28d9]/15 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <SkillzLogo size="sm" />
          <span
            className="text-lg font-medium tracking-tight text-[#1a1025]"
            style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
          >
            Skillz
          </span>
        </div>
        <nav className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <Link
                href={`/u/${user.username}`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-[#1a1025] hover:bg-[#6d28d9]/10",
                )}
              >
                Mi perfil
              </Link>
              <Link
                href="/settings/customizer"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-[#1a1025] hover:bg-[#6d28d9]/10",
                )}
              >
                Personalizar
              </Link>
              <Button
                variant="outline"
                className="border-[#6d28d9]/25 bg-transparent text-[#1a1025] hover:bg-[#6d28d9]/10"
                onClick={logout}
              >
                Salir
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
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "bg-[#6d28d9] text-white hover:bg-[#5b21b6]",
                )}
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
