import Link from "next/link";
import { cn } from "@/lib/utils";

type SkillzLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-9 w-9 text-lg",
  md: "h-11 w-11 text-xl",
  lg: "h-16 w-16 text-3xl",
};

/** S2 Soft badge: rounded square, medium weight S */
export function SkillzLogo({ className, size = "md" }: SkillzLogoProps) {
  return (
    <Link
      href="/"
      aria-label="Skillz Home"
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-[#6d28d9] font-medium tracking-tight text-white shadow-[0_10px_28px_rgba(109,40,217,0.26)] transition-transform hover:scale-[1.03] active:scale-[0.98]",
        sizes[size],
        className,
      )}
      style={{ fontFamily: "var(--font-skillz-display), sans-serif" }}
    >
      S
    </Link>
  );
}
