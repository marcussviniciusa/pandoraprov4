# 🔧 Planejamento Detalhado - Sistema Tools/Webhooks

## 📋 Visão Geral da Implementação

### 🎯 Objetivo
Criar um sistema que permite aos agentes IA **executar ações reais** através de webhooks para automações n8n, transformando o Pandora Pro de um chatbot simples em uma plataforma de automação jurídica inteligente.

### 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │   Pandora Pro    │    │      n8n        │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │Create Tools │ │────▶│ │ IA Detection │ │────▶│ │  Webhook    │ │
│ │- Name       │ │    │ │ & Execution  │ │    │ │ Processing  │ │
│ │- Description│ │    │ │              │ │    │ │             │ │
│ │- Webhook URL│ │    │ └──────────────┘ │    │ └─────────────┘ │
│ └─────────────┘ │    │        │         │    │        │        │
└─────────────────┘    │        ▼         │    │        ▼        │
                       │ ┌──────────────┐ │    │ ┌─────────────┐ │
                       │ │ Callback API │ │◄───┤ │ Return API  │ │
                       │ │              │ │    │ │ Processing  │ │
                       │ └──────────────┘ │    │ └─────────────┘ │
                       └──────────────────┘    └─────────────────┘
```

---

## 🚀 Fase 1: Backend - Sistema Core (Semana 1)

### 📊 1.1 Schema de Banco de Dados
**Arquivo**: `prisma/schema.prisma`

```prisma
model Tool {
  id          String   @id @default(cuid())
  name        String
  description String   @db.Text // Para IA saber quando usar
  webhookUrl  String
  isActive    Boolean  @default(true)
  officeId    String
  office      Office   @relation(fields: [officeId], references: [id])
  
  // Auditoria
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  
  // Execuções
  executions  ToolExecution[]
  
  @@map("tools")
}

model ToolExecution {
  id          String   @id @default(cuid())
  toolId      String
  tool        Tool     @relation(fields: [toolId], references: [id])
  
  // Dados da execução
  requestId   String   @unique // Para callback
  description String   @db.Text // O que foi solicitado
  status      ToolExecutionStatus @default(PENDING)
  
  // Request/Response
  requestData Json?
  responseData Json?
  errorMessage String?
  
  // Timing
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  // Contexto
  conversationId String?
  agentId     String?
  
  @@map("tool_executions")
}

