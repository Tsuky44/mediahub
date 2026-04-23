import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Media Dashboard",
  description: "Next.js Media Dashboard",
  icons: {
    icon: "/logo.png",
  },
};

import { ImpersonationBanner } from "@/components/global/ImpersonationBanner";
import { startStatsScheduler } from "@/lib/services/stats-scheduler";

if (process.env.NEXT_RUNTIME === 'nodejs') {
  startStatsScheduler();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runtime environment variables injection
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || process.env.TRACKER_WS_URL || '';

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = { TRACKER_WS_URL: '${trackerUrl}' };`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ImpersonationBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
