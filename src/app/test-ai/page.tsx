"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Send, User, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Agent {
  id: string
  name: string
  type: string
  prompt: string
  temperature: number
  maxTokens: number
  model: string
}

interface ChatMessage {
  content: string
  isFromAgent: boolean
  timestamp: string
  agentName?: string
  suggestedTags?: string[]
}

export default function TestAIPage() {
  const { data: session } = useSession()
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [message, setMessage] = useState("")
  const [clientName, setClientName] = useState("João Silva")
  const [clientPhone, setClientPhone] = useState("11999887766")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)

  useEffect(() => {
    if (session?.user?.officeId) {
      loadAgents()
    }
  }, [session])

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/ai/chat')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.data)
        if (data.data.length > 0) {
          setSelectedAgent(data.data[0].id)
        }
      } else {
        toast.error("Erro ao carregar agentes")
      }
    } catch (error) {
      toast.error("Erro ao conectar com servidor")
    } finally {
      setLoadingAgents(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !selectedAgent || isLoading) return

    setIsLoading(true)
    const userMessage = message.trim()
    setMessage("")

    // Adicionar mensagem do usuário ao histórico
    const newUserMessage: ChatMessage = {
      content: userMessage,
      isFromAgent: false,
      timestamp: new Date().toISOString()
    }
    setChatHistory(prev => [...prev, newUserMessage])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          agentId: selectedAgent,
          clientPhone,
          clientName,
          conversationHistory: chatHistory.map(msg => ({
            content: msg.content,
            isFromClient: !msg.isFromAgent,
            timestamp: new Date(msg.timestamp)
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        const agentResponse: ChatMessage = {
          content: data.data.response,
          isFromAgent: true,
          timestamp: data.data.timestamp,
          agentName: data.data.agentName,
          suggestedTags: data.data.suggestedTags
        }
        
        setChatHistory(prev => [...prev, agentResponse])

        // Mostrar informações sobre transferência
        if (data.data.shouldTransfer) {
          toast.info(`Agente sugere transferir para: ${data.data.suggestedAgent}`)
        }

      } else {
        const errorData = await response.json()
        toast.error(`Erro: ${errorData.error}`)
      }
    } catch (error) {
      toast.error("Erro ao enviar mensagem")
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setChatHistory([])
  }

  if (!session?.user?.officeId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card>
          <CardHeader>
            <CardTitle>Teste de Agentes IA</CardTitle>
            <CardDescription>
              Esta funcionalidade está disponível apenas para usuários de escritórios
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 Teste de Agentes IA
          </h1>
          <p className="text-gray-600">
            Teste os agentes inteligentes configurados para seu escritório
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuração */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agent">Agente</Label>
                  {loadingAgents ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um agente" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} ({agent.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="clientName">Nome do Cliente</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
                  />
                </div>

                <div>
                  <Label htmlFor="clientPhone">Telefone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="11999887766"
                  />
                </div>

                <Button 
                  onClick={clearChat} 
                  variant="outline" 
                  className="w-full"
                >
                  Limpar Conversa
                </Button>
              </CardContent>
            </Card>

            {/* Informações do Agente Selecionado */}
            {selectedAgent && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Agente Selecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const agent = agents.find(a => a.id === selectedAgent)
                    if (!agent) return null
                    return (
                      <div className="space-y-2">
                        <p><strong>Nome:</strong> {agent.name}</p>
                        <p><strong>Tipo:</strong> {agent.type}</p>
                        <p><strong>Modelo:</strong> {agent.model}</p>
                        <p><strong>Temperatura:</strong> {agent.temperature}</p>
                        <p><strong>Max Tokens:</strong> {agent.maxTokens}</p>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
                <CardDescription>
                  Teste como o agente responde às mensagens
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Histórico */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Nenhuma mensagem ainda. Comece a conversa!
                    </div>
                  ) : (
                    chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.isFromAgent ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.isFromAgent
                              ? 'bg-white border'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {msg.isFromAgent ? (
                              <Bot className="h-4 w-4 mt-1 text-blue-600" />
                            ) : (
                              <User className="h-4 w-4 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm">{msg.content}</p>
                              {msg.agentName && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {msg.agentName}
                                </p>
                              )}
                              {msg.suggestedTags && msg.suggestedTags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {msg.suggestedTags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={isLoading || !message.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 