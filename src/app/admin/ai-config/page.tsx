"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Bot, Check, Key, Loader2, Settings, Zap, X, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface ProviderConfig {
  id: string
  provider: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Agent {
  id: string
  name: string
  type: string
  prompt: string
  provider: string
  aiModel: string
  temperature: number
  maxTokens: number
  isActive: boolean
}

interface AvailableModel {
  provider: string
  model: string
  displayName: string
  description: string
}

interface ProviderHealth {
  OPENAI: boolean
  GOOGLE: boolean
  ANTHROPIC: boolean
}

export default function AIConfigPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Estados
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [providerHealth, setProviderHealth] = useState<ProviderHealth>({
    OPENAI: false,
    GOOGLE: false,
    ANTHROPIC: false
  })

  // Formulários
  const [newProviderForm, setNewProviderForm] = useState({
    provider: "",
    apiKey: "",
    isActive: true
  })

  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [agentForm, setAgentForm] = useState({
    provider: "",
    aiModel: "",
    temperature: 0.7,
    maxTokens: 1000
  })

  // Novo formulário para criar agentes
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    type: "",
    prompt: "",
    provider: "",
    aiModel: "",
    temperature: 0.7,
    maxTokens: 1000
  })

  // Carregar dados iniciais
  useEffect(() => {
    if (session?.user?.role === "USER") {
      toast.error("Acesso negado")
      return
    }
    loadData()
  }, [session])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/ai-config")
      
      if (!response.ok) {
        throw new Error("Erro ao carregar configurações")
      }

      const data = await response.json()
      setProviderConfigs(data.data.providerConfigs)
      setAgents(data.data.agents)
      setAvailableModels(data.data.availableModels)
      setProviderHealth(data.data.providerHealth)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar configurações de IA")
    } finally {
      setLoading(false)
    }
  }

  const saveProviderConfig = async () => {
    if (!newProviderForm.provider || !newProviderForm.apiKey) {
      toast.error("Provider e API Key são obrigatórios")
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProviderForm)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success(result.message)
      setNewProviderForm({ provider: "", apiKey: "", isActive: true })
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração")
    } finally {
      setSaving(false)
    }
  }

  const updateAgent = async (agentId: string) => {
    try {
      setSaving(true)
      const response = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          ...agentForm
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success(result.message)
      setEditingAgent(null)
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar agente")
    } finally {
      setSaving(false)
    }
  }

  const removeProvider = async (provider: string) => {
    if (!confirm(`Tem certeza que deseja remover a configuração do ${provider}?`)) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/ai-config?provider=${provider}`, {
        method: "DELETE"
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      loadData()
    } catch (error) {
      toast.error("Erro ao remover configuração")
    } finally {
      setSaving(false)
    }
  }

  const createAgent = async () => {
    if (!newAgentForm.name || !newAgentForm.type || !newAgentForm.prompt || !newAgentForm.provider || !newAgentForm.aiModel) {
      toast.error("Todos os campos são obrigatórios")
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/admin/ai-config/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgentForm)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success(result.message)
      setNewAgentForm({
        name: "",
        type: "",
        prompt: "",
        provider: "",
        aiModel: "",
        temperature: 0.7,
        maxTokens: 1000
      })
      setCreatingAgent(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar agente")
    } finally {
      setSaving(false)
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm("Tem certeza que deseja deletar este agente?")) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/ai-config/agents?agentId=${agentId}`, {
        method: "DELETE"
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success(result.message)
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar agente")
    } finally {
      setSaving(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "OPENAI": return "🤖"
      case "GOOGLE": return "🧠"
      case "ANTHROPIC": return "🔮"
      default: return "⚡"
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "OPENAI": return "bg-green-500"
      case "GOOGLE": return "bg-blue-500"
      case "ANTHROPIC": return "bg-purple-500"
      default: return "bg-gray-500"
    }
  }

  const getModelsByProvider = (provider: string) => {
    return availableModels.filter(m => m.provider === provider)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de IA</h1>
          <p className="text-muted-foreground">Gerencie providers e modelos de IA para seu escritório</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="health">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          {/* Adicionar novo provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Adicionar Provider
              </CardTitle>
              <CardDescription>
                Configure API Keys para diferentes providers de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newProviderForm.provider}
                    onValueChange={(value) => setNewProviderForm(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPENAI">OpenAI</SelectItem>
                      <SelectItem value="GOOGLE">Google (Gemini)</SelectItem>
                      <SelectItem value="ANTHROPIC">Anthropic (Claude)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-proj-... ou sua API Key"
                    value={newProviderForm.apiKey}
                    onChange={(e) => setNewProviderForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newProviderForm.isActive}
                  onCheckedChange={(checked: boolean) => setNewProviderForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Ativar provider</Label>
              </div>
              <Button onClick={saveProviderConfig} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>

          {/* Lista de providers configurados */}
          <div className="grid gap-4">
            {providerConfigs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getProviderColor(config.provider)}`}>
                        <span className="text-white text-lg">
                          {getProviderIcon(config.provider)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{config.provider}</h3>
                        <p className="text-sm text-muted-foreground">
                          Configurado em {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => removeProvider(config.provider)}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Botão para adicionar novo agente */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Agentes Especialistas
                  </CardTitle>
                  <CardDescription>
                    Crie agentes especializados para diferentes áreas do direito
                  </CardDescription>
                </div>
                <Button onClick={() => setCreatingAgent(true)} disabled={creatingAgent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agente
                </Button>
              </div>
            </CardHeader>

            {creatingAgent && (
              <CardContent className="space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <Label>Nome do Agente</Label>
                    <Input
                      placeholder="Ex: Especialista Previdenciário"
                      value={newAgentForm.name}
                      onChange={(e) => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Tipo/Especialidade</Label>
                    <Input
                      placeholder="Ex: Previdenciário, Trabalhista, Família, etc."
                      value={newAgentForm.type}
                      onChange={(e) => setNewAgentForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite a especialidade que este agente irá atender
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={newAgentForm.provider}
                      onValueChange={(value) => setNewAgentForm(prev => ({ ...prev, provider: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerConfigs.filter(p => p.isActive).map(p => (
                          <SelectItem key={p.provider} value={p.provider}>
                            {p.provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Modelo IA</Label>
                    <Select
                      value={newAgentForm.aiModel}
                      onValueChange={(value) => setNewAgentForm(prev => ({ ...prev, aiModel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsByProvider(newAgentForm.provider).map(model => (
                          <SelectItem key={model.model} value={model.model}>
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Prompt do Sistema</Label>
                  <Textarea
                    placeholder="Defina como o agente deve se comportar e responder..."
                    value={newAgentForm.prompt}
                    onChange={(e) => setNewAgentForm(prev => ({ ...prev, prompt: e.target.value }))}
                    className="min-h-32"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Temperature (0-1)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newAgentForm.temperature}
                      onChange={(e) => setNewAgentForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      min="100"
                      max="4000"
                      value={newAgentForm.maxTokens}
                      onChange={(e) => setNewAgentForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={createAgent} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Criar Agente
                  </Button>
                  <Button variant="outline" onClick={() => setCreatingAgent(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Lista de agentes existentes */}
          <div className="grid gap-4">{agents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Bot className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {agent.provider} - {agent.aiModel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Temp: {agent.temperature} | Tokens: {agent.maxTokens}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingAgent(agent.id)
                          setAgentForm({
                            provider: agent.provider,
                            aiModel: agent.aiModel,
                            temperature: agent.temperature,
                            maxTokens: agent.maxTokens
                          })
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {agent.type !== "RECEPTIONIST" && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteAgent(agent.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingAgent === agent.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Provider</Label>
                          <Select
                            value={agentForm.provider}
                            onValueChange={(value) => setAgentForm(prev => ({ ...prev, provider: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {providerConfigs.filter(p => p.isActive).map(p => (
                                <SelectItem key={p.provider} value={p.provider}>
                                  {p.provider}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Modelo</Label>
                          <Select
                            value={agentForm.aiModel}
                            onValueChange={(value) => setAgentForm(prev => ({ ...prev, aiModel: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getModelsByProvider(agentForm.provider).map(model => (
                                <SelectItem key={model.model} value={model.model}>
                                  {model.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Temperature (0-1)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={agentForm.temperature}
                            onChange={(e) => setAgentForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label>Max Tokens</Label>
                          <Input
                            type="number"
                            min="100"
                            max="4000"
                            value={agentForm.maxTokens}
                            onChange={(e) => setAgentForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => updateAgent(agent.id)} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setEditingAgent(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid gap-4">
            {Object.entries(providerHealth).map(([provider, isHealthy]) => (
              <Card key={provider}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getProviderColor(provider)}`}>
                        <span className="text-white text-lg">
                          {getProviderIcon(provider)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider}</h3>
                        <p className="text-sm text-muted-foreground">
                          Status da conexão com a API
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isHealthy ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 