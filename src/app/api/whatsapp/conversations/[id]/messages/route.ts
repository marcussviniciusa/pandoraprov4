// ============================================================================
// API WHATSAPP MESSAGES - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// GET - Listar mensagens da conversa
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20') // Reduzido para carregamento mais rápido
    const before = searchParams.get('before')
    const after = searchParams.get('after')

    // Construir filtros otimizados
    const where: any = {
      conversationId: id,
      // Garantir que conversa pertence ao escritório via join direto
      conversation: {
        instance: {
          officeId: session.user.officeId
        }
      }
    }

    if (before) {
      where.timestamp = { lt: new Date(before) }
    }

    if (after) {
      where.timestamp = { gt: new Date(after) }
    }

    // Query otimizada - apenas uma query, campos mínimos
    const messages = await prisma.whatsAppMessage.findMany({
      where,
      select: {
        id: true,
        content: true,
        messageType: true,
        fromMe: true,
        timestamp: true,
        status: true,
        mediaUrl: true,
        mimetype: true,
        fileName: true,
        // Apenas campos essenciais do contact
        contact: {
          select: {
            id: true,
            name: true,
            pushName: true,
            phoneNumber: true,
            profilePicUrl: true
          }
        },
        // ToolExecution apenas se existir
        toolExecution: {
          select: {
            id: true,
            description: true,
            status: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    // Reverter ordem para mostrar mensagens mais antigas primeiro
    const orderedMessages = messages.reverse()

    return NextResponse.json({
      messages: orderedMessages,
      hasMore: messages.length === limit // Verificação simples se tem mais
    })

  } catch (error) {
    console.error('Erro ao listar mensagens WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 