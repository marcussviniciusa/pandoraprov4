"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useForcedSession } from "@/hooks/use-forced-session"

export default function Home() {
  const { data: session, status } = useForcedSession()
  const router = useRouter()

  useEffect(() => {
    console.log('🏠 Home Page Debug:', {
      status,
      hasSession: !!session,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    })

    if (status === "loading") {
      console.log('🏠 Home Page: Still loading...')
      return // Aguarda carregar
    }

    if (status === "unauthenticated" || !session) {
      console.log('🏠 Home Page: Not authenticated, redirecting to login')
      router.push("/login")
    } else if (status === "authenticated" && session) {
      console.log('🏠 Home Page: Authenticated, redirecting based on role')
      // Redirecionar baseado no role do usuário
      if (session.user.role === "SUPER_ADMIN") {
        router.push("/super-admin")
      } else if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  )
}
