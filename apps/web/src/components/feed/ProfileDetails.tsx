"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentOut, ProfileBundle } from "@/types/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export function ProfileDetails({ data }: { data: ProfileBundle }) {
  const { user, accessToken } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [comments, setComments] = useState<CommentOut[]>(data.comments);

  const onComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError(t.loginError);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const created = await apiClient<CommentOut>(`/profiles/${data.profile.username}/comments`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ body }),
      });
      setBody("");
      setComments((prev) => [created, ...prev]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo comentar");
    } finally {
      setPending(false);
    }
  };

  const endorse = async (skillId: number) => {
    if (!accessToken) return;
    try {
      await apiClient(`/skills/${skillId}/endorse`, {
        method: "POST",
        token: accessToken,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo endorsar");
    }
  };

  const toggleLike = async (c: CommentOut) => {
    if (!accessToken) return;
    try {
      const liked = Boolean(c.liked_by_me);
      const res = await apiClient<{ liked: boolean; like_count: number }>(
        `/comments/${c.id}/like`,
        { method: liked ? "DELETE" : "POST", token: accessToken },
      );
      setComments((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? { ...item, liked_by_me: res.liked, like_count: res.like_count }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dar like");
    }
  };

  const report = async (commentId: number) => {
    if (!accessToken) return;
    try {
      await apiClient(`/comments/${commentId}/report`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ reason: "spam" }),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reportar");
    }
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
        <h2 {...sectionTitle}>{t.aboutMe}</h2>
        {data.profile.bio ? (
          <p className="max-w-3xl text-base leading-relaxed" style={{ color: "var(--profile-muted)" }}>
            {data.profile.bio}
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--profile-faint)" }}>
            {data.is_owner ? t.noBioOwner : t.noBio}
          </p>
        )}
      </section>

      <section>
        <h2 {...sectionTitle}>{t.skills}</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--profile-faint)" }}>
              {t.noSkills}
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
        <h2 {...sectionTitle}>{t.comments}</h2>
        <form onSubmit={onComment} className="mb-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.commentPlaceholder}
            className="min-h-24"
            style={{
              borderColor: "var(--profile-border)",
              background: "var(--profile-panel)",
              color: "var(--profile-fg)",
            }}
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
          >
            {pending ? t.commentPending : t.commentSubmit}
          </Button>
        </form>
        {comments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--profile-faint)" }}>
            {t.noComments}
          </p>
        ) : null}
        <ul className="space-y-3">
          {comments.map((c) => (
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
              <div className="mt-2 flex gap-3 text-xs">
                <button
                  type="button"
                  disabled={!accessToken}
                  onClick={() => void toggleLike(c)}
                  className="underline-offset-2 hover:underline disabled:opacity-40"
                  style={{ color: "var(--profile-accent)" }}
                >
                  {c.liked_by_me ? "Quitar like" : "Like"} · {c.like_count ?? 0}
                </button>
                {accessToken && user?.id !== c.author_id ? (
                  <button
                    type="button"
                    onClick={() => void report(c.id)}
                    className="underline-offset-2 hover:underline"
                    style={{ color: "var(--profile-faint)" }}
                  >
                    Reportar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
