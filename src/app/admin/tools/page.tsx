'use client'

import { useState, useEffect } from 'react'
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
  ExternalLink,
  MoreVertical
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
import { CreateToolDialog } from './components/CreateToolDialog'
import { EditToolDialog } from './components/EditToolDialog'
import AuthGuard from '@/components/auth/AuthGuard'

interface Tool {
  id: string
  name: string
  description: string
  webhookUrl: string
  isActive: boolean
  createdAt: string
  createdBy: {
    name: string
    email: string
  }
  _count: {
    executions: number
  }
}

interface ToolExecution {
  id: string
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'TIMEOUT'
  description: string
  startedAt: string
  completedAt: string | null
  errorMessage: string | null
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools')
      const data = await response.json()
      
      if (response.ok) {
        setTools(data.tools)
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar tools',
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

  const handleToolCreated = (newTool: Tool) => {
    setTools([newTool, ...tools])
    setIsCreateOpen(false)
    toast({
      title: 'Sucesso',
      description: 'Tool criada com sucesso!'
    })
  }

  const handleToolUpdated = (updatedTool: Tool) => {
    setTools(tools.map(tool => 
      tool.id === updatedTool.id ? updatedTool : tool
    ))
    setEditingTool(null)
    toast({
      title: 'Sucesso',
      description: 'Tool atualizada com sucesso!'
    })
  }

  const handleDeleteTool = async (tool: Tool) => {
    try {
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTools(tools.filter(t => t.id !== tool.id))
        toast({
          title: 'Sucesso',
          description: 'Tool deletada com sucesso!'
        })
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao deletar tool',
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
      setDeletingTool(null)
    }
  }

  const toggleToolStatus = async (tool: Tool) => {
    try {
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tool.isActive })
      })

      if (response.ok) {
        const result = await response.json()
        setTools(tools.map(t => 
          t.id === tool.id ? result.tool : t
        ))
        toast({
          title: 'Sucesso',
          description: `Tool ${tool.isActive ? 'desativada' : 'ativada'} com sucesso!`
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status da tool',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativa
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        <XCircle className="w-3 h-3 mr-1" />
        Inativa
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando tools...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tools & Automações</h1>
            <p className="text-muted-foreground">
              Configure automações que os agentes IA podem executar automaticamente
            </p>
          </div>
          
          <Button onClick={() => setIsCreateOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tool
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tools</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tools.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tools Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tools.filter(t => t.isActive).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Execuções</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.reduce((total, tool) => total + tool._count.executions, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mais Usada</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">
                {tools.length > 0 
                  ? tools.reduce((max, tool) => 
                      tool._count.executions > max._count.executions ? tool : max
                    ).name
                  : 'Nenhuma'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tools List */}
        {tools.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma tool configurada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira automação para expandir as capacidades da IA
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira tool
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Card key={tool.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTool(tool)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleToolStatus(tool)}>
                          {tool.isActive ? (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => window.open(tool.webhookUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Testar Webhook
                        </DropdownMenuItem>
                        <Separator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingTool(tool)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(tool.isActive)}
                    <span className="text-sm text-muted-foreground">
                      {tool._count.executions} execuções
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado por:</span>
                      <span className="font-medium">{tool.createdBy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span>{new Date(tool.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground truncate">
                      {tool.webhookUrl}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CreateToolDialog 
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onToolCreated={handleToolCreated}
        />

        {editingTool && (
          <EditToolDialog 
            tool={editingTool}
            open={!!editingTool}
            onOpenChange={(open) => !open && setEditingTool(null)}
            onToolUpdated={handleToolUpdated}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingTool} onOpenChange={() => setDeletingTool(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Tool</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar a tool <strong>{deletingTool?.name}</strong>? 
                Esta ação não pode ser desfeita e todos os registros de execução serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingTool && handleDeleteTool(deletingTool)}
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