"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EnterPage() {
  const { enter } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await enter(name.trim());
      router.push(`/u/${me.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4">
      <h1
        className="mb-2 text-3xl font-semibold text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-display), serif" }}
      >
        ¿Cómo te llamás?
      </h1>
      <p className="mb-6 text-sm text-[#1a1025]/60">
        Sin contraseña ni usuario. Con tu nombre abrís o creás tu perfil Skillz.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name" className="text-[#1a1025]/80">
            Nombre visible
          </Label>
          <Input
            id="display_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={1}
            autoFocus
            placeholder="Ej: Ana Rivera"
            className="h-11 border-[#6d28d9]/25 bg-white text-[#1a1025] placeholder:text-[#1a1025]/35 focus-visible:border-[#6d28d9] focus-visible:ring-[#6d28d9]/25"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending || !name.trim()}
          className="h-11 w-full bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        >
          {pending ? "Entrando…" : "Entrar a Skillz"}
        </Button>
      </form>
    </div>
  );
}
