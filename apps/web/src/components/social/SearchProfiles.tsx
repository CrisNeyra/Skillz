"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import type { UserCard } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchProfiles() {
  const { accessToken } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<UserCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setPending(true);
    setError(null);
    try {
      const data = await apiClient<{ items: UserCard[] }>(
        `/search?q=${encodeURIComponent(q.trim())}`,
        { token: accessToken },
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de búsqueda");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1
        className="text-2xl font-semibold text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
      >
        Buscar talento
      </h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, usuario, headline…"
          className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
        />
        <Button
          type="submit"
          disabled={pending}
          className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        >
          Buscar
        </Button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-2">
        {items.map((u) => (
          <li key={u.id}>
            <Link
              href={`/u/${u.username}`}
              className="block rounded-md border border-[#6d28d9]/15 bg-white p-4 transition hover:border-[#6d28d9]/40"
            >
              <p className="font-medium text-[#1a1025]">{u.display_name}</p>
              <p className="text-xs text-[#6d28d9]">@{u.username}</p>
              {u.headline ? (
                <p className="mt-1 text-sm text-[#1a1025]/60">{u.headline}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
