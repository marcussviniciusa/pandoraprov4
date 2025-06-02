"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Bot, 
  Users, 
  MessageSquare, 
  Activity, 
  Send, 
  User, 
  Settings, 
  TrendingUp,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface Agent {
  id: string
  name: string
  type: string
  isActive: boolean
}

interface ConversationMessage {
  content: string
  isFromClient: boolean
  timestamp: Date
}

interface DashboardStats {
  totalConversations: number
  activeConversations: number
  totalClientes: number
  aiResolutionRate: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Estados
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    activeConversations: 0,
    totalClientes: 0,
    aiResolutionRate: 0
  })

  // Chat de teste
  const [testMessages, setTestMessages] = useState<ConversationMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [clientPhone, setClientPhone] = useState("(11) 99999-9999")
  const [clientName, setClientName] = useState("Cliente Teste")

  // Carregar dados iniciais
  useEffect(() => {
    if (session?.user) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carregar agentes disponíveis
      const agentsResponse = await fetch("/api/ai/chat")
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData.data || [])
        
        // Selecionar automaticamente o Recepcionista se disponível
        const receptionist = agentsData.data?.find((a: Agent) => a.type === "RECEPTIONIST")
        if (receptionist) {
          setSelectedAgent(receptionist.id)
        }
      }

      // Carregar estatísticas básicas
      // TODO: Implementar endpoint para métricas reais
      setStats({
        totalConversations: 42,
        activeConversations: 8,
        totalClientes: 28,
        aiResolutionRate: 78.5
      })

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error)
      toast.error("Erro ao carregar dados do dashboard")
    } finally {
      setLoading(false)
    }
  }

  const sendTestMessage = async () => {
    if (!currentMessage.trim() || !selectedAgent) {
      toast.error("Selecione um agente e digite uma mensagem")
      return
    }

    try {
      setSending(true)
      
      // Adicionar mensagem do cliente
      const newClientMessage: ConversationMessage = {
        content: currentMessage,
        isFromClient: true,
        timestamp: new Date()
      }
      
      setTestMessages(prev => [...prev, newClientMessage])
      setCurrentMessage("")

      // Enviar para a IA
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentMessage,
          agentId: selectedAgent,
          clientPhone,
          clientName,
          conversationHistory: testMessages
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      // Adicionar resposta da IA
      const aiResponse: ConversationMessage = {
        content: result.response,
        isFromClient: false,
        timestamp: new Date()
      }
      
      setTestMessages(prev => [...prev, aiResponse])

      // Mostrar informações sobre transferência se necessário
      if (result.shouldTransfer && result.suggestedAgent) {
        toast.info(`IA sugere transferir para: ${result.suggestedAgent}`)
      }

      // Mostrar tags sugeridas
      if (result.suggestedTags?.length > 0) {
        toast.info(`Tags sugeridas: ${result.suggestedTags.join(", ")}`)
      }

    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem")
    } finally {
      setSending(false)
    }
  }

  const clearConversation = () => {
    setTestMessages([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 animate-spin mx-auto" />
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Pandora Pro</h1>
          <p className="text-muted-foreground">
            Olá {session?.user?.name}, bem-vindo ao seu painel de controle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {session?.user?.role === "SUPER_ADMIN" ? "Super Admin" : 
             session?.user?.role === "ADMIN" ? "Administrador" : "Usuário"}
          </Badge>
          {session?.user?.role !== "USER" && (
            <Button variant="default" onClick={() => window.location.href = "/admin/ai-config"}>
              <Settings className="h-4 w-4 mr-2" />
              Config IA
              <Badge variant="secondary" className="ml-2">
                Ativo
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde o mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversations}</div>
            <p className="text-xs text-muted-foreground">
              Atualmente em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              +5 novos esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolução por IA</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiResolutionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa de resolução automática
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat de teste com IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuração do teste */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Teste de Agentes IA
            </CardTitle>
            <CardDescription>
              Simule conversas com os agentes especialistas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Agente Especialista</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        {agent.name}
                        <Badge variant="outline" className="text-xs">
                          {agent.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={clearConversation}
                className="flex-1"
              >
                Limpar Chat
              </Button>
            </div>

            {/* Status dos agentes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Agentes Disponíveis</Label>
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between text-sm">
                  <span>{agent.type}</span>
                  <Badge variant={agent.isActive ? "default" : "secondary"}>
                    {agent.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conversa de Teste</CardTitle>
                <CardDescription>
                  {selectedAgent ? `Testando com ${agents.find(a => a.id === selectedAgent)?.name}` : "Selecione um agente"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{clientPhone}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Área de mensagens */}
            <ScrollArea className="h-96 w-full rounded-md border p-4 mb-4">
              {testMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhuma mensagem ainda.</p>
                  <p className="text-sm">Digite abaixo para começar a conversa com a IA.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.isFromClient ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[80%] ${message.isFromClient ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.isFromClient ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg p-3 ${
                          message.isFromClient 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 opacity-60" />
                            <span className="text-xs opacity-60">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input de mensagem */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendTestMessage()
                  }
                }}
                className="min-h-[60px]"
              />
              <Button 
                onClick={sendTestMessage} 
                disabled={sending || !selectedAgent || !currentMessage.trim()}
                className="self-end"
              >
                {sending ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!selectedAgent && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Selecione um agente para começar a conversa
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session?.user?.role !== "USER" && (
              <>
                <Button 
                  variant="default"
                  className="w-full justify-start bg-primary hover:bg-primary/90"
                  onClick={() => window.location.href = "/admin/ai-config"}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Agentes IA
                  <Badge variant="secondary" className="ml-auto">
                    Ativo
                  </Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start opacity-50"
                  disabled
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                  <Badge variant="outline" className="ml-auto text-xs">
                    Em breve
                  </Badge>
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start opacity-50"
              disabled
            >
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Clientes
              <Badge variant="outline" className="ml-auto text-xs">
                Em breve
              </Badge>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métricas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Mensagens hoje</span>
              <Badge variant="outline">127</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Tempo médio resposta</span>
              <Badge variant="outline">1.2s</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Satisfação cliente</span>
              <Badge variant="default">94%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Agentes IA</span>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Online
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">WhatsApp</span>
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Não Conectado
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Banco de Dados</span>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Online
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 