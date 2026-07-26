"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomizerPanel } from "@/components/customizer/CustomizerPanel";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import type { ProfileBundle } from "@/types/api";

export default function CustomizerPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProfileBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !accessToken) {
      router.replace("/entrar");
      return;
    }
    apiClient<ProfileBundle>(`/profiles/${user.username}`, { token: accessToken })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, [user, accessToken, loading, router]);

  if (loading || (!data && !error)) {
    return <p className="p-8 text-[#1a1025]/50">Cargando customizer…</p>;
  }
  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!data) return null;
  return <CustomizerPanel initial={data} />;
}
