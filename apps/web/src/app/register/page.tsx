"use client";

import { FormEvent, useState } from "react";
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

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    display_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const username = form.username.trim().toLowerCase();
      await register({
        email: form.email.trim(),
        username,
        password: form.password,
        display_name: form.display_name.trim(),
      });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <h1
        className="mb-2 text-3xl font-semibold text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
      >
        {t.registerTitle}
      </h1>
      <p className="mb-6 text-sm text-[#1a1025]/55">{t.registerSubtitle}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">{t.registerDisplayName}</Label>
          <Input
            id="display_name"
            name="display_name"
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            required
            className={fieldClass}
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">{t.registerUsername}</Label>
          <Input
            id="username"
            name="username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
            minLength={3}
            pattern="[a-zA-Z0-9_]+"
            title="Solo letras, números y guión bajo"
            className={fieldClass}
            placeholder="tu_usuario"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.registerEmail}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            autoComplete="email"
            className={fieldClass}
            placeholder="tu@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t.registerPassword}</Label>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
            autoComplete="new-password"
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
          {pending ? t.registerPending : t.registerSubmit}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[#1a1025]/50">
        {t.registerHasAccount}{" "}
        <Link href="/login" className="text-[#6d28d9] underline-offset-4 hover:underline">
          {t.registerLoginLink}
        </Link>
      </p>
      <AuthLanguageFooter />
    </div>
  );
}
