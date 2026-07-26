import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${outfit.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col bg-white text-[#1a1025]"
        style={{ fontFamily: "var(--font-skillz-body), sans-serif" }}
      >
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
