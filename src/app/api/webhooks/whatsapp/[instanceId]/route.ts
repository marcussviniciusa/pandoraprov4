// ============================================================================
// WEBHOOK WHATSAPP - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/utils'
import { 
  MessageWebhook, 
  ConnectionWebhook, 
  QRCodeWebhook,
  extractPhoneFromJid,
  isGroupJid,
  extractTextFromMessage,
  getMessageType,
  hasMedia,
  getMediaUrl,
  getMediaMimetype,
  getMediaFileName
} from '@/lib/evolution-api'

interface Params {
  params: {
    instanceId: string
  }
}

// ============================================================================
// POST - Receber webhooks da Evolution API
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json()
    const { instanceId } = params

    console.log(`[WEBHOOK] Received for instance ${instanceId}:`, JSON.stringify(body, null, 2))

    // Verificar se instância existe
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
      include: {
        office: true
      }
    })

    if (!instance) {
      console.error(`[WEBHOOK] Instance ${instanceId} not found`)
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    // Processar diferentes tipos de webhook
    const { data } = body

    // ============================================================================
    // WEBHOOK: QRCODE_UPDATED
    // ============================================================================
    if (body.event === 'QRCODE_UPDATED' || data.qrcode) {
      console.log(`[WEBHOOK] QR Code updated for instance ${instanceId}`)
      
      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: {
          qrCode: data.qrcode?.base64 || null,
          status: 'CONNECTING',
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ message: 'QR Code atualizado' })
    }

    // ============================================================================
    // WEBHOOK: CONNECTION_UPDATE
    // ============================================================================
    if (body.event === 'CONNECTION_UPDATE' || data.state !== undefined) {
      console.log(`[WEBHOOK] Connection update for instance ${instanceId}: ${data.state}`)
      
      let newStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' = 'ERROR'
      let phoneNumber = instance.phoneNumber

      switch (data.state) {
        case 'open':
          newStatus = 'CONNECTED'
          // Extrair número do telefone se disponível
          if (body.sender) {
            phoneNumber = extractPhoneFromJid(body.sender)
          }
          break
        case 'close':
          newStatus = 'DISCONNECTED'
          phoneNumber = null
          break
        case 'connecting':
          newStatus = 'CONNECTING'
          break
        default:
          newStatus = 'ERROR'
      }

      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: {
          status: newStatus,
          phoneNumber,
          qrCode: newStatus === 'CONNECTED' ? null : instance.qrCode,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ message: 'Status da conexão atualizado' })
    }

    // ============================================================================
    // WEBHOOK: MESSAGES_UPSERT (Nova mensagem)
    // ============================================================================
    if (body.event === 'MESSAGES_UPSERT' || data.key) {
      console.log(`[WEBHOOK] New message for instance ${instanceId}`)
      
      const messageData = data
      const { key, pushName, message, messageType, messageTimestamp } = messageData

      // Ignorar mensagens próprias em alguns casos (opcional)
      if (key.fromMe && process.env.IGNORE_OWN_MESSAGES === 'true') {
        return NextResponse.json({ message: 'Mensagem própria ignorada' })
      }

      // Obter ou criar contato
      const remoteJid = key.remoteJid
      const phoneNumber = extractPhoneFromJid(remoteJid)
      const isGroup = isGroupJid(remoteJid)

      let contact = await prisma.whatsAppContact.findFirst({
        where: {
          instanceId,
          remoteJid
        }
      })

      if (!contact) {
        contact = await prisma.whatsAppContact.create({
          data: {
            id: generateId(),
            instanceId,
            remoteJid,
            phoneNumber,
            name: pushName || null,
            pushName: pushName || null,
            isGroup,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      } else {
        // Atualizar nome se mudou
        if (pushName && pushName !== contact.pushName) {
          await prisma.whatsAppContact.update({
            where: { id: contact.id },
            data: {
              pushName,
              name: contact.name || pushName,
              updatedAt: new Date()
            }
          })
        }
      }

      // Obter ou criar conversa
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          instanceId,
          remoteJid
        }
      })

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            id: generateId(),
            instanceId,
            contactId: contact.id,
            remoteJid,
            title: isGroup ? pushName : null,
            isGroup,
            status: 'OPEN',
            lastMessageAt: new Date(messageTimestamp * 1000),
            unreadCount: key.fromMe ? 0 : 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      } else {
        // Atualizar conversa
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(messageTimestamp * 1000),
            unreadCount: key.fromMe ? conversation.unreadCount : conversation.unreadCount + 1,
            updatedAt: new Date()
          }
        })
      }

      // Criar mensagem
      const textContent = extractTextFromMessage(message)
      const msgType = getMessageType(message)
      const hasMediaContent = hasMedia(message)
      
      const whatsappMessage = await prisma.whatsAppMessage.create({
        data: {
          id: generateId(),
          instanceId,
          conversationId: conversation.id,
          contactId: contact.id,
          remoteJid,
          messageId: key.id,
          fromMe: key.fromMe,
          messageType: mapMessageType(msgType),
          content: textContent,
          mediaUrl: hasMediaContent ? getMediaUrl(message) : null,
          mimetype: hasMediaContent ? getMediaMimetype(message) : null,
          fileName: hasMediaContent ? getMediaFileName(message) : null,
          timestamp: new Date(messageTimestamp * 1000),
          status: 'SENT',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Atualizar última mensagem da conversa
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageId: whatsappMessage.id
        }
      })

      console.log(`[WEBHOOK] Message saved: ${whatsappMessage.id}`)

      // TODO: Processar com IA se necessário
      // await processMessageWithAI(whatsappMessage, conversation, instance)

      return NextResponse.json({ message: 'Mensagem processada' })
    }

    // ============================================================================
    // WEBHOOK: Outros eventos
    // ============================================================================
    console.log(`[WEBHOOK] Unhandled event for instance ${instanceId}:`, body.event)
    return NextResponse.json({ message: 'Evento não processado' })

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Mapear tipo de mensagem Evolution API para nosso enum
 */
function mapMessageType(evolutionType: string): 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'STICKER' | 'CONTACT' | 'POLL' {
  switch (evolutionType.toLowerCase()) {
    case 'text':
      return 'TEXT'
    case 'image':
      return 'IMAGE'
    case 'audio':
      return 'AUDIO'
    case 'video':
      return 'VIDEO'
    case 'document':
      return 'DOCUMENT'
    case 'location':
      return 'LOCATION'
    case 'sticker':
      return 'STICKER'
    case 'contact':
      return 'CONTACT'
    case 'poll':
      return 'POLL'
    default:
      return 'TEXT'
  }
} 