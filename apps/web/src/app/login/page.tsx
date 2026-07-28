"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLanguageFooter } from "@/components/auth/AuthLanguageFooter";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const fieldClass =
  "h-10 border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025] placeholder:text-[#1a1025]/35";

const DEMO_EMAIL = "test@test.com";
const DEMO_PASSWORD = "123456Ab";

function demoLoginEnabled() {
  if (process.env.NEXT_PUBLIC_DEMO_LOGIN === "true") return true;
  if (process.env.NEXT_PUBLIC_DEMO_LOGIN === "false") return false;
  return process.env.NODE_ENV === "development";
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const showDemo = useMemo(() => demoLoginEnabled(), []);
  const [loginId, setLoginId] = useState(showDemo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(showDemo ? DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await login(loginId.trim(), password);
      router.push(`/u/${me.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loginError);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4">
      <h1
        className="mb-2 text-3xl font-semibold text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
      >
        {t.loginTitle}
      </h1>
      <p className="mb-4 text-sm text-[#1a1025]/55">{t.loginSubtitle}</p>
      {showDemo ? (
        <div className="mb-4 rounded-md border border-[#6d28d9]/25 bg-[#faf5ff] px-3 py-2 text-sm text-[#6d28d9]">
          {t.demoBanner}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login" className="text-[#1a1025]/80">
            {t.loginIdentifier}
          </Label>
          <Input
            id="login"
            type="text"
            name="login"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            autoComplete="username"
            className={fieldClass}
            placeholder="email o usuario"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#1a1025]/80">
            {t.loginPassword}
          </Label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={fieldClass}
            placeholder="••••••••"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        >
          {pending ? t.loginPending : t.loginSubmit}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[#1a1025]/50">
        {t.loginNoAccount}{" "}
        <Link href="/register" className="text-[#6d28d9] underline-offset-4 hover:underline">
          {t.loginRegisterLink}
        </Link>
      </p>
      <AuthLanguageFooter />
    </div>
  );
}
