"use client";

import { Link2, GitBranch, Mail, type LucideIcon } from "lucide-react";

type ContactsPanelProps = {
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  contactEmail?: string | null;
  isOwner?: boolean;
};

export function ContactsPanel({
  linkedinUrl,
  githubUrl,
  contactEmail,
  isOwner,
}: ContactsPanelProps) {
  const items = [
    linkedinUrl
      ? {
          key: "linkedin",
          href: linkedinUrl,
          label: "LinkedIn",
          icon: Link2,
          external: true,
        }
      : null,
    githubUrl
      ? {
          key: "github",
          href: githubUrl,
          label: "GitHub",
          icon: GitBranch,
          external: true,
        }
      : null,
    contactEmail
      ? {
          key: "email",
          href: `mailto:${contactEmail}`,
          label: contactEmail,
          icon: Mail,
          external: false,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    href: string;
    label: string;
    icon: LucideIcon;
    external: boolean;
  }[];

  return (
    <aside
      className="flex h-full min-h-[12rem] flex-col justify-center gap-3 rounded-md p-4 md:min-h-0"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      <p
        className="text-xs uppercase tracking-[0.2em]"
        style={{ color: "var(--profile-faint)" }}
      >
        Contactos
      </p>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--profile-muted)" }}>
          {isOwner
            ? "Agregá LinkedIn, GitHub y email desde Home."
            : "Sin contactos públicos."}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-[#6d28d9]/10"
                  style={{ color: "var(--profile-accent)" }}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
