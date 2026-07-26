import type { CSSProperties } from "react";
import type { Customization } from "@/types/api";

const FONT_CSS: Record<string, string> = {
  "Space Grotesk": '"Space Grotesk", sans-serif',
  "DM Sans": '"DM Sans", sans-serif',
  "Instrument Serif": '"Instrument Serif", serif',
  "IBM Plex Mono": '"IBM Plex Mono", monospace',
  Outfit: '"Outfit", sans-serif',
  Sora: '"Sora", sans-serif',
  Fraunces: '"Fraunces", serif',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isLightColor(hex: string | null | undefined): boolean {
  const rgb = hexToRgb(hex ?? "#ffffff");
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62;
}

export function buildProfileStyle(customization: Customization): CSSProperties {
  const font = FONT_CSS[customization.font_family] ?? FONT_CSS["Space Grotesk"];
  const light = isLightColor(customization.bg_color);
  const style: CSSProperties & Record<string, string> = {
    "--profile-bg": customization.bg_color ?? "#ffffff",
    "--profile-font": font,
    "--profile-fg": light ? "#1a1025" : "#f4f1ea",
    "--profile-muted": light ? "rgba(26,16,37,0.62)" : "rgba(244,241,234,0.7)",
    "--profile-faint": light ? "rgba(26,16,37,0.4)" : "rgba(244,241,234,0.45)",
    "--profile-border": light ? "rgba(109,40,217,0.22)" : "rgba(255,255,255,0.15)",
    "--profile-panel": light ? "rgba(109,40,217,0.06)" : "rgba(0,0,0,0.25)",
    "--profile-accent": "#6d28d9",
    backgroundColor: "var(--profile-bg)",
    fontFamily: "var(--profile-font)",
    color: "var(--profile-fg)",
  };
  if (customization.bg_image_url) {
    style.backgroundImage = light
      ? `linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.88)), url(${customization.bg_image_url})`
      : `linear-gradient(rgba(10,12,16,0.55), rgba(10,12,16,0.75)), url(${customization.bg_image_url})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundAttachment = "fixed";
  }
  return style;
}

export function googleFontsHref(fontFamily: string): string | null {
  const map: Record<string, string> = {
    "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
    "DM Sans": "DM+Sans:wght@400;500;600;700",
    "Instrument Serif": "Instrument+Serif",
    "IBM Plex Mono": "IBM+Plex+Mono:wght@400;500",
    Outfit: "Outfit:wght@400;500;600;700",
    Sora: "Sora:wght@400;500;600;700",
    Fraunces: "Fraunces:wght@400;600;700",
  };
  const q = map[fontFamily];
  if (!q) return null;
  return `https://fonts.googleapis.com/css2?family=${q}&display=swap`;
}
