import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { FotologLayout } from "@/components/fotolog/FotologLayout";
import { apiServer } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, apiBase } from "@/lib/auth-cookies";
import type { ProfileBundle } from "@/types/api";

type Props = { params: Promise<{ username: string }> };

async function resolveAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) return access;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  try {
    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  } catch {
    return null;
  }
}

async function loadProfile(username: string): Promise<ProfileBundle | null> {
  const token = await resolveAccessToken();
  try {
    return await apiServer<ProfileBundle>(`/profiles/${username}`, {
      token,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) {
    return { title: `${username} · Skillz` };
  }
  const title = `${data.profile.display_name} · Skillz`;
  const description =
    data.profile.bio?.slice(0, 160) ||
    data.profile.headline ||
    `Perfil de ${data.profile.display_name} en Skillz`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/u/${username}`,
      images: data.customization.flyer_url
        ? [{ url: data.customization.flyer_url }]
        : undefined,
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();
  return <FotologLayout data={data} />;
}
