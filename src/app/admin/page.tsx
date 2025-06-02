"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, MessageSquare, Users, Bot, Settings, LogOut, Building2 } from "lucide-react"
import { useForcedSession } from "@/hooks/use-forced-session"

export default function AdminDashboard() {
  const { data: session, status } = useForcedSession()
  const router = useRouter()

  console.log('🏠 Admin Dashboard Debug:', {
    status,
    hasSession: !!session,
    userRole: session?.user?.role,
    timestamp: new Date().toISOString()
  })

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  // Loading state
  if (status === "loading") {
    console.log('🏠 Admin Dashboard: Rendering loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  // Se não autenticado, redireciona
  if (status === "unauthenticated" || !session) {
    console.log('🏠 Admin Dashboard: Not authenticated, redirecting to login')
    router.push("/login")
    return null
  }

  console.log('🏠 Admin Dashboard: Rendering content')
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pandora Pro</h1>
                <p className="text-sm text-gray-600">
                  Painel Administrativo - {session?.user?.office?.name || 'Escritório'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {session?.user?.role || 'ADMIN'}
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
            
            {/* Conversas */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <CardTitle>Conversas</CardTitle>
                </div>
                <CardDescription>
                  Gerenciar conversas e atendimentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Ver Conversas
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Equipe */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-green-600" />
                  <CardTitle>Equipe</CardTitle>
                </div>
                <CardDescription>
                  Gerenciar usuários do escritório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Gerenciar Equipe
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Agentes IA */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-purple-600" />
                  <CardTitle>Agentes IA</CardTitle>
                </div>
                <CardDescription>
                  Configurar agentes inteligentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => router.push("/admin/ai-config")}
                >
                  Configurar Agentes
                </Button>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                  <CardTitle>WhatsApp</CardTitle>
                </div>
                <CardDescription>
                  Configurar integração WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  onClick={() => router.push("/admin/whatsapp")}
                >
                  Gerenciar WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Tags e Status */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-orange-600" />
                  <CardTitle>Tags & Status</CardTitle>
                </div>
                <CardDescription>
                  Configurar tags e status personalizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Configurar Tags
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Relatórios */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-red-600" />
                  <CardTitle>Relatórios</CardTitle>
                </div>
                <CardDescription>
                  Relatórios e analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled>
                  Ver Relatórios
                  <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                </Button>
              </CardContent>
            </Card>

            {/* Tools & Automações */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-blue-600" />
                  <CardTitle>Tools & Automações</CardTitle>
                </div>
                <CardDescription>
                  Configure automações que a IA pode executar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  onClick={() => router.push("/admin/tools")}
                >
                  Gerenciar Tools
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Status Card */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Escritório</CardTitle>
                <CardDescription>
                  Estatísticas gerais do seu escritório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-sm text-gray-600">Conversas Ativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-sm text-gray-600">Clientes Cadastrados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">4</p>
                    <p className="text-sm text-gray-600">Agentes IA Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">10</p>
                    <p className="text-sm text-gray-600">Tags Disponíveis</p>
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