enum ToolExecutionStatus {
  PENDING
  SUCCESS
  ERROR
  TIMEOUT
}
```

### 🔧 1.2 API de Tools (CRUD)
**Arquivo**: `src/app/api/tools/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createToolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  webhookUrl: z.string().url('URL inválida'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tools = await prisma.tool.findMany({
      where: { officeId: session.user.officeId },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { executions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tools })
  } catch (error) {
    console.error('Erro ao buscar tools:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId || session.user.role === 'USER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, webhookUrl } = createToolSchema.parse(body)

    const tool = await prisma.tool.create({
      data: {
        name,
        description,
        webhookUrl,
        officeId: session.user.officeId,
        createdById: session.user.id,
      }
    })

    return NextResponse.json({ tool }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar tool:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

### 🤖 1.3 Parser de Tools na IA
**Arquivo**: `src/lib/ai/tool-parser.ts`

```typescript
interface ToolCall {
  toolName: string
  description: string
  requestId: string
}

export class ToolParser {
  static detectToolCalls(message: string, availableTools: Tool[]): ToolCall[] {
    const toolCalls: ToolCall[] = []
    
    // Patterns para detectar solicitações de ação
    const actionPatterns = [
      /(?:execute|executar|fazer|realizar|processar)\s+(.+)/i,
      /(?:preciso que você|você pode|pode)\s+(.+)/i,
      /(?:solicito|peço|gostaria)\s+(.+)/i
    ]

    for (const pattern of actionPatterns) {
      const match = message.match(pattern)
      if (match) {
        const description = match[1].trim()
        
        // Encontra a tool mais adequada baseada na descrição
        const matchedTool = this.findBestTool(description, availableTools)
        
        if (matchedTool) {
          toolCalls.push({
            toolName: matchedTool.name,
            description,
            requestId: generateRequestId()
          })
        }
      }
    }

    return toolCalls
  }

  private static findBestTool(description: string, tools: Tool[]): Tool | null {
    let bestMatch: Tool | null = null
    let bestScore = 0

    for (const tool of tools) {
      const score = this.calculateSimilarity(description, tool.description)
      if (score > bestScore && score > 0.3) { // Threshold mínimo
        bestScore = score
        bestMatch = tool
      }
    }

    return bestMatch
  }

  private static calculateSimilarity(text1: string, text2: string): number {
    // Implementação simples de similaridade baseada em palavras-chave
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    
    const intersection = words1.filter(word => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]
    
    return intersection.length / union.length
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
```

### 📡 1.4 Executor de Webhooks
**Arquivo**: `src/lib/webhook/executor.ts`

```typescript
import axios from 'axios'
import { prisma } from '@/lib/prisma'

export class WebhookExecutor {
  static async executeWebhook(toolId: string, description: string, requestId: string) {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId }
    })

    if (!tool) {
      throw new Error('Tool não encontrada')
    }

    // Cria registro de execução
    const execution = await prisma.toolExecution.create({
      data: {
        toolId,
        requestId,
        description,
        status: 'PENDING'
      }
    })

    try {
      // Envia webhook para n8n
      const response = await axios.post(tool.webhookUrl, {
        description,
        requestId,
        timestamp: new Date().toISOString(),
        metadata: {
          toolName: tool.name,
          executionId: execution.id
        }
      }, {
        timeout: 30000, // 30 segundos
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PandoraPro/1.0'
        }
      })

      // Atualiza como enviado (aguardando callback)
      await prisma.toolExecution.update({
        where: { id: execution.id },
        data: {
          requestData: {
            description,
            requestId,
            sentAt: new Date().toISOString()
          }
        }
      })

      return {
        success: true,
        executionId: execution.id,
        message: 'Processando sua solicitação...'
      }

    } catch (error) {
      // Atualiza como erro
      await prisma.toolExecution.update({
        where: { id: execution.id },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
          completedAt: new Date()
        }
      })

      throw error
    }
  }
}
```

### 🔄 1.5 API de Callback
**Arquivo**: `src/app/api/webhooks/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, success, result, error } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId é obrigatório' }, { status: 400 })
    }

    // Busca a execução
    const execution = await prisma.toolExecution.findUnique({
      where: { requestId }
    })

    if (!execution) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 })
    }

    // Atualiza resultado
    await prisma.toolExecution.update({
      where: { id: execution.id },
      data: {
        status: success ? 'SUCCESS' : 'ERROR',
        responseData: result || null,
        errorMessage: error || null,
        completedAt: new Date()
      }
    })

    // Aqui você pode adicionar lógica para notificar o frontend em tempo real
    // via WebSockets, Server-Sent Events, etc.

    return NextResponse.json({ 
      message: 'Callback processado com sucesso',
      executionId: execution.id 
    })

  } catch (error) {
    console.error('Erro no callback:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

## 🎨 Fase 2: Frontend - Interface Admin (Semana 2)

### 🖥️ 2.1 Página de Gerenciamento de Tools
**Arquivo**: `src/app/admin/tools/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Settings, Trash2, Activity } from 'lucide-react'
import { ToolCard } from './components/ToolCard'
import { CreateToolDialog } from './components/CreateToolDialog'
import { useToast } from '@/hooks/use-toast'

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

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
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

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tools & Automações</h1>
          <p className="text-muted-foreground">
            Configure automações que os agentes IA podem executar
          </p>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tool
        </Button>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhuma tool configurada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira automação para expandir as capacidades da IA
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira tool
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <ToolCard 
              key={tool.id} 
              tool={tool} 
              onUpdate={loadTools}
            />
          ))}
        </div>
      )}

      <CreateToolDialog 
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onToolCreated={handleToolCreated}
      />
    </div>
  )
}
```

### 🎛️ 2.2 Dialog de Criação de Tool
**Arquivo**: `src/app/admin/tools/components/CreateToolDialog.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  webhookUrl: z.string().url('URL inválida'),
})

type FormData = z.infer<typeof formSchema>

interface CreateToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToolCreated: (tool: any) => void
}

