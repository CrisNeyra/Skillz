"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { SimilarProfile } from "@/types/api";

export function SimilarProfiles({ username }: { username: string }) {
  const [items, setItems] = useState<SimilarProfile[]>([]);

  useEffect(() => {
    apiClient<SimilarProfile[]>(`/social/similar/${username}?limit=6`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [username]);

  if (!items.length) return null;

  return (
    <section className="mt-10 border-t pt-8" style={{ borderColor: "var(--profile-border)" }}>
      <h2
        className="mb-3 text-sm uppercase tracking-[0.2em]"
        style={{ color: "var(--profile-faint)" }}
      >
        Perfiles similares
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((p) => (
          <li key={p.username}>
            <Link
              href={`/u/${p.username}`}
              className="block rounded-md p-3 transition hover:opacity-90"
              style={{
                border: "1px solid var(--profile-border)",
                background: "var(--profile-panel)",
              }}
            >
              <p className="font-medium">{p.display_name}</p>
              <p className="text-xs" style={{ color: "var(--profile-accent)" }}>
                @{p.username}
              </p>
              {p.headline ? (
                <p className="mt-1 text-xs" style={{ color: "var(--profile-muted)" }}>
                  {p.headline}
                </p>
              ) : null}
              {p.shared_skills.length ? (
                <p className="mt-2 text-[10px]" style={{ color: "var(--profile-faint)" }}>
                  {p.shared_skills.slice(0, 3).join(" · ")}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
