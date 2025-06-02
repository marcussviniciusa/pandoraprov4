'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  QrCode, 
  Smartphone, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Clock,
  Wifi
} from 'lucide-react'

interface WhatsAppInstance {
  id: string
  name: string
  phoneNumber: string | null
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  qrCode: string | null
  isActive: boolean
  createdAt: string
  office: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  _count?: {
    conversations: number
    messages: number
  }
}

interface QrCodeDialogProps {
  instance: WhatsAppInstance
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate: () => void
}

export function QrCodeDialog({
  instance,
  open,
  onOpenChange,
  onStatusUpdate
}: QrCodeDialogProps) {
  const [qrData, setQrData] = useState<{
    qrCode: string | null
    status: string
    phoneNumber: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { toast } = useToast()
  
  // Refs para controlar o polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(false)
  const hasNotifiedRef = useRef(false)

  // Função para limpar o polling
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Função para iniciar o polling (agora só chamada explicitamente)
  const startPolling = () => {
    clearPolling()
    
    if (!open || isConnectedRef.current) {
      return
    }

    pollingIntervalRef.current = setInterval(() => {
      if (!isConnectedRef.current) {
        fetchQrCode()
      } else {
        clearPolling()
      }
    }, 3000)
  }

  // Função para verificar status atual na Evolution API
  const checkConnectionStatus = async () => {
    setIsCheckingStatus(true)
    try {
      const response = await fetch(`/api/whatsapp/instances/${instance.id}/status`)
      
      if (response.ok) {
        const updatedInstance = await response.json()
        console.log('🔍 Status verificado:', updatedInstance.status)
        
        if (updatedInstance.status === 'CONNECTED') {
          isConnectedRef.current = true
          clearPolling()
          
          setQrData({
            qrCode: null,
            status: 'CONNECTED',
            phoneNumber: updatedInstance.phoneNumber
          })
          
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true
            onStatusUpdate()
            toast({
              title: 'Conectado!',
              description: `WhatsApp conectado com sucesso${updatedInstance.phoneNumber ? ': ' + updatedInstance.phoneNumber : ''}`,
            })
          }
        } else {
          setQrData(prev => prev ? {
            ...prev,
            status: updatedInstance.status,
            phoneNumber: updatedInstance.phoneNumber
          } : null)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao verificar status da conexão',
        variant: 'destructive'
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Effect para buscar QR Code inicial e verificar status ao abrir
  useEffect(() => {
    if (open) {
      // Resetar estados quando abrir
      isConnectedRef.current = false
      hasNotifiedRef.current = false
      
      // Verificar status atual primeiro
      checkConnectionStatus()
      
      // Buscar QR Code apenas uma vez ao abrir
      fetchQrCode()
    } else {
      // Limpar quando fechar
      clearPolling()
      setQrData(null)
      isConnectedRef.current = false
      hasNotifiedRef.current = false
    }

    return () => {
      clearPolling()
    }
  }, [open, instance.id])

  const fetchQrCode = async () => {
    // Não buscar se já está conectado
    if (isConnectedRef.current) {
      return
    }
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/whatsapp/instances/${instance.id}/qr`)
      const data = await response.json()

      if (response.ok) {
        setQrData(data)
        
        // Verificar se conectou
        if (data.status === 'CONNECTED') {
          isConnectedRef.current = true
          clearPolling()
          
          // Notificar apenas uma vez
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true
            onStatusUpdate()
            toast({
              title: 'Conectado!',
              description: `WhatsApp conectado com sucesso${data.phoneNumber ? ': ' + data.phoneNumber : ''}`,
            })
          }
        }
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao buscar QR Code',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshQrCode = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/whatsapp/instances/${instance.id}/qr`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Resetar estados para permitir nova conexão
        isConnectedRef.current = false
        hasNotifiedRef.current = false
        
        await fetchQrCode()
        // Iniciar polling APENAS quando o usuário clica para atualizar QR Code
        startPolling()
        
        toast({
          title: 'QR Code atualizado',
          description: 'Um novo QR Code foi gerado e está sendo monitorado'
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao regenerar QR Code',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        )
      case 'CONNECTING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Conectando
          </Badge>
        )
      case 'DISCONNECTED':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        )
      case 'ERROR':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Carregando
          </Badge>
        )
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Atualizar dados na página pai ao fechar
    onStatusUpdate()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle>Conectar WhatsApp</DialogTitle>
                <DialogDescription>{instance.name}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {qrData?.status && getStatusBadge(qrData.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={checkConnectionStatus}
                disabled={isCheckingStatus}
                title="Verificar status da conexão"
              >
                {isCheckingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Info */}
          {qrData?.phoneNumber && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">WhatsApp Conectado!</p>
                  <p className="text-sm text-green-600">Número: {qrData.phoneNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Area */}
          <div className="text-center space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Carregando QR Code...</p>
              </div>
            ) : qrData?.status === 'CONNECTED' ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-16 h-16 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Conectado com sucesso!</p>
                  <p className="text-sm text-muted-foreground">
                    Seu WhatsApp está pronto para uso
                  </p>
                </div>
              </div>
            ) : qrData?.qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={qrData.qrCode}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 border rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Escaneie o QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    1. Abra o WhatsApp no seu celular<br />
                    2. Toque em Configurações {'>'} Aparelhos conectados<br />
                    3. Toque em "Conectar um aparelho"<br />
                    4. Escaneie este QR Code
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshQrCode}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Atualizar QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkConnectionStatus}
                    disabled={isCheckingStatus}
                  >
                    {isCheckingStatus ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    Verificar Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <QrCode className="w-16 h-16 text-muted-foreground" />
                <div>
                  <p className="font-medium">QR Code não disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Aguarde ou tente atualizar
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={refreshQrCode} disabled={isRefreshing}>
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Tentar Novamente
                  </Button>
                  <Button variant="outline" onClick={checkConnectionStatus} disabled={isCheckingStatus}>
                    {isCheckingStatus ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    Verificar Status
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Auto-refresh indicator - Só mostra se o polling estiver ativo */}
          {pollingIntervalRef.current && qrData?.status === 'CONNECTING' && !isConnectedRef.current && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                ⟳ Monitorando conexão automaticamente...
              </p>
            </div>
          )}

          {/* Dica para usuários que conectaram mas não aparece */}
          {qrData?.status === 'CONNECTING' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                💡 Se você já conectou no celular, clique no botão "Verificar Status" para atualizar
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 