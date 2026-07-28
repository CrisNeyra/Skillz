"use client";

import type { DiplomaOut, ExperienceOut } from "@/types/api";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  diplomas: DiplomaOut[];
  experiences: ExperienceOut[];
};

export function CareerSidebar({ diplomas, experiences }: Props) {
  const { t } = useLocale();
  return (
    <aside
      className="flex h-full flex-col gap-5 rounded-md p-3 md:p-4"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      <section>
        <h2
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs"
          style={{ color: "var(--profile-faint)" }}
        >
          {t.formation}
        </h2>
        {diplomas.length === 0 ? (
          <p className="text-xs leading-relaxed" style={{ color: "var(--profile-muted)" }}>
            {t.noFormation}
          </p>
        ) : (
          <ul className="space-y-3">
            {diplomas.map((d) => (
              <li key={d.id} className="text-xs leading-snug md:text-sm">
                <p className="font-medium">{d.title}</p>
                {d.issuer ? (
                  <p style={{ color: "var(--profile-muted)" }}>{d.issuer}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="h-px w-full" style={{ background: "var(--profile-border)" }} />

      <section>
        <h2
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs"
          style={{ color: "var(--profile-faint)" }}
        >
          {t.experience}
        </h2>
        {experiences.length === 0 ? (
          <p className="text-xs leading-relaxed" style={{ color: "var(--profile-muted)" }}>
            {t.noExperience}
          </p>
        ) : (
          <ul className="space-y-3">
            {experiences.map((exp) => (
              <li key={exp.id} className="text-xs leading-snug md:text-sm">
                <p className="font-medium">{exp.role}</p>
                <p style={{ color: "var(--profile-muted)" }}>{exp.company}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
