"use client";

import { LOCALES, useLocale, type Locale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Selector de idiomas reutilizable (login, register, landing). */
export function LanguageFooter({ className, compact = false }: Props) {
  const { locale, setLocale, t } = useLocale();

  return (
    <footer
      className={cn(
        compact
          ? "border-t border-[#6d28d9]/10 pt-5"
          : "mt-10 border-t border-[#6d28d9]/10 pt-6",
        className,
      )}
    >
      {!compact ? (
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#1a1025]/40">
          {t.languages}
        </p>
      ) : null}
      <ul
        className={cn(
          "flex flex-wrap gap-x-4 gap-y-2",
          compact && "justify-center md:justify-start",
        )}
      >
        {LOCALES.map((item) => (
          <li key={item.code}>
            <button
              type="button"
              onClick={() => setLocale(item.code as Locale)}
              className={
                locale === item.code
                  ? "text-sm font-medium text-[#6d28d9]"
                  : "text-sm text-[#1a1025]/55 transition hover:text-[#6d28d9]"
              }
              aria-current={locale === item.code ? "true" : undefined}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </footer>
  );
}

/** Alias para pantallas de auth. */
export function AuthLanguageFooter() {
  return <LanguageFooter />;
}
