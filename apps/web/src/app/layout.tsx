import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Outfit, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LocaleProvider, type Locale } from "@/components/providers/locale-provider";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-skillz-body",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-skillz-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skillz — Showcase profesional",
  description: "Tu lugar para tus Skillz, oportunidades para quedarse.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const cookieLocale = jar.get("skillz_locale")?.value;
  const initialLocale: Locale =
    cookieLocale === "en" ||
    cookieLocale === "es" ||
    cookieLocale === "pt" ||
    cookieLocale === "fr" ||
    cookieLocale === "it" ||
    cookieLocale === "de"
      ? cookieLocale
      : "es";

  return (
    <html
      lang={initialLocale}
      className={`${spaceGrotesk.variable} ${outfit.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col bg-white text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-body), sans-serif" }}
      >
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
