"use client";

type Props = {
  specialty: string | null;
  meta: string | null;
};

/** Barra: especialidad y ubicación (el nombre va en el h1). */
export function ProfileInfoBar({ specialty, meta }: Props) {
  const parts = [specialty, meta].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return (
    <div
      className="w-full rounded-md px-4 py-3 text-center md:px-6"
      style={{
        border: "1px solid var(--profile-border)",
        background: "var(--profile-panel)",
      }}
    >
      <p className="text-sm font-medium tracking-wide md:text-base">
        {parts.length > 0 ? parts.join(" · ") : "Nombre, especialidad, ubicación"}
      </p>
    </div>
  );
}
