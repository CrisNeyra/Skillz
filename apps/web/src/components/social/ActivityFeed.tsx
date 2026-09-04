"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import type { ActivityEvent } from "@/types/api";
import { ProfileMedia } from "@/components/media/ProfileMedia";

export function ActivityFeed() {
  const { accessToken, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (next?: number | null) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const qs = next ? `?cursor=${next}&limit=20` : "?limit=20";
      const data = await apiClient<{ items: ActivityEvent[]; next_cursor: number | null }>(
        `/social/feed${qs}`,
        { token: accessToken },
      );
      setItems((prev) => (next ? [...prev, ...data.items] : data.items));
      setCursor(data.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.feedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    queueMicrotask(() => {
      void load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (authLoading) {
    return <p className="p-6 text-sm text-[#1a1025]/50">{t.loading}</p>;
  }

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1a1025]" style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}>
          {t.feedTitle}
        </h1>
        <p className="text-sm text-[#1a1025]/60">{t.feedLoginCta}</p>
        <Link href="/login" className="text-sm text-[#6d28d9] underline-offset-4 hover:underline">
          {t.navLogin}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-6 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1
        className="text-2xl font-semibold text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
      >
        {t.feedTitle}
      </h1>
      <p className="text-sm text-[#1a1025]/55">{t.feedSubtitle}</p>
      {items.length === 0 && !loading ? (
        <p className="rounded-md border border-[#6d28d9]/15 bg-white p-6 text-sm text-[#1a1025]/60">
          {t.feedEmpty}{" "}
          <Link href="/search" className="text-[#6d28d9] underline-offset-4 hover:underline">
            {t.feedEmptyCta}
          </Link>
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-[#6d28d9]/15 bg-white p-4 text-[#1a1025]"
          >
            <p className="text-sm">{item.summary}</p>
            <p className="mt-1 text-xs text-[#1a1025]/45">
              <Link
                href={`/u/${item.actor_username}`}
                className="text-[#6d28d9] underline-offset-4 hover:underline"
              >
                @{item.actor_username}
              </Link>
              {" · "}
              {new Date(item.created_at).toLocaleString()}
            </p>
            {item.media_url ? (
              <div className="relative mt-3 h-48 w-full overflow-hidden rounded-md">
                <ProfileMedia src={item.media_url} alt="" className="object-cover" sizes="640px" />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {cursor ? (
        <button
          type="button"
          className="text-sm text-[#6d28d9] underline-offset-4 hover:underline"
          onClick={() => void load(cursor)}
          disabled={loading}
        >
          {t.loadMore}
        </button>
      ) : null}
    </div>
  );
}
