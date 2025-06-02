"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function UnauthorizedPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleGoBack = () => {
    if (session?.user?.role === "SUPER_ADMIN") {
      router.push("/super-admin")
    } else if (session?.user?.role === "ADMIN") {
      router.push("/admin")
    } else {
      router.push("/dashboard")
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Pandora Pro</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema Multicanal Inteligente para Escritórios de Advocacia
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-red-700">Acesso Negado</CardTitle>
            </div>
            <CardDescription>
              Você não tem permissão para acessar esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Você tentou acessar uma área restrita do sistema. Entre em contato com o administrador se acredita que isso é um erro.
              </p>
              
              {session && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-800 mb-2">
                    Informações do seu usuário:
                  </h3>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><strong>Nome:</strong> {session.user.name}</p>
                    <p><strong>Email:</strong> {session.user.email}</p>
                    <p><strong>Função:</strong> {session.user.role}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleGoBack}
                  className="w-full"
                >
                  Voltar ao Dashboard
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full"
                >
                  Fazer Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 