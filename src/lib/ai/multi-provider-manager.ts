import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { AIProvider, AIModel, AgentType } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { ToolParser } from "@/lib/ai/tool-parser"
import { WebhookExecutor } from "@/lib/webhook/executor"

export interface AgentConfig {
  id: string
  name: string
  type: AgentType
  prompt: string
  temperature: number
  maxTokens: number
  provider: AIProvider
  aiModel: AIModel
  model: string
}

export interface MessageContext {
  clientPhone: string
  clientName?: string
  conversationHistory: Array<{
    content: string
    isFromClient: boolean
    timestamp: Date
  }>
  currentSpecialty?: string
}

// Mapeamento de modelos para strings dos providers
const MODEL_MAPPING = {
  [AIModel.GPT_4_1_MINI]: "gpt-4.1-mini",
  [AIModel.GPT_4O_MINI]: "gpt-4o-mini", 
  [AIModel.GPT_4_5]: "gpt-4.5",
  [AIModel.GEMINI_2_5_PRO]: "gemini-2.5-pro",
  [AIModel.CLAUDE_3_7]: "claude-3-5-sonnet-20241022",
  [AIModel.CLAUDE_4]: "claude-4-latest"
}

export class MultiProviderAIManager {
  private agents: Map<string, any> = new Map() // eslint-disable-line @typescript-eslint/no-explicit-any
  private providerConfigs: Map<string, Map<AIProvider, string>> = new Map() // officeId -> provider -> apiKey

  constructor() {
    this.initializeAgents()
  }

  private async initializeAgents() {
    try {
      // Buscar todas as configurações de providers por escritório
      const providerConfigs = await prisma.aIProviderConfig.findMany({
        where: { isActive: true },
        include: { office: true }
      })

      // Organizar configs por escritório
      for (const config of providerConfigs) {
        if (!this.providerConfigs.has(config.officeId)) {
          this.providerConfigs.set(config.officeId, new Map())
        }
        this.providerConfigs.get(config.officeId)?.set(config.provider, config.apiKey)
      }

      // Buscar todos os agentes ativos
      const agentConfigs = await prisma.aiAgent.findMany({
        where: { isActive: true },
        include: { office: true }
      })

      // Inicializar cada agente com seu provider específico
      for (const config of agentConfigs) {
        const apiKey = this.providerConfigs.get(config.officeId)?.get(config.provider)
        
        if (!apiKey) {
          console.warn(`⚠️ API Key não encontrada para ${config.provider} no escritório ${config.office.name}`)
          continue
        }

        const llm = this.createProviderLLM(config.provider, config.aiModel, {
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          apiKey
        })
        
        if (llm) {
          this.agents.set(config.id, llm)
        }
      }

      console.log(`🤖 Inicializados ${this.agents.size} agentes de IA com múltiplos providers`)
    } catch (error) {
      console.error("❌ Erro ao inicializar agentes:", error)
    }
  }

  private createProviderLLM(provider: AIProvider, model: AIModel, config: {
    temperature: number
    maxTokens: number
    apiKey: string
  }) {
    const modelString = MODEL_MAPPING[model]

    try {
      switch (provider) {
        case AIProvider.OPENAI:
          return new ChatOpenAI({
            model: modelString,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            apiKey: config.apiKey,
          })

        case AIProvider.GOOGLE:
          return new ChatGoogleGenerativeAI({
            model: modelString,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
            apiKey: config.apiKey,
          })

        case AIProvider.ANTHROPIC:
          return new ChatAnthropic({
            model: modelString,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            apiKey: config.apiKey,
          })

        default:
          console.error(`❌ Provider não suportado: ${provider}`)
          return null
      }
    } catch (error) {
      console.error(`❌ Erro ao criar LLM para ${provider}:`, error)
      return null
    }
  }

