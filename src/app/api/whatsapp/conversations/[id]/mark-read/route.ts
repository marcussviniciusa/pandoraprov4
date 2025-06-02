// ============================================================================
// API WHATSAPP MARK READ - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient } from '@/lib/evolution-api'

interface Params {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// POST - Marcar conversa como lida
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    // Parse JSON opcional - pode não ter body
    let messageId: string | undefined
    try {
      const body = await request.json()
      messageId = body?.messageId
    } catch {
      // Sem body JSON, marcar todas as mensagens como lidas
      messageId = undefined
    }

    // Verificar se conversa existe e pertence ao escritório
    const conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id,
        instance: {
          officeId: session.user.officeId
        }
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Se messageId específico foi fornecido, marcar apenas essa mensagem
    if (messageId) {
      const message = await prisma.whatsAppMessage.findFirst({
        where: {
          id: messageId,
          conversationId: id,
          fromMe: false // Só podemos marcar como lida mensagens que recebemos
        }
      })

      if (!message) {
        return NextResponse.json(
          { error: 'Mensagem não encontrada ou não pode ser marcada como lida' },
          { status: 404 }
        )
      }

      // Marcar como lida na Evolution API se instância estiver conectada
      if (conversation.instance.status === 'CONNECTED') {
        try {
          const evolutionClient = getEvolutionAPIClient()
          await evolutionClient.markMessageAsRead(
            conversation.instance.name,
            conversation.remoteJid,
            message.messageId
          )
        } catch (evolutionError) {
          console.error('Erro ao marcar mensagem como lida na Evolution API:', evolutionError)
          // Continua mesmo se falhar na API externa
        }
      }

      // Atualizar status da mensagem no banco
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { status: 'READ' }
      })

    } else {
      // Marcar todas as mensagens não lidas da conversa como lidas
      const unreadMessages = await prisma.whatsAppMessage.findMany({
        where: {
          conversationId: id,
          fromMe: false,
          status: { not: 'READ' }
        },
        orderBy: { timestamp: 'desc' },
        take: 10 // Limitar para evitar sobrecarga
      })

      // Marcar as mensagens mais recentes como lidas na Evolution API
      if (conversation.instance.status === 'CONNECTED' && unreadMessages.length > 0) {
        try {
          const evolutionClient = getEvolutionAPIClient()
          const latestMessage = unreadMessages[0]
          
          await evolutionClient.markMessageAsRead(
            conversation.instance.name,
            conversation.remoteJid,
            latestMessage.messageId
          )
        } catch (evolutionError) {
          console.error('Erro ao marcar mensagens como lidas na Evolution API:', evolutionError)
          // Continua mesmo se falhar na API externa
        }
      }

      // Atualizar todas as mensagens não lidas no banco
      await prisma.whatsAppMessage.updateMany({
        where: {
          conversationId: id,
          fromMe: false,
          status: { not: 'READ' }
        },
        data: { status: 'READ' }
      })
    }

    // Atualizar contador de não lidas da conversa
    await prisma.whatsAppConversation.update({
      where: { id },
      data: {
        unreadCount: 0,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Mensagens marcadas como lidas com sucesso',
      conversationId: id,
      markedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 