// ============================================================================
// API SEND MESSAGE WHATSAPP - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient, formatPhoneToJid } from '@/lib/evolution-api'
import { generateId } from '@/lib/utils'

interface Params {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// POST - Enviar mensagem via instância WhatsApp
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

    // Apenas ADMIN e SUPER_ADMIN podem enviar mensagens
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { phoneNumber, message, messageType = 'text' } = body

    // Validações
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de telefone e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['text', 'image', 'document', 'audio', 'video'].includes(messageType)) {
      return NextResponse.json(
        { error: 'Tipo de mensagem inválido' },
        { status: 400 }
      )
    }

    // Verificar se instância existe e pertence ao escritório
    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id,
        officeId: session.user.officeId
      }
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    if (instance.status !== 'CONNECTED') {
      return NextResponse.json(
        { error: 'Instância não está conectada' },
        { status: 400 }
      )
    }

    // Enviar mensagem via Evolution API
    const evolutionClient = getEvolutionAPIClient()
    const sendResponse = await evolutionClient.sendMessage(instance.name, {
      number: phoneNumber,
      text: message,
      type: messageType
    })

    if (!sendResponse.success) {
      console.error('Erro ao enviar mensagem:', sendResponse.error)
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem',
          details: sendResponse.error?.message 
        },
        { status: 500 }
      )
    }

    // Salvar mensagem no banco de dados
    try {
      // Buscar ou criar conversa
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          instanceId: instance.id,
          phoneNumber
        }
      })

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            id: generateId(),
            instanceId: instance.id,
            phoneNumber,
            contactName: phoneNumber, // Será atualizado quando soubermos o nome
            lastMessage: message,
            lastMessageAt: new Date(),
            isActive: true
          }
        })
      }

      // Salvar mensagem
      await prisma.whatsAppMessage.create({
        data: {
          id: generateId(),
          conversationId: conversation.id,
          instanceId: instance.id,
          messageId: sendResponse.data?.messageId || generateId(),
          fromMe: true,
          phoneNumber,
          message,
          messageType,
          status: 'SENT',
          timestamp: new Date(),
          metadata: sendResponse.data as any
        }
      })

      // Atualizar conversa
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: message,
          lastMessageAt: new Date(),
          messageCount: { increment: 1 }
        }
      })

    } catch (dbError) {
      console.error('Erro ao salvar mensagem no banco:', dbError)
      // Não falha o envio se der erro no banco
    }

    return NextResponse.json({
      message: 'Mensagem enviada com sucesso',
      messageId: sendResponse.data?.messageId,
      phoneNumber,
      sentAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 