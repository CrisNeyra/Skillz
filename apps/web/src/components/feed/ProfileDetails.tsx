"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileBundle } from "@/types/api";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export function ProfileDetails({ data }: { data: ProfileBundle }) {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError("Entrá con tu nombre para comentar");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiClient(`/profiles/${data.profile.username}/comments`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ body }),
      });
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo comentar");
    } finally {
      setPending(false);
    }
  };

  const endorse = async (skillId: number) => {
    if (!accessToken) return;
    await apiClient(`/skills/${skillId}/endorse`, {
      method: "POST",
      token: accessToken,
    });
    router.refresh();
  };

  const sectionTitle = {
    className: "mb-3 text-sm uppercase tracking-[0.2em]",
    style: { color: "var(--profile-faint)" } as const,
  };

  const extraLinks = data.links.filter((l) => {
    const label = l.label.toLowerCase();
    const url = l.url.toLowerCase();
    const isX =
      label === "x" ||
      label.includes("twitter") ||
      url.includes("twitter.com") ||
      url.includes("x.com/");
    return !isX;
  });

  return (
    <div className="space-y-8 border-t pt-8" style={{ borderColor: "var(--profile-border)" }}>
      <section>
        <h2 {...sectionTitle}>Sobre mí</h2>
        {data.profile.bio ? (
          <p className="max-w-3xl text-base leading-relaxed" style={{ color: "var(--profile-muted)" }}>
            {data.profile.bio}
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--profile-faint)" }}>
            {data.is_owner
              ? "Contá tu historia desde Personalizar."
              : "Sin bio todavía."}
          </p>
        )}
      </section>

      <section>
        <h2 {...sectionTitle}>Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--profile-faint)" }}>
              Sin skills todavía.
            </p>
          ) : (
            data.skills.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => endorse(s.id)}
                disabled={!user || data.is_owner}
                className="rounded-md px-3 py-1.5 text-sm transition hover:opacity-90 disabled:cursor-default"
                style={{
                  border: "1px solid var(--profile-border)",
                  background: "var(--profile-panel)",
                  color: "var(--profile-fg)",
                }}
                title={data.is_owner ? "Tus skills" : "Endosar"}
              >
                {s.name} · L{s.level}
                {s.is_verified ? " ✓" : ""} · {s.endorsement_count}
              </button>
            ))
          )}
        </div>
      </section>

      {extraLinks.length > 0 ? (
        <section>
          <h2 {...sectionTitle}>Links</h2>
          <div className="flex flex-wrap gap-3">
            {extraLinks.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline-offset-4 hover:underline"
                style={{ color: "var(--profile-accent)" }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <Separator style={{ background: "var(--profile-border)" }} />

      <section>
        <h2 {...sectionTitle}>Comentarios / endorsements</h2>
        <form onSubmit={onComment} className="mb-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dejá un comentario o endorsement…"
            className="min-h-24"
            style={{
              borderColor: "var(--profile-border)",
              background: "var(--profile-panel)",
              color: "var(--profile-fg)",
            }}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
          >
            {pending ? "Enviando…" : "Comentar"}
          </Button>
        </form>
        <ul className="space-y-3">
          {data.comments.map((c) => (
            <li
              key={c.id}
              className="rounded-md p-3"
              style={{
                border: "1px solid var(--profile-border)",
                background: "var(--profile-panel)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--profile-faint)" }}>
                @{c.author_username}
              </p>
              <p className="mt-1 text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
