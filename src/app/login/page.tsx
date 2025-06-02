"use client"

import { useState, useEffect } from "react"
import { signIn, getSession, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Verificar se usuário já está autenticado
  useEffect(() => {
    console.log('🔐 Login Page Debug:', {
      status,
      hasSession: !!session,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    })

    if (status === "loading") {
      console.log('🔐 Login Page: Still loading, waiting...')
      return // Aguarda carregar
    }

    if (session && status === "authenticated") {
      console.log('🔐 Login Page: User already authenticated, redirecting...')
      // Usuário já está logado, redireciona para área apropriada
      if (session.user.role === "SUPER_ADMIN") {
        router.push("/super-admin")
      } else if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } else {
      console.log('🔐 Login Page: User not authenticated, showing login form')
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Credenciais inválidas. Verifique seu email e senha.")
      } else {
        toast.success("Login realizado com sucesso!")
        
        // Buscar a sessão para verificar o role do usuário
        const session = await getSession()
        
        if (session?.user?.role === "SUPER_ADMIN") {
          router.push("/super-admin")
        } else if (session?.user?.role === "ADMIN") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      toast.error("Erro interno. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state enquanto verifica autenticação
  if (status === "loading") {
    console.log('🔐 Login Page: Rendering loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  // Se já está autenticado, não mostra nada (o useEffect já redirecionou)
  if (session && status === "authenticated") {
    console.log('🔐 Login Page: Already authenticated, rendering null')
    return null
  }

  console.log('🔐 Login Page: Rendering login form')
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
            <CardTitle>Fazer Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 