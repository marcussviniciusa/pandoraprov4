"use client"

import { SessionProvider } from "next-auth/react"
import { Session } from "next-auth"

export default function AuthSessionProvider({ 
  children,
  session 
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return (
    <SessionProvider 
      session={session}
      refetchInterval={0} // Desabilitar refetch automático que pode causar problemas
      refetchOnWindowFocus={false} // Desabilitar refetch no focus que pode causar loops
      refetchWhenOffline={false} // Não tentar refetch quando offline
    >
      {children}
    </SessionProvider>
  )
} 