export function CreateToolDialog({ open, onOpenChange, onToolCreated }: CreateToolDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      webhookUrl: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        onToolCreated(result.tool)
        form.reset()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao criar tool',
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
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Nova Tool de Automação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tool</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Consultar CPF, Gerar Documento" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome descritivo para identificar a automação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Para IA)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva quando e como a IA deve usar esta tool..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Explique detalhadamente quando a IA deve usar esta automação.
                    Seja específico sobre contextos e palavras-chave.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Webhook (n8n)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://sua-instancia-n8n.com/webhook/..."
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    URL do webhook do seu workflow n8n que processará a automação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Tool'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🔗 Integração com Sistema de IA Existente

### 🤖 Modificação no Serviço de IA
**Arquivo**: `src/lib/ai/ai-service.ts` (modificação)

```typescript
// Adicionar ao método sendMessage
export async function sendMessage(
  message: string,
  agentId: string,
  conversationId?: string
): Promise<AIResponse> {
  // ... código existente ...

  // NOVA FUNCIONALIDADE: Detectar e executar tools
  const availableTools = await prisma.tool.findMany({
    where: { 
      officeId: agent.officeId,
      isActive: true 
    }
  })

  const toolCalls = ToolParser.detectToolCalls(message, availableTools)
  
  let toolResults: string[] = []
  
  for (const toolCall of toolCalls) {
    try {
      const tool = availableTools.find(t => t.name === toolCall.toolName)
      if (tool) {
        const result = await WebhookExecutor.executeWebhook(
          tool.id, 
          toolCall.description, 
          toolCall.requestId
        )
        toolResults.push(`⚡ Executando: ${tool.name} - ${result.message}`)
      }
    } catch (error) {
      toolResults.push(`❌ Erro ao executar ${toolCall.toolName}: ${error.message}`)
    }
  }

  // Incluir resultados na resposta da IA
  if (toolResults.length > 0) {
    const toolContext = toolResults.join('\n')
    response.content += `\n\n${toolContext}`
  }

  // ... resto do código existente ...
}
```

---

## 📝 Exemplos de Configuração n8n

### 🎯 Workflow n8n - Consulta CPF
```json
{
  "name": "Consulta CPF Workflow",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "consulta-cpf",
        "responseMode": "responseNode"
      },
      "id": "webhook-trigger",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "https://api.consulta-cpf.com/v1/cpf",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer SUA_API_KEY"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "cpf",
              "value": "={{$json.description.match(/\\d{11}/)[0]}}"
            }
          ]
        }
      },
      "id": "http-request",
      "name": "Consultar CPF",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "https://pandora-pro.com/api/webhooks/callback",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "requestId",
              "value": "={{$('Webhook').item.json.requestId}}"
            },
            {
              "name": "success",
              "value": "={{$json.status === 200}}"
            },
            {
              "name": "result",
              "value": "={{$json}}"
            }
          ]
        }
      },
      "id": "callback",
      "name": "Enviar Resultado",
      "type": "n8n-nodes-base.httpRequest",
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Consultar CPF",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Consultar CPF": {
      "main": [
        [
          {
            "node": "Enviar Resultado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 📊 Métricas e Monitoramento

### 📈 Dashboard de Tools
- **Execuções por tool** (últimos 30 dias)
- **Taxa de sucesso/erro** por tool  
- **Tempo médio de execução**
- **Tools mais utilizadas**
- **Logs de erro detalhados**

### 🚨 Alertas
- **Webhook fora do ar** (timeout > 30s)
- **Taxa de erro alta** (> 20% em 1 hora)
- **Volume anormal** de execuções

---

## 🗓️ Cronograma de Implementação

### **Semana 1: Backend Foundation**
- **Dias 1-2**: Schema de banco + Migrações
- **Dias 3-4**: APIs de Tools (CRUD) + Parser IA
- **Dias 5-7**: Executor de Webhooks + API Callback

### **Semana 2: Frontend + Integração**
- **Dias 1-3**: Interface Admin (listagem + criação)
- **Dias 4-5**: Integração com sistema IA existente
- **Dias 6-7**: Testes + Refinamentos

---

## 🎯 Critérios de Sucesso

### ✅ Funcional
- [ ] Admin pode criar/editar/excluir tools
- [ ] IA detecta solicitações e executa tools automaticamente  
- [ ] Webhooks são enviados corretamente para n8n
- [ ] Callbacks são processados e resultados exibidos
- [ ] Sistema funciona de forma assíncrona

### ✅ Técnico  
- [ ] Performance < 2s para detectar e executar tool
- [ ] Retry automático em caso de falha de webhook
- [ ] Logs detalhados de todas as execuções
- [ ] Validação de entrada robusta
- [ ] Tratamento de erros gracioso

### ✅ UX/UI
- [ ] Interface intuitiva para configurar tools
- [ ] Feedback visual de execução em tempo real
- [ ] Histórico detalhado de execuções
- [ ] Documentação clara para configuração n8n

---

**🚀 Este sistema transformará o Pandora Pro em uma plataforma de automação jurídica verdadeiramente inteligente, onde a IA não apenas conversa, mas executa ações reais!** 