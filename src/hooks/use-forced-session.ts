"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useRef } from "react"

interface ForcedSession {
  data: any
  status: "loading" | "authenticated" | "unauthenticated"
  isHydrated: boolean
}

export function useForcedSession(): ForcedSession {
  const { data: session, status } = useSession()
  const [forcedSession, setForcedSession] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasTriedForce, setHasTriedForce] = useState(false)
  
  // Ref para evitar logs repetitivos
  const lastLoggedStatusRef = useRef<string>('')

  // Executa verificação forçada imediatamente no mount
  useEffect(() => {
    console.log('🚀 useForcedSession mounted')
    
    const checkSession = async () => {
      console.log('🔄 Starting immediate session check...')
      
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-cache'
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('📥 Session check result:', {
            hasData: !!data,
            hasUser: !!data?.user,
            userEmail: data?.user?.email,
            userRole: data?.user?.role
          })
          
          if (data && data.user) {
            console.log('✅ Force session successful!')
            setForcedSession(data)
          }
        }
      } catch (error) {
        console.error('❌ Force session error:', error)
      }
      
      setIsHydrated(true)
      setHasTriedForce(true)
    }

    // Executa imediatamente
    checkSession()
  }, []) // Apenas uma vez no mount

  // Monitora mudanças do useSession
  useEffect(() => {
    console.log('🔍 useSession changed:', { status, hasSession: !!session })
    
    if (session && status === "authenticated") {
      console.log('✅ Using useSession data')
      setForcedSession(session)
      setIsHydrated(true)
    }
  }, [session, status])

  // Determina estado final
  const finalSession = forcedSession || session
  const finalStatus = finalSession && finalSession.user ? "authenticated" : 
                     (isHydrated && hasTriedForce) ? "unauthenticated" : "loading"

  // Log apenas quando há mudança significativa
  const currentStatusSignature = `${status}-${!!session}-${!!forcedSession}-${finalStatus}-${isHydrated}-${hasTriedForce}`
  
  if (lastLoggedStatusRef.current !== currentStatusSignature) {
    console.log('🎯 useForcedSession state change:', {
      useSessionStatus: status,
      useSessionHasData: !!session,
      forcedSessionHasData: !!forcedSession,
      finalStatus,
      isHydrated,
      hasTriedForce,
      finalHasUser: !!finalSession?.user
    })
    lastLoggedStatusRef.current = currentStatusSignature
  }

  return {
    data: finalSession,
    status: finalStatus,
    isHydrated
  }
} 