  async processMessage(
    agentId: string,
    message: string,
    context: MessageContext,
    conversationId?: string
  ): Promise<{
    response: string
    shouldTransfer: boolean
    suggestedAgent?: AgentType
    suggestedTags: string[]
    provider: AIProvider
    model: AIModel
    toolExecutions?: Array<{
      toolName: string
      executionId: string
      status: string
      message: string
    }>
  }> {
    try {
      // Buscar configuração do agente
      const agentConfig = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        include: { office: true }
      })

      if (!agentConfig) {
        throw new Error(`Agente ${agentId} não encontrado`)
      }

      // **NOVA FUNCIONALIDADE: Detectar e executar tools**
      const availableTools = await prisma.tool.findMany({
        where: { 
          officeId: agentConfig.officeId,
          isActive: true 
        }
      })

      const toolCalls = ToolParser.detectToolCalls(message, availableTools)
      let toolResults: string[] = []
      let toolExecutions: Array<{
        toolName: string
        executionId: string
        status: string
        message: string
      }> = []
      
      // Executar tools detectadas
      for (const toolCall of toolCalls) {
        try {
          console.log(`🔧 Executando tool: ${toolCall.toolName}`)
          const result = await WebhookExecutor.executeWebhook(
            toolCall.tool, 
            toolCall.description, 
            toolCall.requestId,
            conversationId,
            agentId
          )
          
          toolResults.push(`⚡ **${toolCall.toolName}**: ${result.message}`)
          toolExecutions.push({
            toolName: toolCall.toolName,
            executionId: result.executionId,
            status: result.success ? 'EXECUTING' : 'ERROR',
            message: result.message
          })

          console.log(`✅ Tool ${toolCall.toolName} executada: ${result.message}`)
        } catch (error: any) {
          const errorMsg = `❌ Erro ao executar ${toolCall.toolName}: ${error.message}`
          toolResults.push(errorMsg)
          toolExecutions.push({
            toolName: toolCall.toolName,
            executionId: '',
            status: 'ERROR',
            message: error.message
          })
          console.error(errorMsg)
        }
      }

      const llm = this.agents.get(agentId)
      if (!llm) {
        throw new Error(`LLM para agente ${agentId} não inicializado ou API Key inválida`)
      }

      // Construir histórico da conversa
      const conversationHistory = context.conversationHistory
        .slice(-10) // Últimas 10 mensagens
        .map(msg => `${msg.isFromClient ? 'Cliente' : 'Atendente'}: ${msg.content}`)
        .join('\n')

      // Criar prompt contextualizado incluindo execução de tools
      let systemPrompt = this.buildSystemPrompt(
        agentConfig,
        context,
        conversationHistory
      )

      // Adicionar contexto de tools executadas
      if (toolResults.length > 0) {
        systemPrompt += `\n\nAÇÕES EXECUTADAS AUTOMATICAMENTE:\n${toolResults.join('\n')}\n\nCONSIDERE ESSAS AÇÕES NA SUA RESPOSTA AO CLIENTE.`
      }

