"use client";

type Props = {
  displayName: string;
  specialty: string | null;
  meta: string | null;
};

/** Barra: nombre, especialidad y meta (ubicación / edad si existe). */
export function ProfileInfoBar({ displayName, specialty, meta }: Props) {
  const parts = [displayName, specialty, meta].filter(
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
