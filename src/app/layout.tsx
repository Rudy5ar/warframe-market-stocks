import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";

import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Tenno Desk — Warframe Market Companion",
    template: "%s — Tenno Desk",
  },
  description:
    "Second-monitor Warframe.market companion: honest liquidity-backed deals, Syndicate standing value, Baro Ducats per plat, Relics EV, and Mod Stash.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
      >
        <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
          <SiteHeader />
          <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
            <div className="mx-auto max-w-[1220px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
