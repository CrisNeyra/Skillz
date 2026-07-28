"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import type { ProfileBundle } from "@/types/api";
import { LandingHero } from "@/components/landing/LandingHero";
import { FotologLayout } from "@/components/fotolog/FotologLayout";

export default function HomePage() {
  const { user, accessToken, loading } = useAuth();
  const { t } = useLocale();
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      setProfile(null);
      return;
    }
    setError(null);
    apiClient<ProfileBundle>(`/profiles/${user.username}`, { token: accessToken })
      .then((data) => {
        if (!data.onboarding_completed) {
          window.location.href = "/onboarding";
          return;
        }
        setProfile({ ...data, is_owner: true });
      })
      .catch((err) => {
        setProfile(null);
        setError(err instanceof Error ? err.message : "No se pudo cargar tu perfil");
      });
  }, [user, accessToken]);

  if (loading) {
    return <p className="p-8 text-[#1a1025]/50">Cargando…</p>;
  }

  if (!user) {
    return <LandingHero />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          href="/settings/customizer"
          className="mt-4 inline-block text-sm text-[#6d28d9] underline-offset-4 hover:underline"
        >
          {t.navCustomize}
        </Link>
      </div>
    );
  }

  if (!profile) {
    return <p className="p-8 text-[#1a1025]/50">Cargando…</p>;
  }

  return (
    <div>
      <div className="border-b border-[#6d28d9]/15 bg-white/90 px-4 py-2 text-center text-xs text-[#1a1025]/65 backdrop-blur md:text-sm">
        {t.homeStrip} ·{" "}
        <Link
          href="/settings/customizer"
          className="font-medium text-[#6d28d9] underline-offset-4 hover:underline"
        >
          {t.homeCustomize}
        </Link>
        {" · "}
        <Link
          href={`/u/${user.username}`}
          className="font-medium text-[#6d28d9] underline-offset-4 hover:underline"
        >
          {t.homePublic}
        </Link>
      </div>
      <FotologLayout data={profile} />
    </div>
  );
}
