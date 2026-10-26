import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { getSession } from "@/lib/auth";

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
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
