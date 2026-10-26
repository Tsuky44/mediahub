'use client'

import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"
import { Toaster } from "react-hot-toast"
import { AbilityProvider } from "./AbilityProvider"
import { QueryProvider } from "./QueryProvider"
import SupportChatbot from "@/components/global/SupportChatbot"

// `session` est résolue côté serveur (layout racine) : useSession() et les permissions
// (navbar, <Can>) sont disponibles dès le premier rendu, sans aller-retour /api/auth/session.
export function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <AbilityProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#fff',
                border: '1px solid #27272a',
              },
            }}
          />
          <SupportChatbot />
        </AbilityProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
