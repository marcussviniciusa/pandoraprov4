"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function SetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    // Se não está logado, redirecionar para login
    if (!session) {
      router.push("/login")
      return
    }

    // Se é SUPER_ADMIN, redirecionar para painel super admin
    if (session.user.role === "SUPER_ADMIN") {
      router.push("/super-admin")
      return
    }

    // Se já tem escritório, redirecionar baseado no role
    if (session.user.officeId) {
      if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!session || session.user.role === "SUPER_ADMIN" || session.user.officeId) {
    return null // Será redirecionado pelo useEffect
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
            <CardTitle>Configuração Necessária</CardTitle>
            <CardDescription>
              Seu usuário ainda não está associado a um escritório
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Entre em contato com o administrador do sistema para associar seu usuário a um escritório.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Informações do seu usuário:
                </h3>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p><strong>Nome:</strong> {session.user.name}</p>
                  <p><strong>Email:</strong> {session.user.email}</p>
                  <p><strong>Função:</strong> {session.user.role}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="w-full"
              >
                Voltar para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 