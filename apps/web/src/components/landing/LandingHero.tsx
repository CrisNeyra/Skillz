"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LanguageFooter } from "@/components/auth/AuthLanguageFooter";
import { SkillzLogo } from "@/components/brand/SkillzLogo";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type TileSlot = {
  id: string;
  alt: string;
  className: string;
  sizes: string;
};

const TILE_SLOTS: TileSlot[] = [
  {
    id: "a",
    alt: "Jóvenes profesionales conectando",
    className: "col-span-2 row-span-2 min-h-[200px] md:min-h-[280px] lg:min-h-[320px]",
    sizes: "(max-width: 1024px) 66vw, 40vw",
  },
  {
    id: "b",
    alt: "Chat entre postulante y reclutador",
    className: "col-span-1 row-span-2 min-h-[200px] md:min-h-[280px] lg:min-h-[320px]",
    sizes: "(max-width: 1024px) 33vw, 20vw",
  },
  {
    id: "c",
    alt: "Celebración de graduación",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
    sizes: "(max-width: 1024px) 33vw, 20vw",
  },
  {
    id: "d",
    alt: "Dashboard de portfolio",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
    sizes: "(max-width: 1024px) 33vw, 20vw",
  },
  {
    id: "e",
    alt: "Equipo joven trabajando juntos",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
    sizes: "(max-width: 1024px) 33vw, 20vw",
  },
];

const IMAGE_KEYS = [
  "handshake.png",
  "chat-ui.png",
  "graduation.png",
  "portfolio-ui.png",
  "team.png",
] as const;

const SETS = ["set0", "set1", "set2"] as const;
const INTERVAL_MS = 3000;
const CROSSFADE_MS = 0.95;

type PoolImage = { src: string; alt: string };

type AssignedTile = {
  slotId: string;
  src: string;
  alt: string;
  className: string;
  sizes: string;
};

const IMAGE_POOL: PoolImage[] = SETS.flatMap((setId) =>
  IMAGE_KEYS.map((key, index) => ({
    src: `/landing/${setId}/${key}`,
    alt: TILE_SLOTS[index % TILE_SLOTS.length].alt,
  })),
);

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildInitialAssignment(): AssignedTile[] {
  const picked = shuffle(IMAGE_POOL).slice(0, TILE_SLOTS.length);
  return TILE_SLOTS.map((slot, i) => ({
    slotId: slot.id,
    src: picked[i].src,
    alt: picked[i].alt,
    className: slot.className,
    sizes: slot.sizes,
  }));
}

/** Cambia solo 1 o 2 tiles por ciclo para evitar un flash total. */
function advancePartial(current: AssignedTile[]): AssignedTile[] {
  const changeCount = Math.random() < 0.55 ? 1 : 2;
  const slotIndexes = shuffle(current.map((_, i) => i)).slice(0, changeCount);
  const used = new Set(current.map((t) => t.src));
  let candidates = shuffle(IMAGE_POOL.filter((img) => !used.has(img.src)));
  if (candidates.length < changeCount) {
    candidates = shuffle(IMAGE_POOL.filter((img) => !slotIndexes.some((i) => current[i].src === img.src)));
  }

  return current.map((tile, index) => {
    if (!slotIndexes.includes(index)) return tile;
    const next = candidates.shift();
    if (!next) return tile;
    return { ...tile, src: next.src, alt: next.alt };
  });
}

function CollageTile({
  src,
  alt,
  className,
  sizes,
  priority,
  reduceMotion,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#ede9fe] shadow-[0_14px_44px_rgba(109,40,217,0.16)]",
        className,
      )}
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={src}
          initial={
            reduceMotion
              ? false
              : { opacity: 0, filter: "blur(10px)", scale: 1.04 }
          }
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={
            reduceMotion
              ? undefined
              : { opacity: 0, filter: "blur(8px)", scale: 1.02 }
          }
          transition={{ duration: CROSSFADE_MS, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute inset-0"
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: [1.06, 1.14],
                    x: ["0%", "-1.5%"],
                    y: ["0%", "1%"],
                  }
            }
            transition={{
              duration: 7.5,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover"
            />
          </motion.div>
          <div aria-hidden className="absolute inset-0 bg-[#6d28d9]/15 mix-blend-multiply" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#6d28d9]/20 via-transparent to-white/5"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function LandingHero() {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();
  const [tiles, setTiles] = useState<AssignedTile[]>(() => buildInitialAssignment());
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      setTabHidden(document.visibilityState === "hidden");
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reduceMotion || hovered || tabHidden) return;
    const id = window.setInterval(() => {
      setTiles((prev) => advancePartial(prev));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, hovered, tabHidden]);

  const collage = useMemo(
    () =>
      tiles.map((tile, index) => (
        <CollageTile
          key={tile.slotId}
          src={tile.src}
          alt={tile.alt}
          className={tile.className}
          sizes={tile.sizes}
          priority={index < 2}
          reduceMotion={reduceMotion}
        />
      )),
    [tiles, reduceMotion],
  );

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 12% 8%, rgba(109,40,217,0.18), transparent 55%), radial-gradient(ellipse 55% 45% at 88% 70%, rgba(167,139,250,0.22), transparent 50%), linear-gradient(180deg, #ffffff 0%, #faf5ff 50%, #ffffff 100%)",
        }}
      />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center gap-8 px-5 py-10 lg:px-8 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)] lg:gap-10">
          <div className="max-w-lg">
            <SkillzLogo size="lg" className="mb-8" />
            <h1
              className="text-5xl font-semibold leading-[1.05] tracking-tight text-[#1a1025] md:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
            >
              Skillz
            </h1>
            <p className="mt-5 max-w-md text-lg text-[#1a1025]/65 md:text-xl">
              {t.landingTagline}
            </p>
          </div>

          <div
            aria-hidden
            className="relative min-h-[420px] md:min-h-[520px]"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-5">{collage}</div>
          </div>
        </div>

        <LanguageFooter compact className="mt-2 w-full max-w-7xl" />
      </section>
    </div>
  );
}
