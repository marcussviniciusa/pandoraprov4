// ============================================================================
// EVOLUTION API UTILS - PANDORA PRO
// ============================================================================

import { WhatsAppMessage, MessageKey } from './types'

/**
 * Extrair número de telefone do JID
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0]
}

/**
 * Formatar número para JID do WhatsApp
 */
export function formatPhoneToJid(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Adiciona código do país se não tiver
  let formattedPhone = cleanPhone
  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    formattedPhone = '55' + cleanPhone
  }
  
  return formattedPhone + '@s.whatsapp.net'
}

/**
 * Verificar se JID é de um grupo
 */
export function isGroupJid(jid: string): boolean {
  return jid.includes('@g.us')
}

/**
 * Verificar se JID é de um contato individual
 */
export function isContactJid(jid: string): boolean {
  return jid.includes('@s.whatsapp.net')
}

/**
 * Extrair conteúdo de texto de uma mensagem WhatsApp
 */
export function extractTextFromMessage(message: WhatsAppMessage): string | null {
  if (message.conversation) {
    return message.conversation
  }
  
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text
  }
  
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption
  }
  
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption
  }
  
  return null
}

/**
 * Determinar tipo de mensagem
 */
export function getMessageType(message: WhatsAppMessage): string {
  if (message.conversation || message.extendedTextMessage) {
    return 'text'
  }
  
  if (message.imageMessage) {
    return 'image'
  }
  
  if (message.videoMessage) {
    return 'video'
  }
  
  if (message.audioMessage) {
    return 'audio'
  }
  
  if (message.documentMessage) {
    return 'document'
  }
  
  if (message.locationMessage) {
    return 'location'
  }
  
  if (message.contactMessage) {
    return 'contact'
  }
  
  if (message.stickerMessage) {
    return 'sticker'
  }
  
  return 'unknown'
}

/**
 * Verificar se mensagem tem mídia
 */
export function hasMedia(message: WhatsAppMessage): boolean {
  return !!(
    message.imageMessage ||
    message.videoMessage ||
    message.audioMessage ||
    message.documentMessage ||
    message.stickerMessage
  )
}

/**
 * Obter URL da mídia
 */
export function getMediaUrl(message: WhatsAppMessage): string | null {
  if (message.imageMessage?.url) {
    return message.imageMessage.url
  }
  
  if (message.videoMessage?.url) {
    return message.videoMessage.url
  }
  
  if (message.audioMessage?.url) {
    return message.audioMessage.url
  }
  
  if (message.documentMessage?.url) {
    return message.documentMessage.url
  }
  
  if (message.stickerMessage?.url) {
    return message.stickerMessage.url
  }
  
  return null
}

/**
 * Obter mimetype da mídia
 */
export function getMediaMimetype(message: WhatsAppMessage): string | null {
  if (message.imageMessage?.mimetype) {
    return message.imageMessage.mimetype
  }
  
  if (message.videoMessage?.mimetype) {
    return message.videoMessage.mimetype
  }
  
  if (message.audioMessage?.mimetype) {
    return message.audioMessage.mimetype
  }
  
  if (message.documentMessage?.mimetype) {
    return message.documentMessage.mimetype
  }
  
  if (message.stickerMessage?.mimetype) {
    return message.stickerMessage.mimetype
  }
  
  return null
}

/**
 * Obter nome do arquivo
 */
export function getMediaFileName(message: WhatsAppMessage): string | null {
  if (message.documentMessage?.fileName) {
    return message.documentMessage.fileName
  }
  
  if (message.documentMessage?.title) {
    return message.documentMessage.title
  }
  
  // Para outros tipos, gerar nome baseado no tipo
  const type = getMessageType(message)
  const timestamp = Date.now()
  
  switch (type) {
    case 'image':
      return `imagem_${timestamp}.jpg`
    case 'video':
      return `video_${timestamp}.mp4`
    case 'audio':
      return `audio_${timestamp}.ogg`
    case 'sticker':
      return `sticker_${timestamp}.webp`
    default:
      return null
  }
}

/**
 * Validar número de telefone brasileiro
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Número com código do país (55)
  if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    const localNumber = cleanPhone.substring(2)
    return isValidLocalBrazilianPhone(localNumber)
  }
  
  // Número sem código do país
  if (cleanPhone.length === 11) {
    return isValidLocalBrazilianPhone(cleanPhone)
  }
  
  return false
}

/**
 * Validar número local brasileiro (sem código do país)
 */
function isValidLocalBrazilianPhone(phone: string): boolean {
  // Deve ter 11 dígitos (DDD + número)
  if (phone.length !== 11) {
    return false
  }
  
  // DDD válido (11-99)
  const ddd = parseInt(phone.substring(0, 2))
  if (ddd < 11 || ddd > 99) {
    return false
  }
  
  // Primeiro dígito do número deve ser 9 (celular) ou 2-5 (fixo)
  const firstDigit = parseInt(phone[2])
  if (firstDigit < 2 || firstDigit > 9) {
    return false
  }
  
  // Se for celular (9), deve seguir o padrão 9XXXX-XXXX
  if (firstDigit === 9) {
    const secondDigit = parseInt(phone[3])
    if (secondDigit < 6 || secondDigit > 9) {
      return false
    }
  }
  
  return true
}

/**
 * Gerar ID único para mensagem
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}`.toUpperCase()
}

/**
 * Converter timestamp Unix para Date
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

/**
 * Detectar se mensagem é de comando/bot
 */
export function isCommandMessage(text: string): boolean {
  if (!text) return false
  
  const commands = ['/', '!', '#', '.', '*']
  return commands.some(cmd => text.trim().startsWith(cmd))
}

/**
 * Sanitizar texto para uso em mensagens
 */
export function sanitizeMessageText(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
    .replace(/\u200B/g, '') // Remove zero-width space
    .trim()
}

/**
 * Verificar se mensagem foi encaminhada
 */
export function isForwardedMessage(message: WhatsAppMessage): boolean {
  // Logic específica pode variar dependendo da versão da API
  // Por enquanto, retornamos false - pode ser implementado posteriormente
  return false
}

/**
 * Extrair dados de localização
 */
export function extractLocationData(message: WhatsAppMessage): { lat: number; lng: number; name?: string; address?: string } | null {
  if (!message.locationMessage) {
    return null
  }
  
  return {
    lat: message.locationMessage.degreesLatitude,
    lng: message.locationMessage.degreesLongitude,
    name: message.locationMessage.name,
    address: message.locationMessage.address
  }
} 