"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import { uploadMediaSlot } from "@/lib/upload";
import type { ProfileBundle } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LandingHero } from "@/components/landing/LandingHero";

const SLOTS = [
  { id: "hero", label: "Hero / Reel (imagen o video)" },
  { id: "left_1", label: "Galería izquierda 1" },
  { id: "left_2", label: "Galería izquierda 2" },
  { id: "left_3", label: "Galería izquierda 3" },
  { id: "flyer", label: "Flyer (banner)" },
] as const;

export default function HomePage() {
  const { user, accessToken, loading, getAccessToken } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [provider, setProvider] = useState<"cloudinary" | "local">("local");
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState({
    linkedin_url: "",
    github_url: "",
    contact_email: "",
  });

  useEffect(() => {
    apiClient<{ provider: "cloudinary" | "local" }>("/media/status")
      .then((s) => setProvider(s.provider))
      .catch(() => setProvider("local"));
  }, []);

  useEffect(() => {
    if (!user || !accessToken) {
      setProfile(null);
      return;
    }
    apiClient<ProfileBundle>(`/profiles/${user.username}`, { token: accessToken })
      .then((data) => {
        setProfile(data);
        setContacts({
          linkedin_url: data.profile.linkedin_url ?? "",
          github_url: data.profile.github_url ?? "",
          contact_email: data.profile.contact_email ?? "",
        });
      })
      .catch(() => setProfile(null));
  }, [user, accessToken]);

  const onUpload = async (slot: string, file: File | null) => {
    if (!file) return;
    setBusySlot(slot);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, slot, file, getAccessToken);
      setMessage(`Listo: ${slot}`);
      router.refresh();
      if (user) {
        const fresh = await getAccessToken();
        const data = await apiClient<ProfileBundle>(`/profiles/${user.username}`, {
          token: fresh,
        });
        setProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setBusySlot(null);
    }
  };

  const saveContacts = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getAccessToken();
      const data = await apiClient<ProfileBundle>("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          linkedin_url: contacts.linkedin_url || null,
          github_url: contacts.github_url || null,
          contact_email: contacts.contact_email || null,
        }),
      });
      setProfile(data);
      setMessage("Contactos guardados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  if (loading) {
    return <p className="p-8 text-[#1a1025]/50">Cargando…</p>;
  }

  if (!user) {
    return <LandingHero />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold text-[#1a1025]"
          style={{ fontFamily: "var(--font-skillz-display), serif" }}
        >
          Home · Studio
        </h1>
        <p className="mt-2 text-sm text-[#1a1025]/60">
          Subí imágenes y videos reel acá. Storage:{" "}
          <span className="font-medium text-[#6d28d9]">
            {provider === "cloudinary" ? "Cloudinary" : "local (sin Cloudinary)"}
          </span>
          {profile ? (
            <>
              {" · "}
              <Link href={`/u/${user.username}`} className="text-[#6d28d9] underline-offset-4 hover:underline">
                Ver perfil
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <section className="mb-10 space-y-4 rounded-md border border-[#6d28d9]/20 bg-white p-5 shadow-sm">
        <h2 className="text-sm uppercase tracking-[0.18em] text-[#1a1025]/45">Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SLOTS.map((slot) => (
            <div key={slot.id} className="space-y-2">
              <Label className="text-[#1a1025]/80">{slot.label}</Label>
              <Input
                type="file"
                accept={
                  slot.id === "flyer"
                    ? "image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg"
                    : "image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.mp4"
                }
                disabled={busySlot === slot.id}
                onChange={(e) => void onUpload(slot.id, e.target.files?.[0] ?? null)}
                className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
              />
            </div>
          ))}
        </div>
        {profile?.layout.hero ? (
          <div className="overflow-hidden rounded-md border border-[#6d28d9]/15">
            {profile.layout.hero.media_type === "video" ? (
              <video
                src={profile.layout.hero.url}
                className="aspect-video w-full object-cover"
                controls
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.layout.hero.url}
                alt="Hero preview"
                className="aspect-video w-full object-cover"
              />
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-[#6d28d9]/20 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm uppercase tracking-[0.18em] text-[#1a1025]/45">
          Contactos (panel derecho del perfil)
        </h2>
        <form onSubmit={saveContacts} className="space-y-3">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              value={contacts.linkedin_url}
              onChange={(e) => setContacts((c) => ({ ...c, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
          </div>
          <div className="space-y-2">
            <Label>GitHub (opcional)</Label>
            <Input
              value={contacts.github_url}
              onChange={(e) => setContacts((c) => ({ ...c, github_url: e.target.value }))}
              placeholder="https://github.com/..."
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={contacts.contact_email}
              onChange={(e) => setContacts((c) => ({ ...c, contact_email: e.target.value }))}
              placeholder="hola@email.com"
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
          </div>
          <Button type="submit" className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]">
            Guardar contactos
          </Button>
        </form>
      </section>

      {message ? <p className="mt-4 text-sm text-[#6d28d9]">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {busySlot ? (
        <p className="mt-2 text-sm text-[#1a1025]/50">Subiendo {busySlot}…</p>
      ) : null}
    </div>
  );
}
