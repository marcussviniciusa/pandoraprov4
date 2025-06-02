"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useForcedSession } from "@/hooks/use-forced-session"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "USER" | "ADMIN" | "SUPER_ADMIN"
  fallback?: React.ReactNode
}

export default function AuthGuard({ 
  children, 
  requiredRole = "USER",
  fallback 
}: AuthGuardProps) {
  const { data: session, status } = useForcedSession()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const lastLoggedStateRef = useRef<string>('')

  useEffect(() => {
    // Log apenas quando há mudança significativa
    const currentState = `${status}-${!!session}-${session?.user?.role}-${requiredRole}-${shouldRender}`
    
    if (lastLoggedStateRef.current !== currentState) {
      console.log('🔒 AuthGuard Debug:', {
        status,
        hasSession: !!session,
        userRole: session?.user?.role,
        requiredRole,
        shouldRender,
        timestamp: new Date().toISOString()
      })
      lastLoggedStateRef.current = currentState
    }

    // Se está carregando, aguarda
    if (status === "loading") {
      if (lastLoggedStateRef.current !== currentState) {
        console.log('🔒 AuthGuard: Loading...')
      }
      return
    }

    // Se temos sessão válida, verifica permissões
    if (status === "authenticated" && session) {
      const roleHierarchy = {
        USER: 1,
        ADMIN: 2, 
        SUPER_ADMIN: 3
      }

      const userLevel = roleHierarchy[session.user.role as keyof typeof roleHierarchy] || 0
      const requiredLevel = roleHierarchy[requiredRole]

      if (userLevel >= requiredLevel) {
        if (!shouldRender) {
          console.log('🔒 AuthGuard: Access granted, rendering content')
          setShouldRender(true)
        }
        return
      } else {
        console.log('🔒 AuthGuard: Insufficient permissions')
        router.push("/unauthorized")
        return
      }
    }

    // Se não está autenticado, redireciona
    if (status === "unauthenticated") {
      console.log('🔒 AuthGuard: Not authenticated, redirecting to login')
      router.push("/login")
      return
    }
  }, [session, status, router, requiredRole, shouldRender])

  // Loading state
  if (status === "loading" || !shouldRender) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 