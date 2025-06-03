// ============================================================================
// API SEND MESSAGE WHATSAPP - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient, formatPhoneToJid } from '@/lib/evolution-api'
import { generateId } from '@/lib/utils'
import { 
  uploadAudioFile, 
  uploadImageVideoFile, 
  uploadDocumentFile, 
  isMinioConfigured,
  base64ToBuffer 
} from '@/lib/storage'

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
    const { 
      phoneNumber, 
      message, 
      messageType = 'text',
      mediaData,
      fileName,
      caption
    } = body

    // Validações
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      )
    }

    if (!['text', 'image', 'document', 'audio', 'video'].includes(messageType)) {
      return NextResponse.json(
        { error: 'Tipo de mensagem inválido' },
        { status: 400 }
      )
    }

    // Validações específicas por tipo
    if (messageType === 'text' && !message) {
      return NextResponse.json(
        { error: 'Mensagem de texto é obrigatória' },
        { status: 400 }
      )
    }

    if (messageType !== 'text' && !mediaData) {
      return NextResponse.json(
        { error: 'Dados de mídia são obrigatórios para este tipo de mensagem' },
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
    let sendResponse

    console.log('🔄 Enviando mensagem via Evolution API:', {
      instanceName: instance.name,
      phoneNumber,
      messageType,
      hasMediaData: !!mediaData,
      mediaDataLength: mediaData?.length,
      fileName,
      caption
    })

    if (messageType === 'text') {
      // Enviar mensagem de texto
      sendResponse = await evolutionClient.sendTextMessage(instance.name, {
        number: phoneNumber,
        text: message
      })
    } else {
      // Validar dados de mídia
      if (!mediaData) {
        return NextResponse.json(
          { error: 'Dados de mídia são obrigatórios para este tipo de mensagem' },
          { status: 400 }
        )
      }

      // Verificar se é base64 válido
      if (!mediaData.startsWith('data:')) {
        return NextResponse.json(
          { error: 'Formato de mídia inválido - deve ser base64' },
          { status: 400 }
        )
      }

      // Extrair apenas o conteúdo base64 (remover prefixo data:mime-type;base64,)
      const base64Data = mediaData.split(',')[1]
      if (!base64Data) {
        return NextResponse.json(
          { error: 'Dados base64 inválidos' },
          { status: 400 }
        )
      }

      // Tratamento específico para ÁUDIO (Evolution API v2.2.3+)
      if (messageType === 'audio') {
        console.log('🎵 Enviando áudio via endpoint específico sendWhatsAppAudio')
        
        sendResponse = await evolutionClient.sendWhatsAppAudio(instance.name, {
          number: phoneNumber,
          audio: base64Data // Apenas base64 puro, sem prefixo
        })
      } else {
        // Para outros tipos de mídia (imagem, vídeo, documento)
        let mediaUrl: string
        let mimetype: string
        let uploadMethod: string

        // Tentar usar MinIO se configurado, senão usar base64
        if (isMinioConfigured()) {
          console.log('💾 MinIO configurado - uploading arquivo...')
          
          let uploadResult: { success: boolean; url?: string; error?: string }
          
          // Upload baseado no tipo de mídia
          switch (messageType) {
            case 'image':
            case 'video':
              uploadResult = await uploadImageVideoFile(mediaData, fileName || `media_${Date.now()}`)
              break
            case 'document':
              uploadResult = await uploadDocumentFile(mediaData, fileName || `document_${Date.now()}`)
              break
            default:
              uploadResult = { success: false, error: 'Tipo de mídia não suportado' }
          }

          if (uploadResult.success && uploadResult.url) {
            mediaUrl = uploadResult.url
            uploadMethod = 'MinIO URL'
            
            // Extrair mimetype do base64
            const { mimeType } = base64ToBuffer(mediaData)
            mimetype = mimeType
            
            console.log('✅ Upload para MinIO bem-sucedido:', {
              url: mediaUrl.substring(0, 100) + '...',
              mimetype,
              messageType
            })
          } else {
            console.warn('⚠️ Falha no upload para MinIO, usando base64 como fallback:', uploadResult.error)
            mediaUrl = base64Data
            uploadMethod = 'Base64 fallback'
            mimetype = ''
          }
        } else {
          console.log('📝 MinIO não configurado - usando base64')
          mediaUrl = base64Data
          uploadMethod = 'Base64 (MinIO não configurado)'
          mimetype = ''
        }

        // Enviar mensagem de mídia (não-áudio)
        const mediaPayload: any = {
          number: phoneNumber,
          mediatype: messageType as 'image' | 'video' | 'document',
          media: mediaUrl,
          caption: caption || message,
          fileName: fileName
        }

        // Adicionar mimetype se enviando por URL
        if (mediaUrl.startsWith('http') && mimetype) {
          mediaPayload.mimetype = mimetype
        }

        console.log('📤 Payload de mídia (não-áudio):', {
          number: phoneNumber,
          mediatype: messageType,
          hasMedia: !!mediaUrl,
          mediaMethod: uploadMethod,
          isUrl: mediaUrl.startsWith('http'),
          mediaUrlPreview: mediaUrl.startsWith('http') 
            ? mediaUrl.substring(0, 100) + '...' 
            : `Base64 (${mediaUrl.length} chars)`,
          hasMimeType: !!mimetype,
          mimetype: mimetype,
          caption: caption || message,
          fileName
        })

        sendResponse = await evolutionClient.sendMediaMessage(instance.name, mediaPayload)
      }
    }

    console.log('📡 Resposta da Evolution API:', {
      success: sendResponse.success,
      error: sendResponse.error,
      data: sendResponse.data
    })

    if (!sendResponse.success) {
      console.error('❌ Erro detalhado ao enviar mensagem:', {
        error: sendResponse.error,
        instanceName: instance.name,
        instanceStatus: instance.status,
        messageType,
        phoneNumber
      })
      
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem',
          details: sendResponse.error?.message || 'Erro desconhecido',
          evolutionError: sendResponse.error
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
      const messageData: any = {
        id: generateId(),
        instanceId: instance.id,
        conversationId: conversation.id,
        contactId: contact.id,
        remoteJid,
        messageId: sendResponse.data?.key?.id || generateId(),
        fromMe: true,
        messageType: messageType.toUpperCase(),
        content: messageType === 'text' ? message : (caption || fileName || 'Mídia enviada'),
        timestamp: new Date(),
        status: 'SENT'
      }

      // Adicionar dados de mídia se aplicável
      if (messageType !== 'text') {
        messageData.mediaUrl = mediaData
        messageData.fileName = fileName
        messageData.caption = caption
      }

      await prisma.whatsAppMessage.create({
        data: messageData
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