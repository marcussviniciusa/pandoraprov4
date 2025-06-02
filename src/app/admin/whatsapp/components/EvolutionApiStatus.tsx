'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react'
import { EvolutionApiConfig } from './EvolutionApiConfig'

interface HealthStatus {
  status: 'healthy' | 'error' | 'loading'
  message: string
  details?: {
    url?: string
    responseTime?: string
    error?: any
    data?: any
  }
  timestamp: string
}

export function EvolutionApiStatus() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      if (!isRefreshing) {
        setIsLoading(true)
      }

      const response = await fetch('/api/whatsapp/health')
      const data = await response.json()

      if (response.ok && data.status === 'healthy') {
        setHealthStatus({
          status: 'healthy',
          message: data.message,
          details: data.details,
          timestamp: data.timestamp
        })
      } else {
        setHealthStatus({
          status: 'error',
          message: data.message || 'Erro na Evolution API',
          details: data.details,
          timestamp: data.timestamp || new Date().toISOString()
        })
      }
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: 'Erro de conexão com o servidor',
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        },
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await checkHealth()
  }

  const getStatusIcon = () => {
    if (isLoading || isRefreshing) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    }

    switch (healthStatus?.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Verificando...
        </Badge>
      )
    }

    switch (healthStatus?.status) {
      case 'healthy':
        return (
          <Badge className="bg-green-100 text-green-800">
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Desconhecido
          </Badge>
        )
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Evolution API</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <EvolutionApiConfig />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Status Message */}
        <div>
          <p className="text-sm font-medium">
            {healthStatus?.message || 'Carregando status...'}
          </p>
        </div>

        {/* Details */}
        {healthStatus?.details && (
          <div className="space-y-2">
            {healthStatus.details.url && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">URL:</span>
                <span className="font-mono">{healthStatus.details.url}</span>
              </div>
            )}
            
            {healthStatus.details.responseTime && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tempo de resposta:</span>
                <span className="font-mono">{healthStatus.details.responseTime}</span>
              </div>
            )}

            {healthStatus.details.error && (
              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-600 font-medium">Erro:</p>
                <p className="text-xs text-red-600 mt-1">
                  {typeof healthStatus.details.error === 'object' 
                    ? healthStatus.details.error.message || JSON.stringify(healthStatus.details.error)
                    : healthStatus.details.error
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {healthStatus?.timestamp && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Última verificação:</span>
            </div>
            <span>{formatTimestamp(healthStatus.timestamp)}</span>
          </div>
        )}

        {/* Help Text */}
        {healthStatus?.status === 'error' && (
          <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">
              💡 <strong>Como resolver:</strong>
            </p>
            <ul className="text-xs text-yellow-700 mt-1 ml-2 list-disc">
              <li>Verifique se a Evolution API está rodando</li>
              <li>Confirme as configurações no arquivo .env</li>
              <li>Teste a conectividade com o servidor</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 