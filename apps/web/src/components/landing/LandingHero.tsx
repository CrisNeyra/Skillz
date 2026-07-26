"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SkillzLogo } from "@/components/brand/SkillzLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tile = {
  key: string;
  alt: string;
  className: string;
};

const TILE_LAYOUT: Tile[] = [
  {
    key: "handshake.png",
    alt: "Jóvenes profesionales conectando",
    className: "col-span-2 row-span-2 min-h-[200px] md:min-h-[280px] lg:min-h-[320px]",
  },
  {
    key: "chat-ui.png",
    alt: "Chat entre postulante y reclutador",
    className: "col-span-1 row-span-2 min-h-[200px] md:min-h-[280px] lg:min-h-[320px]",
  },
  {
    key: "graduation.png",
    alt: "Celebración de graduación",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
  },
  {
    key: "portfolio-ui.png",
    alt: "Dashboard de portfolio",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
  },
  {
    key: "team.png",
    alt: "Equipo joven trabajando juntos",
    className: "col-span-1 min-h-[140px] md:min-h-[180px] lg:min-h-[200px]",
  },
];

const SETS = ["set0", "set1", "set2"] as const;

function CollageTile({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#ede9fe] shadow-[0_14px_44px_rgba(109,40,217,0.16)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        style={{ filter: "blur(1px)" }}
      />
      <div aria-hidden className="absolute inset-0 bg-[#6d28d9]/15 mix-blend-multiply" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#6d28d9]/20 via-transparent to-white/5"
      />
    </div>
  );
}

function CollageSet({ setId }: { setId: (typeof SETS)[number] }) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-5">
      {TILE_LAYOUT.map((tile) => (
        <CollageTile
          key={`${setId}-${tile.key}`}
          src={`/landing/${setId}/${tile.key}`}
          alt={tile.alt}
          className={tile.className}
        />
      ))}
    </div>
  );
}

export function LandingHero() {
  const reduceMotion = useReducedMotion();
  const [setIndex, setSetIndex] = useState(0);

  useEffect(() => {
    // Prefetch next sets
    SETS.forEach((setId) => {
      TILE_LAYOUT.forEach((tile) => {
        const img = new window.Image();
        img.src = `/landing/${setId}/${tile.key}`;
      });
    });
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setSetIndex((i) => (i + 1) % SETS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const activeSet = SETS[setIndex];

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

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)] lg:gap-10 lg:px-8 lg:py-14">
        <div className="max-w-lg">
          <SkillzLogo size="lg" className="mb-8" />
          <h1
            className="text-5xl font-semibold leading-[1.05] tracking-tight text-[#1a1025] md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
          >
            Skillz
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#1a1025]/65 md:text-xl">
            Tu lugar para tus Skillz, Oportunidades para quedarse.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-xl bg-[#6d28d9] px-6 text-white hover:bg-[#5b21b6]",
              )}
            >
              Registrarse
            </Link>
            <Link
              href="/entrar"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-xl border-[#6d28d9]/30 text-[#6d28d9] hover:bg-[#6d28d9]/10",
              )}
            >
              Entrar solo con nombre
            </Link>
          </div>
        </div>

        <div aria-hidden className="relative min-h-[420px] md:min-h-[520px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSet}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <CollageSet setId={activeSet} />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