      // Processar mensagem
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
      ]

      const response = await llm.invoke(messages)
      let responseText = response.content as string

      // Incluir informações sobre tools na resposta se foram executadas
      if (toolResults.length > 0) {
        responseText += `\n\n${toolResults.join('\n')}`
      }

      // Analisar se deve transferir para outro agente
      const transferAnalysis = await this.analyzeTransferNeed(
        agentConfig,
        message,
        responseText
      )

      // Sugerir tags baseadas no conteúdo
      const suggestedTags = await this.suggestTags(
        agentConfig.officeId,
        message,
        responseText
      )

      return {
        response: responseText,
        shouldTransfer: transferAnalysis.shouldTransfer,
        suggestedAgent: transferAnalysis.suggestedAgent,
        suggestedTags,
        provider: agentConfig.provider,
        model: agentConfig.aiModel,
        toolExecutions: toolExecutions.length > 0 ? toolExecutions : undefined
      }

    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error)
      return {
        response: "Peço desculpas, mas ocorreu um erro interno. Um atendente humano entrará em contato em breve.",
        shouldTransfer: true,
        suggestedTags: [],
        provider: AIProvider.OPENAI, // fallback
        model: AIModel.GPT_4O_MINI // fallback
      }
    }
  }

  private buildSystemPrompt(
    agentConfig: AgentConfig,
    context: MessageContext,
    conversationHistory: string
  ): string {
    return `${agentConfig.prompt}

CONTEXTO ATUAL:
- Cliente: ${context.clientName || 'Não identificado'}
- Telefone: ${context.clientPhone}
- Especialidade atual: ${context.currentSpecialty || 'Não definida'}
- Modelo IA: ${agentConfig.provider} ${MODEL_MAPPING[agentConfig.aiModel]}

HISTÓRICO DA CONVERSA:
${conversationHistory || 'Primeira interação'}

INSTRUÇÕES ESPECÍFICAS:
1. Seja sempre cordial, empático e profissional
2. Use linguagem acessível, evite jargões jurídicos excessivos
3. Se não souber algo específico, seja honesto e ofereça encaminhar para especialista
4. Sempre colete informações importantes sobre o caso
5. Se identificar que o caso não é da sua especialidade, sugira transferência
6. Mantenha respostas objetivas mas humanizadas
7. Sempre termine oferecendo próximos passos ou perguntando se há dúvidas

RESPONDA APENAS COM O TEXTO DA RESPOSTA AO CLIENTE, SEM METADADOS OU INSTRUÇÕES.`
  }

  private async analyzeTransferNeed(
    agentConfig: AgentConfig,
    clientMessage: string,
    _agentResponse: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{
    shouldTransfer: boolean
    suggestedAgent?: AgentType
  }> {
    // Lógica simplificada - pode ser expandida com ML mais avançado
    const message = clientMessage.toLowerCase()
    
    // Palavras-chave por especialidade
    const keywords = {
      [AgentType.BPC_LOAS]: [
        'bpc', 'loas', 'benefício continuado', 'deficiência', 'idoso 65',
        'baixa renda', 'assistencial'
      ],
      [AgentType.PREVIDENCIARIO]: [
        'aposentadoria', 'inss', 'previdência', 'benefício', 'auxílio doença',
        'pensão morte', 'revisão', 'contribuição'
      ],
      [AgentType.TRABALHISTA]: [
        'trabalho', 'emprego', 'demissão', 'rescisão', 'hora extra',
        'assédio', 'acidente trabalho', 'fgts', 'trabalhista'
      ]
    }

    // Se agente atual não é especialista na área mencionada
    for (const [agentType, keywordList] of Object.entries(keywords)) {
      if (agentType !== agentConfig.type) {
        const hasKeywords = keywordList.some(keyword => 
          message.includes(keyword)
        )
        
        if (hasKeywords) {
          return {
            shouldTransfer: true,
            suggestedAgent: agentType as AgentType
          }
        }
      }
    }

    return { shouldTransfer: false }
  }

  private async suggestTags(
    officeId: string,
    clientMessage: string,
    _agentResponse: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<string[]> {
    try {
      // Buscar tags disponíveis para o escritório
      const availableTags = await prisma.tag.findMany({
        where: { officeId, isActive: true }
      })

      const message = clientMessage.toLowerCase()
      const suggestedTags: string[] = []

      // Mapear palavras-chave para tags
      const tagKeywords: Record<string, string[]> = {
        'Urgente': ['urgente', 'emergência', 'rápido', 'pressa'],
        'BPC/LOAS Idoso': ['bpc', 'loas', 'idoso', '65 anos'],
        'BPC/LOAS Deficiente': ['bpc', 'loas', 'deficiência', 'deficiente'],
        'Aposentadoria': ['aposentadoria', 'aposentar'],
        'Auxílio-Doença': ['auxílio doença', 'afastamento', 'doente'],
        'Pensão por Morte': ['pensão', 'morte', 'óbito', 'falecimento'],
        'Trabalhista': ['trabalho', 'emprego', 'demissão'],
        'Documentação Pendente': ['documento', 'documentação', 'papel', 'comprovante']
      }

      // Verificar quais tags fazem sentido
      for (const tag of availableTags) {
        const keywords = tagKeywords[tag.name] || []
        const hasKeywords = keywords.some(keyword => message.includes(keyword))
        
        if (hasKeywords && !suggestedTags.includes(tag.name)) {
          suggestedTags.push(tag.name)
        }
      }

      return suggestedTags.slice(0, 3) // Máximo 3 tags
    } catch (error) {
      console.error("❌ Erro ao sugerir tags:", error)
      return []
    }
  }

  async getAvailableAgents(officeId: string): Promise<AgentConfig[]> {
    try {
      const agents = await prisma.aiAgent.findMany({
        where: { officeId, isActive: true },
        include: { office: true }
      })

      return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        prompt: agent.prompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        provider: agent.provider,
        aiModel: agent.aiModel,
        model: MODEL_MAPPING[agent.aiModel]
      }))
    } catch (error) {
      console.error("❌ Erro ao buscar agentes:", error)
      return []
    }
  }

  async getAvailableModels(): Promise<Array<{
    provider: AIProvider
    model: AIModel
    displayName: string
    description: string
  }>> {
    return [
      {
        provider: AIProvider.OPENAI,
        model: AIModel.GPT_4_1_MINI,
        displayName: "GPT-4.1 Mini",
        description: "Modelo eficiente e rápido da OpenAI"
      },
      {
        provider: AIProvider.OPENAI,
        model: AIModel.GPT_4O_MINI,
        displayName: "GPT-4o Mini",
        description: "Modelo otimizado da OpenAI"
      },
      {
        provider: AIProvider.OPENAI,
        model: AIModel.GPT_4_5,
        displayName: "GPT-4.5",
        description: "Modelo mais avançado da OpenAI"
      },
      {
        provider: AIProvider.GOOGLE,
        model: AIModel.GEMINI_2_5_PRO,
        displayName: "Gemini 2.5 Pro",
        description: "Modelo avançado do Google"
      },
      {
        provider: AIProvider.ANTHROPIC,
        model: AIModel.CLAUDE_3_7,
        displayName: "Claude 3.7",
        description: "Modelo analítico da Anthropic"
      },
      {
        provider: AIProvider.ANTHROPIC,
        model: AIModel.CLAUDE_4,
        displayName: "Claude 4",
        description: "Modelo mais recente da Anthropic"
      }
    ]
  }

  async refreshAgents(): Promise<void> {
    this.agents.clear()
    this.providerConfigs.clear()
    await this.initializeAgents()
  }

  async checkProviderHealth(officeId: string): Promise<Record<AIProvider, boolean>> {
    const health: Record<AIProvider, boolean> = {
      [AIProvider.OPENAI]: false,
      [AIProvider.GOOGLE]: false,
      [AIProvider.ANTHROPIC]: false
    }

    try {
      const configs = this.providerConfigs.get(officeId)
      if (!configs) return health

      // Testar cada provider com uma mensagem simples
      for (const [provider, apiKey] of configs.entries()) {
        try {
          const testLLM = this.createProviderLLM(
            provider,
            provider === AIProvider.OPENAI ? AIModel.GPT_4O_MINI :
            provider === AIProvider.GOOGLE ? AIModel.GEMINI_2_5_PRO :
            AIModel.CLAUDE_3_7,
            {
              temperature: 0,
              maxTokens: 10,
              apiKey
            }
          )

          if (testLLM) {
            await testLLM.invoke([new HumanMessage("test")])
            health[provider] = true
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.warn(`⚠️ Provider ${provider} não está funcionando:`, errorMessage)
        }
      }
    } catch (error) {
      console.error("❌ Erro ao verificar saúde dos providers:", error)
    }

    return health
  }
}

// Singleton instance
export const multiProviderAIManager = new MultiProviderAIManager() 