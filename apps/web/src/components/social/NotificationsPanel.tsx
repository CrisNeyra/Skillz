"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import type { NotificationOut } from "@/types/api";
import { Button } from "@/components/ui/button";

export function NotificationsPanel() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<NotificationOut[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient<NotificationOut[]>("/notifications", { token: accessToken })
      .then(setItems)
      .catch(() => setItems([]));
  }, [accessToken]);

  const markAll = async () => {
    if (!accessToken) return;
    await apiClient("/notifications/read-all", { method: "POST", token: accessToken });
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-2xl font-semibold text-[#1a1025]"
          style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
        >
          Notificaciones
        </h1>
        <Button
          type="button"
          variant="outline"
          className="border-[#6d28d9]/30 text-[#6d28d9]"
          onClick={() => void markAll()}
        >
          Marcar leídas
        </Button>
      </div>
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
      {items.length === 0 ? (
        <p className="text-sm text-[#1a1025]/50">Sin notificaciones todavía.</p>
      ) : null}
    </div>
  );
}
