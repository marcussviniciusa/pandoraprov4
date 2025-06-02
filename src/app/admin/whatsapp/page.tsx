'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Settings, 
  Trash2, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  Smartphone,
  QrCode,
  MessageSquare,
  Users,
  MoreVertical,
  Power,
  PowerOff,
  RotateCcw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreateInstanceDialog } from './components/CreateInstanceDialog'
import { QrCodeDialog } from './components/QrCodeDialog'
import { EvolutionApiStatus } from './components/EvolutionApiStatus'
import AuthGuard from '@/components/auth/AuthGuard'

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

export default function WhatsAppPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null)
  const [deletingInstance, setDeletingInstance] = useState<WhatsAppInstance | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadInstances()
  }, [])

  const loadInstances = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/whatsapp/instances')
      const data = await response.json()
      
      if (response.ok) {
        setInstances(data.instances)
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao carregar instâncias',
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
  }, [toast])

  // Função específica para atualizar apenas uma instância 
  const updateInstance = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/instances`)
      const data = await response.json()
      
      if (response.ok && data.instances) {
        // Encontrar a instância atualizada
        const updatedInstance = data.instances.find((inst: WhatsAppInstance) => inst.id === instanceId)
        
        if (updatedInstance) {
          setInstances(prevInstances => 
            prevInstances.map(instance => 
              instance.id === instanceId ? updatedInstance : instance
            )
          )
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar instância:', error)
    }
  }, [])

  const handleInstanceCreated = (newInstance: WhatsAppInstance) => {
    setInstances([newInstance, ...instances])
    setIsCreateOpen(false)
    toast({
      title: 'Sucesso',
      description: 'Instância criada com sucesso!'
    })
  }

  const handleDeleteInstance = async (instance: WhatsAppInstance) => {
    try {
      const response = await fetch(`/api/whatsapp/instances/${instance.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setInstances(instances.filter(i => i.id !== instance.id))
        toast({
          title: 'Sucesso',
          description: 'Instância deletada com sucesso!'
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao deletar instância',
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
      setDeletingInstance(null)
    }
  }

  const handleInstanceAction = async (instance: WhatsAppInstance, action: 'restart' | 'logout' | 'connect') => {
    try {
      const response = await fetch(`/api/whatsapp/instances/${instance.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        // Recarregar dados após ação
        await loadInstances()
        toast({
          title: 'Sucesso',
          description: `Ação "${action}" executada com sucesso!`
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Erro',
          description: data.error || `Erro ao executar ação "${action}"`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: WhatsAppInstance['status']) => {
    const statusConfig = {
      CONNECTED: { 
        variant: 'default' as const, 
        className: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        label: 'Conectado'
      },
      CONNECTING: { 
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        label: 'Conectando'
      },
      DISCONNECTED: { 
        variant: 'secondary' as const, 
        className: 'bg-gray-100 text-gray-600',
        icon: XCircle,
        label: 'Desconectado'
      },
      ERROR: { 
        variant: 'destructive' as const, 
        className: 'bg-red-100 text-red-800',
        icon: XCircle,
        label: 'Erro'
      }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getActionButtons = (instance: WhatsAppInstance) => {
    switch (instance.status) {
      case 'DISCONNECTED':
      case 'ERROR':
        return (
          <Button
            size="sm"
            onClick={() => setQrInstance(instance)}
            className="flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Conectar
          </Button>
        )
      case 'CONNECTING':
        return (
          <Button
            size="sm"
            onClick={() => setQrInstance(instance)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Ver QR Code
          </Button>
        )
      case 'CONNECTED':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleInstanceAction(instance, 'restart')}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleInstanceAction(instance, 'logout')}
            >
              <PowerOff className="w-4 h-4" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="ADMIN">
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando instâncias WhatsApp...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas instâncias e integrações WhatsApp
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Instância
          </Button>
        </div>

        {/* Evolution API Status */}
        <EvolutionApiStatus />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{instances.length}</p>
                </div>
                <Smartphone className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conectadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {instances.filter(i => i.status === 'CONNECTED').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversas</p>
                  <p className="text-2xl font-bold">
                    {instances.reduce((acc, i) => acc + (i._count?.conversations || 0), 0)}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensagens</p>
                  <p className="text-2xl font-bold">
                    {instances.reduce((acc, i) => acc + (i._count?.messages || 0), 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instances List */}
        <div className="space-y-4">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhuma instância encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira instância WhatsApp para começar a usar a integração.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Instância
                </Button>
              </CardContent>
            </Card>
          ) : (
            instances.map((instance) => (
              <Card key={instance.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-green-600" />
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-lg">{instance.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusBadge(instance.status)}
                          {instance.phoneNumber && (
                            <Badge variant="outline">
                              {instance.phoneNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {instance._count?.conversations || 0} conversas • {instance._count?.messages || 0} mensagens
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getActionButtons(instance)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setQrInstance(instance)}>
                            <QrCode className="w-4 h-4 mr-2" />
                            Ver QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInstanceAction(instance, 'restart')}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reiniciar
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem 
                            onClick={() => setDeletingInstance(instance)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialogs */}
        <CreateInstanceDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onInstanceCreated={handleInstanceCreated}
        />

        {qrInstance && (
          <QrCodeDialog
            instance={qrInstance}
            open={!!qrInstance}
            onOpenChange={() => setQrInstance(null)}
            onStatusUpdate={() => updateInstance(qrInstance.id)}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingInstance} onOpenChange={() => setDeletingInstance(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Instância</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar a instância "{deletingInstance?.name}"? 
                Esta ação não pode ser desfeita e todas as conversas serão perdidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingInstance && handleDeleteInstance(deletingInstance)}
                className="bg-red-600 hover:bg-red-700"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  )
} 