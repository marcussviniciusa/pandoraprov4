import axios, { AxiosError } from 'axios'
import { prisma } from '@/lib/prisma'
import type { Tool, ToolExecutionStatus } from '@/generated/prisma'

interface WebhookExecutionResult {
  success: boolean
  executionId: string
  message: string
  data?: any
}

interface WebhookPayload {
  description: string
  requestId: string
  timestamp: string
  metadata: {
    toolName: string
    executionId: string
    officeId: string
  }
}

export class WebhookExecutor {
  static async executeWebhook(
    tool: Tool, 
    description: string, 
    requestId: string,
    conversationId?: string,
    agentId?: string
  ): Promise<WebhookExecutionResult> {
    
    // Cria registro de execução
    const execution = await prisma.toolExecution.create({
      data: {
        toolId: tool.id,
        requestId,
        description,
        status: 'PENDING',
        conversationId,
        agentId
      }
    })

    try {
      // Prepara payload para n8n
      const payload: WebhookPayload = {
        description,
        requestId,
        timestamp: new Date().toISOString(),
        metadata: {
          toolName: tool.name,
          executionId: execution.id,
          officeId: tool.officeId
        }
      }

      console.log(`🔧 Executando tool "${tool.name}" - RequestID: ${requestId}`)
      
      // Envia webhook para n8n
      const response = await axios.post(tool.webhookUrl, payload, {
        timeout: 30000, // 30 segundos
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PandoraPro/1.0',
          'X-Pandora-Request-ID': requestId,
          'X-Pandora-Tool-ID': tool.id
        },
        validateStatus: (status) => status < 500 // Aceita até 4xx
      })

      // Atualiza execução com dados do request
      await prisma.toolExecution.update({
        where: { id: execution.id },
        data: {
          requestData: {
            sent: true,
            sentAt: new Date().toISOString(),
            responseStatus: response.status
          }
        }
      })

      // Se n8n retornou resposta síncrona
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Tool executada com sucesso - Status: ${response.status}`)
        
        // Se há dados de resposta imediata, marca como concluída
        if (response.data && Object.keys(response.data).length > 0) {
          await this.handleImmediateResponse(execution.id, response.data, true)
          
          return {
            success: true,
            executionId: execution.id,
            message: 'Automação executada com sucesso!',
            data: response.data
          }
        }
      }

      // Resposta assíncrona - aguardando callback
      return {
        success: true,
        executionId: execution.id,
        message: 'Processando sua solicitação... Aguarde o resultado.'
      }

    } catch (error) {
      console.error(`❌ Erro ao executar tool "${tool.name}":`, error)
      
      let errorMessage = 'Erro desconhecido'
      let status: ToolExecutionStatus = 'ERROR'

      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Timeout: O webhook demorou mais de 30 segundos para responder'
          status = 'TIMEOUT'
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`
        } else if (error.request) {
          errorMessage = 'Não foi possível conectar ao webhook'
        } else {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Atualiza execução como erro
      await prisma.toolExecution.update({
        where: { id: execution.id },
        data: {
          status,
          errorMessage,
          completedAt: new Date(),
          requestData: {
            error: errorMessage,
            errorCode: error instanceof AxiosError ? error.code || 'UNKNOWN' : 'UNKNOWN',
            timestamp: new Date().toISOString()
          }
        }
      })

      throw new Error(`Falha na automação: ${errorMessage}`)
    }
  }

  // Processa resposta imediata (síncrona) do webhook
  private static async handleImmediateResponse(
    executionId: string, 
    responseData: any, 
    success: boolean
  ): Promise<void> {
    await prisma.toolExecution.update({
      where: { id: executionId },
      data: {
        status: success ? 'SUCCESS' : 'ERROR',
        responseData: responseData,
        completedAt: new Date()
      }
    })
  }

  // Método para processar callback do n8n
  static async handleCallback(
    requestId: string, 
    success: boolean, 
    result: any, 
    error?: string
  ): Promise<{ executionId: string; found: boolean }> {
    
    const execution = await prisma.toolExecution.findUnique({
      where: { requestId },
      include: { tool: true }
    })

    if (!execution) {
      console.warn(`⚠️ Callback recebido para requestId inexistente: ${requestId}`)
      return { executionId: '', found: false }
    }

    const updateData: any = {
      status: success ? 'SUCCESS' : 'ERROR',
      completedAt: new Date(),
      responseData: result || null
    }

    if (error) {
      updateData.errorMessage = error
    }

    await prisma.toolExecution.update({
      where: { id: execution.id },
      data: updateData
    })

    const statusEmoji = success ? '✅' : '❌'
    console.log(`${statusEmoji} Callback processado para tool "${execution.tool.name}" - Status: ${success ? 'SUCCESS' : 'ERROR'}`)

    return { executionId: execution.id, found: true }
  }

  // Busca execuções pendentes para cleanup/timeout
  static async getExecutionsWithTimeout(timeoutMinutes: number = 5) {
    const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000)
    
    return await prisma.toolExecution.findMany({
      where: {
        status: 'PENDING',
        startedAt: {
          lt: timeoutDate
        }
      },
      include: { tool: true }
    })
  }

  // Marca execuções como timeout
  static async markAsTimeout(executionIds: string[]) {
    if (executionIds.length === 0) return

    await prisma.toolExecution.updateMany({
      where: {
        id: { in: executionIds }
      },
      data: {
        status: 'TIMEOUT',
        errorMessage: 'Timeout: Não recebeu callback do n8n no tempo esperado',
        completedAt: new Date()
      }
    })

    console.log(`⏰ Marcadas ${executionIds.length} execuções como timeout`)
  }

  // Retry de execução falhada
  static async retryExecution(executionId: string): Promise<WebhookExecutionResult> {
    const execution = await prisma.toolExecution.findUnique({
      where: { id: executionId },
      include: { tool: true }
    })

    if (!execution || !execution.tool) {
      throw new Error('Execução não encontrada')
    }

    if (execution.status === 'PENDING') {
      throw new Error('Execução ainda está pendente')
    }

    // Cria nova execução baseada na anterior
    const newRequestId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return await this.executeWebhook(
      execution.tool,
      execution.description,
      newRequestId,
      execution.conversationId || undefined,
      execution.agentId || undefined
    )
  }

  // Estatísticas de execução
  static async getExecutionStats(officeId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const stats = await prisma.toolExecution.groupBy({
      by: ['status'],
      where: {
        tool: { officeId },
        startedAt: { gte: since }
      },
      _count: true
    })

    const total = stats.reduce((sum, stat) => sum + stat._count, 0)
    
    return {
      total,
      success: stats.find(s => s.status === 'SUCCESS')?._count || 0,
      error: stats.find(s => s.status === 'ERROR')?._count || 0,
      pending: stats.find(s => s.status === 'PENDING')?._count || 0,
      timeout: stats.find(s => s.status === 'TIMEOUT')?._count || 0,
      successRate: total > 0 ? ((stats.find(s => s.status === 'SUCCESS')?._count || 0) / total * 100).toFixed(1) : '0.0'
    }
  }
} 