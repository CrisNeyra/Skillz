"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import { uploadMediaSlot } from "@/lib/upload";
import type { MediaOut } from "@/types/api";

type UploadableProps = {
  canUpload?: boolean;
  slot?: string;
};

function SlotUploadOverlay({
  slot,
  accept,
  label,
}: {
  slot: string;
  accept: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, slot, file, getAccessToken);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload falló");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--profile-faint)" }}>
        {label}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-md px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
        style={{
          background: "var(--profile-accent)",
          color: "#fff",
        }}
      >
        {busy ? "Subiendo…" : "Subir archivo"}
      </button>
      <p className="text-[10px]" style={{ color: "var(--profile-faint)" }}>
        Imagen o video
      </p>
      {error ? <p className="text-[10px] text-red-500">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/** Flyer compacto: más bajo y menos ancho (como imagen 1) */
export function TopBanner({
  flyerUrl,
  canUpload = false,
}: {
  flyerUrl: string | null;
  canUpload?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, "flyer", file, getAccessToken);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full pt-4 md:pt-5"
    >
      <div className="mx-auto w-full max-w-xl px-4">
        <div
          className="relative h-16 w-full overflow-hidden rounded-md md:h-20"
          style={{
            background:
              "linear-gradient(105deg, #ede9fe 0%, #ddd6fe 45%, #c4b5fd 100%)",
            border: "1px solid var(--profile-border)",
          }}
        >
          {flyerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flyerUrl} alt="Banner del perfil" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.18em] md:text-xs"
              style={{ color: "var(--profile-faint)" }}
            >
              Flyer personalizable
            </div>
          )}
          {canUpload ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur disabled:opacity-50"
              >
                {busy ? "…" : flyerUrl ? "Cambiar flyer" : "Subir flyer"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
              />
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function MediaLikeButton({ media }: { media: MediaOut }) {
  const { accessToken } = useAuth();
  const [liked, setLiked] = useState(Boolean(media.liked_by_me));
  const [count, setCount] = useState(media.like_count ?? 0);

  const toggle = async () => {
    if (!accessToken) return;
    const res = await apiClient<{ liked: boolean; like_count: number }>(
      `/media/${media.id}/like`,
      { method: liked ? "DELETE" : "POST", token: accessToken },
    );
    setLiked(res.liked);
    setCount(res.like_count);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void toggle();
      }}
      disabled={!accessToken}
      className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur disabled:opacity-50"
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}

function MediaThumb({
  media,
  label,
  canUpload,
  slot,
}: {
  media: MediaOut | null;
  label: string;
} & UploadableProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const replace = async (file: File | null) => {
    if (!file || !slot) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, slot, file, getAccessToken);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-md"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      {media ? (
        <>
          {media.media_type === "video" ? (
            <video src={media.url} className="h-full w-full object-cover" muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.caption ?? label} className="h-full w-full object-cover" />
          )}
          <MediaLikeButton media={media} />
          {canUpload && slot ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="absolute left-2 bottom-2 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur disabled:opacity-50"
              >
                {busy ? "…" : "Cambiar"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => void replace(e.target.files?.[0] ?? null)}
              />
            </>
          ) : null}
        </>
      ) : canUpload && slot ? (
        <SlotUploadOverlay slot={slot} accept="image/*,video/*" label={label} />
      ) : (
        <div
          className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider"
          style={{ color: "var(--profile-faint)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function SideGallery({
  side,
  items,
  canUpload = false,
}: {
  side: "left" | "right";
  items: (MediaOut | null)[];
  canUpload?: boolean;
}) {
  const slots = [0, 1, 2].map((i) => items[i] ?? null);
  const emptyLabel = side === "right" ? "Imágenes" : "Galería";
  const slotNames =
    side === "left"
      ? (["left_1", "left_2", "left_3"] as const)
      : (["right_1", "right_2", "right_3"] as const);
  return (
    <div className="flex flex-row gap-2 lg:flex-col lg:gap-3">
      {slots.map((media, i) => (
        <motion.div
          key={`${side}-${i}`}
          whileHover={{ scale: canUpload ? 1 : 1.03 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="min-w-[30%] flex-1 lg:min-w-0"
        >
          <MediaThumb
            media={media}
            label={emptyLabel}
            canUpload={canUpload}
            slot={slotNames[i]}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function SkillsOverlay({
  skills,
}: {
  skills: { name: string; is_verified: boolean }[];
}) {
  if (!skills.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
      <div className="flex flex-wrap gap-2">
        {skills.slice(0, 6).map((s) => (
          <span
            key={s.name}
            className="rounded-md border border-white/30 bg-[#6d28d9]/85 px-2 py-1 text-xs text-white backdrop-blur-sm"
          >
            {s.name}
            {s.is_verified ? " ✓" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MainHeroMedia({
  media,
  skills,
  canUpload = false,
}: {
  media: MediaOut | null;
  skills: { name: string; is_verified: boolean }[];
  canUpload?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-md"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      {media ? (
        media.media_type === "video" ? (
          <video src={media.url} className="h-full w-full object-cover" controls playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.caption ?? "Hero"}
            className="h-full w-full object-cover"
          />
        )
      ) : canUpload ? (
        <SlotUploadOverlay
          slot="hero"
          accept="image/*,video/*"
          label="Main display"
        />
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ color: "var(--profile-faint)" }}
        >
          <p className="text-sm uppercase tracking-[0.25em]">Main display</p>
          <p className="max-w-sm text-sm">
            Subí una imagen o video reel para destacar tu mejor trabajo.
          </p>
        </div>
      )}
      <SkillsOverlay skills={skills} />
      {media ? <MediaLikeButton media={media} /> : null}
      {media && canUpload ? (
        <MediaThumbReplaceHero />
      ) : null}
    </motion.div>
  );
}

function MediaThumbReplaceHero() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const replace = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      await uploadMediaSlot(token, "hero", file, getAccessToken);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="absolute left-2 bottom-2 z-10 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur disabled:opacity-50"
      >
        {busy ? "…" : "Cambiar"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => void replace(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
