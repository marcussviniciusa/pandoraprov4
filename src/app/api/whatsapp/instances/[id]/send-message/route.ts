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
    const sendResponse = await evolutionClient.sendTextMessage(instance.name, {
      number: phoneNumber,
      text: message
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
      // Buscar ou criar contato
      const remoteJid = formatPhoneToJid(phoneNumber)
      
      let contact = await prisma.whatsAppContact.findFirst({
        where: {
          instanceId: instance.id,
          OR: [
            { remoteJid },
            { phoneNumber }
          ]
        }
      })

      if (!contact) {
        contact = await prisma.whatsAppContact.create({
          data: {
            id: generateId(),
            instanceId: instance.id,
            remoteJid,
            phoneNumber,
            name: phoneNumber, // Será atualizado quando soubermos o nome
            isGroup: false
          }
        })
      }

      // Buscar ou criar conversa
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          instanceId: instance.id,
          remoteJid
        }
      })

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            id: generateId(),
            instanceId: instance.id,
            contactId: contact.id,
            remoteJid,
            title: contact.name || contact.pushName || phoneNumber,
            isGroup: false,
            lastMessageAt: new Date(),
            status: 'OPEN'
          }
        })
      }

      // Salvar mensagem
      await prisma.whatsAppMessage.create({
        data: {
          id: generateId(),
          instanceId: instance.id,
          conversationId: conversation.id,
          contactId: contact.id,
          remoteJid,
          messageId: sendResponse.data?.key?.id || generateId(),
          fromMe: true,
          messageType: 'TEXT',
          content: message,
          timestamp: new Date(),
          status: 'SENT'
        }
      })

      // Atualizar conversa
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: 0 // Reset pois é mensagem nossa
        }
      })

    } catch (dbError) {
      console.error('Erro ao salvar mensagem no banco:', dbError)
      // Não falha o envio se der erro no banco
    }

    return NextResponse.json({
      message: 'Mensagem enviada com sucesso',
      messageId: sendResponse.data?.key?.id,
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