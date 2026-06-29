'use client'

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"
import { AbilityProvider } from "./AbilityProvider"
import { QueryProvider } from "./QueryProvider"
import SupportChatbot from "@/components/global/SupportChatbot"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
