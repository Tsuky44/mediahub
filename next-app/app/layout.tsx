import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { getSession } from "@/lib/auth";
import { PERF_MODE_SCRIPT } from "@/lib/perf-mode";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
});

// Police à chasse fixe : quelques pages seulement (statistiques, téléchargements, réglages). Pas de
// préchargement sur toutes les pages : chargée là où elle sert (Firefox signalait un préchargement inutilisé)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Media Dashboard",
  description: "Next.js Media Dashboard",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runtime environment variables injection
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || process.env.TRACKER_WS_URL || '';
  // Mémoïsée par requête : partagée avec les layouts/pages qui appellent aussi getSession()
  const session = await getSession();

  return (
    <html lang="fr" className={`${bricolage.variable} ${geistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = { TRACKER_WS_URL: '${trackerUrl}' };`
          }}
        />
        {/* Mode allégé des animations retenu pour cette machine, appliqué avant l'affichage */}
        <script dangerouslySetInnerHTML={{ __html: PERF_MODE_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
