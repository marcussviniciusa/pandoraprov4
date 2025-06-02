import type { Tool } from '@/generated/prisma'

interface ToolCall {
  toolName: string
  description: string
  requestId: string
  tool: Tool
}

export class ToolParser {
  static detectToolCalls(message: string, availableTools: Tool[]): ToolCall[] {
    const toolCalls: ToolCall[] = []
    
    // Patterns para detectar solicitações de ação em português
    const actionPatterns = [
      // Verbos de ação diretos
      /(?:execute|executar|fazer|realizar|processar|consultar|buscar|verificar|gerar|criar)\s+(.+)/i,
      // Solicitações educadas
      /(?:preciso que você|você pode|pode|você poderia|seria possível)\s+(.+)/i,
      // Pedidos formais
      /(?:solicito|peço|gostaria|necessito)\s+(.+)/i,
      // Comandos imperativos
      /(?:me ajude a|ajude-me a|quero que você)\s+(.+)/i,
      // Perguntas que indicam ação
      /(?:como faço para|como posso|onde posso)\s+(.+)/i
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
            requestId: this.generateRequestId(),
            tool: matchedTool
          })
        }
      }
    }

    // Se não encontrou patterns diretos, tenta busca por similaridade de contexto
    if (toolCalls.length === 0) {
      const contextualTool = this.findToolByContext(message, availableTools)
      if (contextualTool) {
        toolCalls.push({
          toolName: contextualTool.name,
          description: message.trim(),
          requestId: this.generateRequestId(),
          tool: contextualTool
        })
      }
    }

    return toolCalls
  }

  private static findBestTool(description: string, tools: Tool[]): Tool | null {
    let bestMatch: Tool | null = null
    let bestScore = 0

    for (const tool of tools) {
      if (!tool.isActive) continue
      
      const score = this.calculateSimilarity(description, tool.description)
      if (score > bestScore && score > 0.3) { // Threshold mínimo de 30%
        bestScore = score
        bestMatch = tool
      }
    }

    return bestMatch
  }

  private static findToolByContext(message: string, tools: Tool[]): Tool | null {
    const messageLower = message.toLowerCase()
    
    // Palavras-chave específicas por tipo de automação
    const keywordMappings = [
      {
        keywords: ['cpf', 'documento', 'consulta cpf', 'validar cpf', 'verificar cpf'],
        weight: 0.8
      },
      {
        keywords: ['cnpj', 'empresa', 'consulta cnpj', 'validar cnpj', 'verificar cnpj'],
        weight: 0.8
      },
      {
        keywords: ['documento', 'gerar documento', 'criar documento', 'pdf', 'contrato'],
        weight: 0.7
      },
      {
        keywords: ['email', 'enviar email', 'notificação', 'avisar'],
        weight: 0.6
      },
      {
        keywords: ['cálculo', 'calcular', 'valor', 'benefício', 'aposentadoria'],
        weight: 0.7
      }
    ]

    let bestTool: Tool | null = null
    let bestScore = 0

    for (const tool of tools) {
      if (!tool.isActive) continue
      
      let toolScore = 0
      const toolDescLower = tool.description.toLowerCase()

      // Verifica keywords específicas
      for (const mapping of keywordMappings) {
        const keywordScore = mapping.keywords.reduce((score, keyword) => {
          if (messageLower.includes(keyword) && toolDescLower.includes(keyword)) {
            return score + mapping.weight
          }
          return score
        }, 0)
        toolScore += keywordScore
      }

      // Adiciona score de similaridade geral
      toolScore += this.calculateSimilarity(message, tool.description) * 0.5

      if (toolScore > bestScore && toolScore > 0.4) {
        bestScore = toolScore
        bestTool = tool
      }
    }

    return bestTool
  }

  private static calculateSimilarity(text1: string, text2: string): number {
    // Normaliza textos
    const normalize = (text: string) => 
      text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2) // Remove palavras muito pequenas

    const words1 = normalize(text1)
    const words2 = normalize(text2)
    
    if (words1.length === 0 || words2.length === 0) return 0

    // Calcula interseção e união
    const intersection = words1.filter(word => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]
    
    // Jaccard similarity com peso para palavras mais específicas
    let similarity = intersection.length / union.length

    // Bonus para correspondências exatas de termos importantes
    const importantTerms = ['cpf', 'cnpj', 'documento', 'consulta', 'gerar', 'calcular', 'enviar']
    const exactMatches = importantTerms.filter(term => 
      text1.toLowerCase().includes(term) && text2.toLowerCase().includes(term)
    )
    
    similarity += exactMatches.length * 0.1 // 10% bonus por termo importante

    return Math.min(similarity, 1.0) // Garante que não exceda 1.0
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Método auxiliar para debug
  static analyzeMessage(message: string, availableTools: Tool[]): {
    detectedPatterns: string[]
    toolScores: { tool: string; score: number }[]
    selectedTool: string | null
  } {
    const actionPatterns = [
      /(?:execute|executar|fazer|realizar|processar|consultar|buscar|verificar|gerar|criar)\s+(.+)/i,
      /(?:preciso que você|você pode|pode|você poderia|seria possível)\s+(.+)/i,
      /(?:solicito|peço|gostaria|necessito)\s+(.+)/i,
      /(?:me ajude a|ajude-me a|quero que você)\s+(.+)/i,
      /(?:como faço para|como posso|onde posso)\s+(.+)/i
    ]

    const detectedPatterns = actionPatterns
      .map((pattern, index) => message.match(pattern) ? `Pattern ${index + 1}` : null)
      .filter(Boolean) as string[]

    const toolScores = availableTools.map(tool => ({
      tool: tool.name,
      score: this.calculateSimilarity(message, tool.description)
    })).sort((a, b) => b.score - a.score)

    const toolCalls = this.detectToolCalls(message, availableTools)
    const selectedTool = toolCalls.length > 0 ? toolCalls[0].toolName : null

    return {
      detectedPatterns,
      toolScores,
      selectedTool
    }
  }
} 