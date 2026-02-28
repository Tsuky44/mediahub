'use client'

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"
import { AbilityProvider } from "./AbilityProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
      </AbilityProvider>
    </SessionProvider>
  )
}
