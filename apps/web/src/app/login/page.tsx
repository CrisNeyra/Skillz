"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const fieldClass =
  "h-10 border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025] placeholder:text-[#1a1025]/35";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await login(email.trim(), password);
      router.push(`/u/${me.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
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
        Iniciar sesión
      </h1>
      <p className="mb-6 text-sm text-[#1a1025]/55">Entrá con tu email y contraseña.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#1a1025]/80">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={fieldClass}
            placeholder="tu@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#1a1025]/80">
            Contraseña
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={fieldClass}
            placeholder="Tu contraseña"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        >
          {pending ? "Entrando…" : "Iniciar sesión"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[#1a1025]/50">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="text-[#6d28d9] underline-offset-4 hover:underline">
          Registrate
        </Link>
        {" · "}
        <Link href="/entrar" className="text-[#6d28d9] underline-offset-4 hover:underline">
          Solo con nombre
        </Link>
      </p>
    </div>
  );
}
