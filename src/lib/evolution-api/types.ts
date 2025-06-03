// ============================================================================
// TIPOS EVOLUTION API - PANDORA PRO
// ============================================================================

// ============================================================================
// INSTÂNCIA
// ============================================================================

export interface CreateInstanceRequest {
  instanceName: string
  qrcode?: boolean
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  webhook?: {
    url: string
    events: string[]
  }
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string
    instanceId: string
    status: 'CREATED'
  }
  hash?: {
    apikey: string
  }
  webhook?: {
    url: string
    events: string[]
  }
}

export interface InstanceStatus {
  instance: {
    instanceName: string
    state: 'open' | 'close' | 'connecting'
  }
}

export interface ConnectInstanceResponse {
  pairingCode: string | null
  code: string
  base64: string
}

// ============================================================================
// WEBHOOK
// ============================================================================

export interface SetWebhookRequest {
  url: string
  events: WebhookEvent[]
  webhook_by_events?: boolean
}

export type WebhookEvent = 
  | 'QRCODE_UPDATED'
  | 'CONNECTION_UPDATE'
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'SEND_MESSAGE'
  | 'CONTACTS_UPDATE'
  | 'CONTACTS_UPSERT'
  | 'PRESENCE_UPDATE'
  | 'CHATS_UPDATE'
  | 'CHATS_UPSERT'
  | 'GROUPS_UPSERT'
  | 'GROUP_UPDATE'
  | 'GROUP_PARTICIPANTS_UPDATE'
  | 'NEW_JWT_TOKEN'

export interface WebhookResponse {
  webhook: {
    url: string
    events: string[]
    webhook_by_events: boolean
  }
}

// ============================================================================
// MENSAGENS
// ============================================================================

export interface SendTextMessageRequest {
  number: string
  text: string
  delay?: number
  quoted?: {
    key: MessageKey
  }
}

export interface SendMediaMessageRequest {
  number: string
  mediatype: 'image' | 'video' | 'audio' | 'document'
  media: string // URL or base64
  mimetype?: string // MIME type do arquivo (para URLs)
  caption?: string
  fileName?: string
  delay?: number
  quoted?: {
    key: MessageKey
  }
}

export interface SendLocationMessageRequest {
  number: string
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface MessageKey {
  remoteJid: string
  fromMe: boolean
  id: string
}

export interface SendMessageResponse {
  key: MessageKey
  message: {
    messageTimestamp: number
  }
  messageType: string
  status: 'PENDING'
}

// ============================================================================
// WEBHOOKS RECEBIDOS
// ============================================================================

export interface MessageWebhook {
  instance: string
  data: {
    key: MessageKey
    pushName: string
    message: WhatsAppMessage
    messageType: string
    messageTimestamp: number
    owner: string
    source: string
  }
  destination: string
  date_time: string
  sender: string
  server_url: string
  apikey: string
}

export interface ConnectionWebhook {
  instance: string
  data: {
    state: 'open' | 'close' | 'connecting'
    statusReason?: number
  }
  destination: string
  date_time: string
  sender: string
  server_url: string
  apikey: string
}

export interface QRCodeWebhook {
  instance: string
  data: {
    qrcode: {
      code: string
      base64: string
    }
  }
  destination: string
  date_time: string
  sender: string
  server_url: string
  apikey: string
}

// ============================================================================
// MENSAGENS WHATSAPP
// ============================================================================

export interface WhatsAppMessage {
  // Mensagem de texto
  conversation?: string

  // Mensagem de imagem
  imageMessage?: {
    url: string
    mimetype: string
    caption?: string
    fileSha256: string
    fileLength: number
    height: number
    width: number
  }

  // Mensagem de vídeo
  videoMessage?: {
    url: string
    mimetype: string
    caption?: string
    fileSha256: string
    fileLength: number
    seconds: number
  }

  // Mensagem de áudio
  audioMessage?: {
    url: string
    mimetype: string
    fileSha256: string
    fileLength: number
    seconds: number
    ptt?: boolean // push to talk
  }

  // Mensagem de documento
  documentMessage?: {
    url: string
    mimetype: string
    title: string
    fileSha256: string
    fileLength: number
    fileName: string
  }

  // Mensagem de localização
  locationMessage?: {
    degreesLatitude: number
    degreesLongitude: number
    name?: string
    address?: string
  }

  // Mensagem de contato
  contactMessage?: {
    displayName: string
    vcard: string
  }

  // Sticker
  stickerMessage?: {
    url: string
    mimetype: string
    fileSha256: string
    fileLength: number
  }

  // Mensagem citada
  quotedMessage?: {
    key: MessageKey
    message: WhatsAppMessage
  }

  // Extended text (mensagem longa)
  extendedTextMessage?: {
    text: string
    matchedText?: string
    canonicalUrl?: string
    description?: string
    title?: string
    textArgb?: number
    backgroundArgb?: number
    font?: number
  }
}

// ============================================================================
// CONTATOS
// ============================================================================

export interface Contact {
  id: string
  name?: string
  notify?: string
  verifiedName?: string
  imgUrl?: string
  status?: string
}

export interface ContactsResponse {
  contacts: Contact[]
}

// ============================================================================
// GRUPOS
// ============================================================================

export interface Group {
  id: string
  subject: string
  subjectOwner?: string
  subjectTime?: number
  creation?: number
  owner?: string
  desc?: string
  descId?: string
  restrict?: boolean
  announce?: boolean
  participants: GroupParticipant[]
}

export interface GroupParticipant {
  id: string
  admin?: 'admin' | 'superadmin' | null
}

export interface GroupsResponse {
  groups: Group[]
}

// ============================================================================
// PERFIL
// ============================================================================

export interface ProfilePictureResponse {
  wuid: string
  profilePictureUrl: string
}

export interface BusinessProfileResponse {
  wuid: string
  description: string
  website: string[]
  email: string
  category: string
  address: string
  businessHours: {
    timezone: string
    config: {
      day: string
      mode: string
      hours: {
        open: string
        close: string
      }[]
    }[]
  }
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

export interface SettingsRequest {
  rejectCall?: boolean
  msgCall?: string
  groupsIgnore?: boolean
  alwaysOnline?: boolean
  readMessages?: boolean
  readStatus?: boolean
  syncFullHistory?: boolean
}

export interface SettingsResponse {
  rejectCall: boolean
  msgCall: string
  groupsIgnore: boolean
  alwaysOnline: boolean
  readMessages: boolean
  readStatus: boolean
  syncFullHistory: boolean
}

// ============================================================================
// ERROS
// ============================================================================

export interface EvolutionAPIError {
  error: string
  message: string
  statusCode: number
}

// ============================================================================
// RESPOSTA GENÉRICA
// ============================================================================

export interface EvolutionAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: EvolutionAPIError
}

export interface SendWhatsAppAudioRequest {
  number: string
  audio: string // base64 string
  delay?: number
  quoted?: {
    key: MessageKey
  }
} 