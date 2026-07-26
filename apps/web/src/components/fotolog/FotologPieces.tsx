"use client";

import { motion } from "framer-motion";
import type { MediaOut } from "@/types/api";

/** Flyer compacto: más bajo y menos ancho (como imagen 1) */
export function TopBanner({ flyerUrl }: { flyerUrl: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full pt-4 md:pt-5"
    >
      <div className="mx-auto w-full max-w-xl px-4">
        <div
          className="h-16 w-full overflow-hidden rounded-md md:h-20"
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
        </div>
      </div>
    </motion.div>
  );
}

function MediaThumb({ media, label }: { media: MediaOut | null; label: string }) {
  return (
    <div
      className="aspect-square w-full overflow-hidden rounded-md"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      {media ? (
        media.media_type === "video" ? (
          <video src={media.url} className="h-full w-full object-cover" muted playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.caption ?? label} className="h-full w-full object-cover" />
        )
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
}: {
  side: "left" | "right";
  items: (MediaOut | null)[];
}) {
  const slots = [0, 1, 2].map((i) => items[i] ?? null);
  return (
    <div className="flex flex-row gap-2 md:flex-col md:gap-3">
      {slots.map((media, i) => (
        <motion.div
          key={`${side}-${i}`}
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="min-w-[30%] flex-1 md:min-w-0"
        >
          <MediaThumb media={media} label={`${side} ${i + 1}`} />
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
}: {
  media: MediaOut | null;
  skills: { name: string; is_verified: boolean }[];
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
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ color: "var(--profile-faint)" }}
        >
          <p className="text-sm uppercase tracking-[0.25em]">Main display</p>
          <p className="max-w-sm text-sm">
            Subí una imagen o video reel desde Home para destacar tu mejor trabajo.
          </p>
        </div>
      )}
      <SkillsOverlay skills={skills} />
    </motion.div>
  );
}
