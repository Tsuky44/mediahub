'use client'

import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"
import { Toaster } from "react-hot-toast"
import { AbilityProvider } from "./AbilityProvider"
import { QueryProvider } from "./QueryProvider"
import { DeploymentGuard } from "./DeploymentGuard"
import SupportChatbot from "@/components/global/SupportChatbot"

// `session` est résolue côté serveur (layout racine) : useSession() et les permissions
// (navbar, <Can>) sont disponibles dès le premier rendu, sans aller-retour /api/auth/session.
export function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <DeploymentGuard />
      <QueryProvider>
        <AbilityProvider>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'rgb(30 32 32 / 0.92)',
                color: '#f2f0ed',
                border: '1px solid rgb(232 230 228 / 0.12)',
                borderRadius: '16px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 30px 60px rgb(0 0 0 / 0.5)',
              },
              success: { iconTheme: { primary: '#f2f0ed', secondary: '#0c0d0d' } },
              error: { iconTheme: { primary: '#ffb4ab', secondary: '#0c0d0d' } },
            }}
          />
          <SupportChatbot />
        </AbilityProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
