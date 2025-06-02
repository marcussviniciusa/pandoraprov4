"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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

  useEffect(() => {
    console.log('🔒 AuthGuard Debug:', {
      status,
      hasSession: !!session,
      userRole: session?.user?.role,
      requiredRole,
      shouldRender,
      timestamp: new Date().toISOString()
    })

    // Se está carregando, aguarda
    if (status === "loading") {
      console.log('🔒 AuthGuard: Loading...')
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
        console.log('🔒 AuthGuard: Access granted, rendering content')
        setShouldRender(true)
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
  }, [session, status, router, requiredRole])

  // Loading state
  if (status === "loading" || !shouldRender) {
    console.log('🔒 AuthGuard: Rendering loading state')
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  console.log('🔒 AuthGuard: Rendering protected content')
  return <>{children}</>
} 