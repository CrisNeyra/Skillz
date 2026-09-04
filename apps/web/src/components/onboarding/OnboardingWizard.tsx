"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { apiClient } from "@/lib/api";
import { uploadMediaSlot } from "@/lib/upload";
import type { ProfileCoach } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingWizard() {
  const { getAccessToken, user, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skill, setSkill] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [coach, setCoach] = useState<ProfileCoach | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const boot = async () => {
      try {
        const token = await getAccessToken();
        const c = await apiClient<ProfileCoach>("/ai/profile-coach", { token });
        setCoach(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el coach");
      }
    };
    void boot();
  }, [getAccessToken, loading, router, user]);

  if (loading || !user) {
    return <p className="p-6 text-sm text-[#1a1025]/60">{loading ? t.loading : t.onboardingLogin}</p>;
  }

  const uploadFlyer = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, "flyer", file, getAccessToken);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload falló");
    } finally {
      setBusy(false);
    }
  };

  const saveCopy = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!headline.trim() && !bio.trim()) {
        const sug = await apiClient<{ headline: string; bio: string }>("/ai/suggest-profile-copy", {
          method: "POST",
          token,
          body: JSON.stringify({ tone: "formal" }),
        });
        setHeadline(sug.headline);
        setBio(sug.bio);
      }
      await apiClient("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ headline: headline || null, bio: bio || null }),
      });
      const skillSug = await apiClient<{ skills: string[] }>("/ai/suggest-skills", {
        method: "POST",
        token,
      });
      setSuggested(skillSug.skills);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const addSkill = async (e: FormEvent) => {
    e.preventDefault();
    const name = skill.trim() || suggested[0];
    if (!name) return;
    const token = await getAccessToken();
    await apiClient("/profiles/me/skills", {
      method: "POST",
      token,
      body: JSON.stringify({ name, level: 3 }),
    });
    setSkills((s) => [...s, name]);
    setSkill("");
    setSuggested((list) => list.filter((x) => x.toLowerCase() !== name.toLowerCase()));
  };

  const finish = async () => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      await apiClient("/profiles/me/onboarding/complete", { method: "POST", token });
      router.push(user ? `/u/${user.username}` : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6d28d9]/70">
          Onboarding · paso {step + 1} / 3
        </p>
        <h1
          className="mt-2 text-3xl font-semibold text-[#1a1025]"
          style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
        >
          Armá tu primera impresión
        </h1>
        {coach ? (
          <p className="mt-2 text-sm text-[#1a1025]/55">
            Score actual: {coach.score}/100
            {coach.tips[0] ? ` — ${coach.tips[0]}` : ""}
          </p>
        ) : null}
      </div>

      {step === 0 ? (
        <div className="space-y-3 rounded-md border border-[#6d28d9]/20 bg-white p-6">
          <Label>Flyer / banner</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => void uploadFlyer(e.target.files?.[0] ?? null)}
            className="border-[#6d28d9]/25 bg-[#faf5ff]"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-[#6d28d9]/30 text-[#6d28d9]"
            onClick={() => setStep(1)}
          >
            Saltar por ahora
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3 rounded-md border border-[#6d28d9]/20 bg-white p-6">
          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
          </div>
          <Button
            type="button"
            disabled={busy}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
            onClick={() => void saveCopy()}
          >
            {busy ? "Guardando…" : "Guardar y sugerir skills"}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3 rounded-md border border-[#6d28d9]/20 bg-white p-6">
          <Label>Skills (mín. 1 recomendado)</Label>
          <form onSubmit={addSkill} className="flex gap-2">
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Nueva skill"
              className="border-[#6d28d9]/25 bg-[#faf5ff]"
            />
            <Button type="submit" variant="outline" className="border-[#6d28d9]/30 text-[#6d28d9]">
              Agregar
            </Button>
          </form>
          {suggested.length ? (
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-md border border-[#6d28d9]/25 px-2 py-1 text-xs text-[#6d28d9]"
                  onClick={() => {
                    setSkill(s);
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="text-sm text-[#1a1025]/70">
            {skills.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
          <Button
            type="button"
            disabled={busy}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
            onClick={() => void finish()}
          >
            Listo, ver mi perfil
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
