"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Building2, Users, Settings, LogOut } from "lucide-react"
import { useEffect } from "react"
import { useForcedSession } from "@/hooks/use-forced-session"

export default function SuperAdminDashboard() {
  const { data: session, status } = useForcedSession()
  const router = useRouter()

  useEffect(() => {
    console.log('👑 Super Admin Dashboard Debug:', {
      status,
      hasSession: !!session,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    })

    if (status === "loading") {
      console.log('👑 Super Admin: Still loading...')
      return
    }

    if (status === "unauthenticated" || !session) {
      console.log('👑 Super Admin: Not authenticated, redirecting to login')
      router.push("/login")
      return
    }

    if (session.user.role !== "SUPER_ADMIN") {
      console.log('👑 Super Admin: Insufficient permissions, redirecting to unauthorized')
      router.push("/unauthorized")
      return
    }

    console.log('👑 Super Admin: Access granted')
  }, [session, status, router])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  if (status === "loading") {
    console.log('👑 Super Admin: Rendering loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || !session || session.user.role !== "SUPER_ADMIN") {
    console.log('👑 Super Admin: Access denied, rendering null')
    return null
  }

  console.log('👑 Super Admin: Rendering dashboard content')
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pandora Pro</h1>
                <p className="text-sm text-gray-600">Painel Super Administrador</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  SUPER ADMIN
                </Badge>
              </div>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Gestão de Escritórios */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <CardTitle>Escritórios</CardTitle>
                </div>
                <CardDescription>
                  Gerenciar escritórios de advocacia cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Gerenciar Escritórios
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Gestão de Usuários */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-green-600" />
                  <CardTitle>Usuários</CardTitle>
                </div>
                <CardDescription>
                  Gerenciar usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Gerenciar Usuários
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Configurações Globais */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-purple-600" />
                  <CardTitle>Configurações</CardTitle>
                </div>
                <CardDescription>
                  Configurações globais do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Configurações Globais
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Status Card */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Status do Sistema</CardTitle>
                <CardDescription>
                  Informações gerais sobre o sistema Pandora Pro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">1</p>
                    <p className="text-sm text-gray-600">Escritórios Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">3</p>
                    <p className="text-sm text-gray-600">Usuários Cadastrados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">4</p>
                    <p className="text-sm text-gray-600">Agentes IA Configurados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
} 