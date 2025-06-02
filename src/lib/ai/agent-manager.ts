import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { AgentType } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"

export interface AgentConfig {
  id: string
  name: string
  type: AgentType
  prompt: string
  temperature: number
  maxTokens: number
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

export class AgentManager {
  private agents: Map<string, ChatOpenAI> = new Map()

  constructor() {
    this.initializeAgents()
  }

  private async initializeAgents() {
    try {
      // Verificar se a API key está configurada
      if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️ OPENAI_API_KEY não configurada - Agentes de IA não funcionarão")
        return
      }

      // Buscar todos os agentes ativos do banco
      const agentConfigs = await prisma.aiAgent.findMany({
        where: { isActive: true },
        include: { office: true }
      })

      // Inicializar cada agente com sua configuração
      for (const config of agentConfigs) {
        const llm = new ChatOpenAI({
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          apiKey: process.env.OPENAI_API_KEY,
        })
        
        this.agents.set(config.id, llm)
      }

      console.log(`🤖 Inicializados ${agentConfigs.length} agentes de IA`)
    } catch (error) {
      console.error("❌ Erro ao inicializar agentes:", error)
    }
  }

  async processMessage(
    agentId: string,
    message: string,
    context: MessageContext
  ): Promise<{
    response: string
    shouldTransfer: boolean
    suggestedAgent?: AgentType
    suggestedTags: string[]
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

      const llm = this.agents.get(agentId)
      if (!llm) {
        throw new Error(`LLM para agente ${agentId} não inicializado`)
      }

      // Construir histórico da conversa
      const conversationHistory = context.conversationHistory
        .slice(-10) // Últimas 10 mensagens
        .map(msg => `${msg.isFromClient ? 'Cliente' : 'Atendente'}: ${msg.content}`)
        .join('\n')

      // Criar prompt contextualizado
      const systemPrompt = this.buildSystemPrompt(
        agentConfig,
        context,
        conversationHistory
      )

      // Processar mensagem
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
      ]

      const response = await llm.invoke(messages)
      const responseText = response.content as string

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
        suggestedTags
      }

    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error)
      return {
        response: "Peço desculpas, mas ocorreu um erro interno. Um atendente humano entrará em contato em breve.",
        shouldTransfer: true,
        suggestedTags: []
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
    agentResponse: string
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
    agentResponse: string
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
        model: agent.model
      }))
    } catch (error) {
      console.error("❌ Erro ao buscar agentes:", error)
      return []
    }
  }

  async refreshAgents(): Promise<void> {
    this.agents.clear()
    await this.initializeAgents()
  }
}

// Singleton instance
export const agentManager = new AgentManager() 