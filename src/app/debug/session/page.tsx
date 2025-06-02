"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SessionDebugPage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen p-8">
      <Card>
        <CardHeader>
          <CardTitle>Debug da Sessão</CardTitle>
          <CardDescription>
            Informações da sessão atual para debug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          <div>
            <strong>Sessão:</strong>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div>
            <strong>Cookies:</strong>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {typeof document !== 'undefined' ? document.cookie : 'No cookies available'}
            </pre>
          </div>

          <div>
            <strong>Local Storage NextAuth:</strong>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {typeof localStorage !== 'undefined' 
                ? JSON.stringify({
                    sessionToken: localStorage.getItem('next-auth.session-token'),
                    callbackUrl: localStorage.getItem('next-auth.callback-url'),
                    csrf: localStorage.getItem('next-auth.csrf-token'),
                  }, null, 2)
                : 'No localStorage available'
              }
            </pre>
          </div>

          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 