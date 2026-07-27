"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import { uploadMediaSlot } from "@/lib/upload";
import { ALLOWED_FONTS, type Customization, type ProfileBundle } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildProfileStyle } from "@/lib/theme";

export function CustomizerPanel({ initial }: { initial: ProfileBundle }) {
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<Customization>(initial.customization);
  const [bio, setBio] = useState(initial.profile.bio ?? "");
  const [headline, setHeadline] = useState(initial.profile.headline ?? "");
  const [location, setLocation] = useState(initial.profile.location ?? "");
  const [contacts, setContacts] = useState({
    linkedin_url: initial.profile.linkedin_url ?? "",
    github_url: initial.profile.github_url ?? "",
    contact_email: initial.profile.contact_email ?? "",
  });
  const [skillName, setSkillName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewStyle = useMemo(() => buildProfileStyle(draft), [draft]);

  const saveTheme = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      await apiClient("/profiles/me/customization", {
        method: "PATCH",
        token,
        body: JSON.stringify(draft),
      });
      await apiClient("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          bio,
          headline,
          location: location || null,
          linkedin_url: contacts.linkedin_url || null,
          github_url: contacts.github_url || null,
          contact_email: contacts.contact_email || null,
        }),
      });
      setMessage("Guardado");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (slot: string, file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const result = await uploadMediaSlot(token, slot, file, getAccessToken);
      if (slot === "flyer") {
        setDraft((d) => ({ ...d, flyer_url: result.url }));
      }
      if (slot === "bg") {
        setDraft((d) => ({ ...d, bg_image_url: result.url }));
      }
      setMessage(`Subido: ${slot}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload falló");
    } finally {
      setBusy(false);
    }
  };

  const addSkill = async (e: FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    const token = await getAccessToken();
    await apiClient("/profiles/me/skills", {
      method: "POST",
      token,
      body: JSON.stringify({ name: skillName, level: 3 }),
    });
    setSkillName("");
    router.refresh();
  };

  const slots = ["hero", "left_1", "left_2", "left_3", "right_1", "right_2", "right_3"];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 rounded-md border border-[#6d28d9]/20 bg-white p-6 text-[#1a1025] shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: '"Fraunces", serif' }}>
            Personalizar perfil
          </h1>
          <p className="mt-1 text-sm text-[#1a1025]/55">
            Fondo, tipografía, flyer y slots Fotolog.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Color de fondo</Label>
          <Input
            type="color"
            value={draft.bg_color ?? "#ffffff"}
            onChange={(e) => setDraft((d) => ({ ...d, bg_color: e.target.value }))}
            className="h-10 w-24 cursor-pointer border-[#6d28d9]/25 bg-transparent p-1"
          />
        </div>

        <div className="space-y-2">
          <Label>Fuente</Label>
          <Select
            value={draft.font_family}
            onValueChange={(v) => {
              if (v) setDraft((d) => ({ ...d, font_family: v }));
            }}
          >
            <SelectTrigger className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_FONTS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Especialidad (headline)</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Ej: Frontend Developer"
            className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
          />
        </div>

        <div className="space-y-2">
          <Label>Ubicación / edad (barra de info)</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Buenos Aires · 24"
            className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
          />
        </div>

        <div className="space-y-2">
          <Label>Bio (Sobre mí)</Label>
          <Input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              value={contacts.linkedin_url}
              onChange={(e) => setContacts((c) => ({ ...c, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={contacts.contact_email}
              onChange={(e) => setContacts((c) => ({ ...c, contact_email: e.target.value }))}
              placeholder="hola@email.com"
              className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            />
          </div>
          <div className="space-y-2">
            <Label>GitHub</Label>
            <Input
              value={contacts.github_url}
              onChange={(e) => setContacts((c) => ({ ...c, github_url: e.target.value }))}
              placeholder="https://github.com/..."
              className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Flyer (banner)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => void onFile("flyer", e.target.files?.[0] ?? null)}
              className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            />
          </div>
          <div className="space-y-2">
            <Label>Imagen de fondo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => void onFile("bg", e.target.files?.[0] ?? null)}
              className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Slots Fotolog (hero + 3 + 3)</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <div key={slot} className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#1a1025]/45">{slot}</p>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => void onFile(slot, e.target.files?.[0] ?? null)}
                  className="border-[#6d28d9]/25 bg-[#faf5ff] text-xs text-[#1a1025]"
                />
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={addSkill} className="flex gap-2">
          <Input
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="Nueva skill"
            className="border-[#6d28d9]/25 bg-[#faf5ff] text-[#1a1025]"
          />
          <Button
            type="submit"
            variant="outline"
            className="border-[#6d28d9]/30 text-[#6d28d9] hover:bg-[#6d28d9]/10"
          >
            Agregar
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => void saveTheme()}
            disabled={busy}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
          >
            {busy ? "Guardando…" : "Guardar tema"}
          </Button>
          {message ? <span className="text-sm text-[#6d28d9]">{message}</span> : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="overflow-hidden rounded-md border border-[#6d28d9]/20"
        style={previewStyle}
      >
        <div className="mx-auto h-16 max-w-xl bg-[#ede9fe] md:h-20">
          {draft.flyer_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.flyer_url} alt="Preview flyer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-[#6d28d9]/50">
              Preview flyer
            </div>
          )}
        </div>
        <div className="p-6">
          <p className="text-2xl font-semibold">{initial.profile.display_name}</p>
          <p style={{ color: "var(--profile-muted)" }}>{headline || "Tu headline aparece acá"}</p>
          <p className="mt-4 text-sm" style={{ color: "var(--profile-muted)" }}>
            {bio || "Tu bio en vivo…"}
          </p>
          <p
            className="mt-6 text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--profile-faint)" }}
          >
            Fuente: {draft.font_family}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
