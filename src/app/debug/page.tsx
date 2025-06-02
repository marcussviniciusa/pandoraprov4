"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Debug - Informações da Sessão</CardTitle>
            <CardDescription>
              Página para depuração do sistema de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Status:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">{status}</pre>
              </div>
              
              <div>
                <h3 className="font-semibold">Sessão Completa:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>

              {session?.user && (
                <div>
                  <h3 className="font-semibold">Dados do Usuário:</h3>
                  <div className="bg-blue-50 p-3 rounded">
                    <p><strong>ID:</strong> {session.user.id}</p>
                    <p><strong>Nome:</strong> {session.user.name}</p>
                    <p><strong>Email:</strong> {session.user.email}</p>
                    <p><strong>Role:</strong> {session.user.role}</p>
                    <p><strong>Office ID:</strong> {session.user.officeId || 'NULL'}</p>
                    <p><strong>Office:</strong> {session.user.office ? JSON.stringify(session.user.office) : 'NULL'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 