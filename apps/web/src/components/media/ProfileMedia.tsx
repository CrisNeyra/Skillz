"use client";

import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
};

export function ProfileMedia({ src, alt, className, fill = true, sizes, priority }: Props) {
  const isLocal =
    src.includes("localhost") || src.includes("127.0.0.1") || src.startsWith("/");
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes ?? "100vw"}
      priority={priority}
      unoptimized={isLocal}
      className={className}
    />
  );
}
