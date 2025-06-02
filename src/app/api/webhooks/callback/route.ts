import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WebhookExecutor } from '@/lib/webhook/executor'
import { z } from 'zod'

const callbackSchema = z.object({
  requestId: z.string().min(1, 'requestId é obrigatório'),
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    toolName: z.string().optional(),
    executionTime: z.number().optional(),
    source: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔄 Callback recebido:', { requestId: body.requestId, success: body.success })
    
    // Validação do payload
    const { requestId, success, result, error, metadata } = callbackSchema.parse(body)

    // Processa callback através do WebhookExecutor
    const { executionId, found } = await WebhookExecutor.handleCallback(
      requestId,
      success,
      result,
      error
    )

    if (!found) {
      console.warn(`⚠️ RequestId não encontrado: ${requestId}`)
      return NextResponse.json(
        { error: 'Execução não encontrada', requestId }, 
        { status: 404 }
      )
    }

    // Log adicional se há metadata
    if (metadata) {
      console.log('📊 Metadata do callback:', {
        toolName: metadata.toolName,
        executionTime: metadata.executionTime,
        source: metadata.source
      })
    }

    // Aqui você pode adicionar lógica para notificar o frontend em tempo real
    // via WebSockets, Server-Sent Events, etc.
    // TODO: Implementar notificação real-time

    return NextResponse.json({ 
      message: 'Callback processado com sucesso',
      executionId,
      status: success ? 'SUCCESS' : 'ERROR'
    })

  } catch (error) {
    console.error('❌ Erro no callback:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos no callback', 
          details: error.errors 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno no processamento do callback' }, 
      { status: 500 }
    )
  }
}

// GET para healthcheck da API
export async function GET() {
  return NextResponse.json({
    message: 'API de callback ativa',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
} 