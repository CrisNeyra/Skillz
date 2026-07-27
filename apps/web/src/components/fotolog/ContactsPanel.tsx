"use client";

import type { ReactNode } from "react";
import { GitBranch, Link2, Mail } from "lucide-react";
import type { LinkOut } from "@/types/api";

type ContactsPanelProps = {
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  contactEmail?: string | null;
  links?: LinkOut[];
  isOwner?: boolean;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.53-8.622L1.99 2.25h6.182l4.186 5.464L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function pickXLink(links: LinkOut[] | undefined): LinkOut | null {
  if (!links?.length) return null;
  return (
    links.find((l) => {
      const label = l.label.toLowerCase();
      const url = l.url.toLowerCase();
      return (
        label === "x" ||
        label.includes("twitter") ||
        url.includes("twitter.com") ||
        url.includes("x.com/")
      );
    }) ?? null
  );
}

type ContactItem = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  external: boolean;
};

export function ContactsPanel({
  linkedinUrl,
  githubUrl,
  contactEmail,
  links = [],
  isOwner,
}: ContactsPanelProps) {
  const xLink = pickXLink(links);

  const items: ContactItem[] = [
    linkedinUrl
      ? {
          key: "linkedin",
          href: linkedinUrl,
          label: "Linkedin",
          icon: <Link2 className="size-4 shrink-0" />,
          external: true,
        }
      : null,
    contactEmail
      ? {
          key: "email",
          href: `mailto:${contactEmail}`,
          label: "email",
          icon: <Mail className="size-4 shrink-0" />,
          external: false,
        }
      : null,
    githubUrl
      ? {
          key: "github",
          href: githubUrl,
          label: "github",
          icon: <GitBranch className="size-4 shrink-0" />,
          external: true,
        }
      : null,
    xLink
      ? {
          key: "x",
          href: xLink.url,
          label: "X",
          icon: <XIcon className="size-4 shrink-0" />,
          external: true,
        }
      : null,
  ].filter(Boolean) as ContactItem[];

  return (
    <aside
      className="flex h-full min-h-[12rem] flex-col justify-start gap-3 rounded-md p-4 md:min-h-0"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.2em] md:text-xs"
        style={{ color: "var(--profile-faint)" }}
      >
        Contactos
      </p>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--profile-muted)" }}>
          {isOwner
            ? "Agregá LinkedIn, email, GitHub y X desde Personalizar."
            : "Sin contactos públicos."}
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-[#6d28d9]/10"
                style={{ color: "var(--profile-accent)" }}
              >
                {item.icon}
                <span className="truncate capitalize">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
