// ============================================================================
// API WHATSAPP MESSAGES - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    id: string
  }
}

// ============================================================================
// GET - Listar mensagens da conversa
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // timestamp ISO para paginação
    const after = searchParams.get('after')
    const messageType = searchParams.get('messageType')
    const fromMe = searchParams.get('fromMe')

    // Verificar se conversa existe e pertence ao escritório
    const conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id: params.id,
        instance: {
          officeId: session.user.officeId
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Construir filtros
    const where: any = {
      conversationId: params.id
    }

    if (before) {
      where.timestamp = { lt: new Date(before) }
    }

    if (after) {
      where.timestamp = { gt: new Date(after) }
    }

    if (messageType) {
      where.messageType = messageType
    }

    if (fromMe !== null && fromMe !== undefined) {
      where.fromMe = fromMe === 'true'
    }

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              pushName: true,
              phoneNumber: true,
              profilePicUrl: true
            }
          },
          toolExecution: {
            select: {
              id: true,
              description: true,
              status: true,
              responseData: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.whatsAppMessage.count({ where })
    ])

    // Reverter ordem para mostrar mensagens mais antigas primeiro
    const orderedMessages = messages.reverse()

    return NextResponse.json({
      messages: orderedMessages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: total > page * limit
      },
      conversation: {
        id: conversation.id,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt
      }
    })

  } catch (error) {
    console.error('Erro ao listar mensagens WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 