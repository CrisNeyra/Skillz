"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import type { NotificationOut } from "@/types/api";
import { Button } from "@/components/ui/button";

export function NotificationsPanel() {
  const { accessToken, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiClient<NotificationOut[]>("/notifications", { token: accessToken })
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : t.notifError))
      .finally(() => setLoading(false));
  }, [accessToken, t.notifError]);

  const markAll = async () => {
    if (!accessToken) return;
    try {
      await apiClient("/notifications/read-all", { method: "POST", token: accessToken });
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.notifError);
    }
  };

  if (authLoading) {
    return <p className="p-6 text-sm text-[#1a1025]/50">{t.loading}</p>;
  }

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1a1025]" style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}>
          {t.notifTitle}
        </h1>
        <p className="text-sm text-[#1a1025]/60">{t.notifLogin}</p>
        <Link href="/login" className="text-sm text-[#6d28d9] underline-offset-4 hover:underline">
          {t.navLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-2xl font-semibold text-[#1a1025]"
          style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
        >
          {t.notifTitle}
        </h1>
        <Button
          type="button"
          variant="outline"
          className="border-[#6d28d9]/30 text-[#6d28d9]"
          onClick={() => void markAll()}
        >
          {t.notifMark}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-[#1a1025]/50">{t.notifLoading}</p> : null}
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-md border p-4 text-sm ${
              n.read_at
                ? "border-[#6d28d9]/10 bg-white text-[#1a1025]/70"
                : "border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            }`}
          >
            <p>{n.body}</p>
            {n.actor_username ? (
              <Link
                href={`/u/${n.actor_username}`}
                className="mt-1 inline-block text-xs text-[#6d28d9] underline-offset-4 hover:underline"
              >
                @{n.actor_username}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {!loading && items.length === 0 && !error ? (
        <p className="text-sm text-[#1a1025]/50">{t.notifEmpty}</p>
      ) : null}
    </div>
  );
}
