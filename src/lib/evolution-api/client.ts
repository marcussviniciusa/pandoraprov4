// ============================================================================
// EVOLUTION API CLIENT - PANDORA PRO
// ============================================================================

import {
  CreateInstanceRequest,
  CreateInstanceResponse,
  InstanceStatus,
  ConnectInstanceResponse,
  SetWebhookRequest,
  WebhookResponse,
  SendTextMessageRequest,
  SendMediaMessageRequest,
  SendWhatsAppAudioRequest,
  SendLocationMessageRequest,
  SendMessageResponse,
  ContactsResponse,
  GroupsResponse,
  ProfilePictureResponse,
  BusinessProfileResponse,
  SettingsRequest,
  SettingsResponse,
  EvolutionAPIError,
  EvolutionAPIResponse
} from './types'

export class EvolutionAPIClient {
  private baseUrl: string
  private apiKey: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.apiKey = apiKey
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'Accept': 'application/json'
    }
  }

  // ============================================================================
  // MÉTODOS UTILITÁRIOS
  // ============================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<EvolutionAPIResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      
      console.log('🌐 Evolution API Request:', {
        url,
        method: options.method || 'GET',
        hasBody: !!options.body,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        }
      })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      let data: any
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const textData = await response.text()
        console.log('⚠️ Evolution API resposta não-JSON:', textData)
        data = { message: textData }
      }

      console.log('📡 Evolution API Response:', {
        status: response.status,
        ok: response.ok,
        contentType,
        data: JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : '')
      })

      if (!response.ok) {
        return {
          success: false,
          error: {
            error: data.error || 'Erro desconhecido',
            message: data.message || `HTTP ${response.status}`,
            statusCode: response.status
          }
        }
      }

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('❌ Evolution API Error:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            error: 'TIMEOUT_ERROR',
            message: 'Timeout na conexão com a Evolution API (10s)',
            statusCode: 408
          }
        }
      }
      
      if (error instanceof Error && error.message.includes('fetch')) {
        return {
          success: false,
          error: {
            error: 'NETWORK_ERROR',
            message: 'Erro de conexão - verifique se a Evolution API está acessível',
            statusCode: 0
          }
        }
      }
      
      return {
        success: false,
        error: {
          error: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          statusCode: 0
        }
      }
    }
  }

  // ============================================================================
  // GERENCIAMENTO DE INSTÂNCIAS
  // ============================================================================

  /**
   * Criar nova instância WhatsApp
   */
  async createInstance(data: CreateInstanceRequest): Promise<EvolutionAPIResponse<CreateInstanceResponse>> {
    return this.makeRequest<CreateInstanceResponse>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: data.instanceName,
        qrcode: data.qrcode ?? true,
        integration: data.integration ?? 'WHATSAPP-BAILEYS'
      })
    })
  }

  /**
   * Conectar instância e gerar QR Code
   */
  async connectInstance(instanceName: string): Promise<EvolutionAPIResponse<ConnectInstanceResponse>> {
    return this.makeRequest<ConnectInstanceResponse>(`/instance/connect/${instanceName}`, {
      method: 'GET'
    })
  }

  /**
   * Obter status da instância
   */
  async getInstanceStatus(instanceName: string): Promise<EvolutionAPIResponse<InstanceStatus>> {
    return this.makeRequest<InstanceStatus>(`/instance/connectionState/${instanceName}`, {
      method: 'GET'
    })
  }

  /**
   * Reiniciar instância
   */
  async restartInstance(instanceName: string): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/instance/restart/${instanceName}`, {
      method: 'PUT'
    })
  }

  /**
   * Desconectar instância
   */
  async logoutInstance(instanceName: string): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE'
    })
  }

  /**
   * Deletar instância
   */
  async deleteInstance(instanceName: string): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/instance/delete/${instanceName}`, {
      method: 'DELETE'
    })
  }

  // ============================================================================
  // CONFIGURAÇÃO DE WEBHOOKS
  // ============================================================================

  /**
   * Configurar webhook da instância
   */
  async setWebhook(instanceName: string, webhookData: SetWebhookRequest): Promise<EvolutionAPIResponse<WebhookResponse>> {
    return this.makeRequest<WebhookResponse>(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        url: webhookData.url,
        events: webhookData.events,
        webhook_by_events: webhookData.webhook_by_events ?? false
      })
    })
  }

  /**
   * Obter configuração do webhook
   */
  async getWebhook(instanceName: string): Promise<EvolutionAPIResponse<WebhookResponse>> {
    return this.makeRequest<WebhookResponse>(`/webhook/find/${instanceName}`, {
      method: 'GET'
    })
  }

  // ============================================================================
  // ENVIO DE MENSAGENS
  // ============================================================================

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(instanceName: string, data: SendTextMessageRequest): Promise<EvolutionAPIResponse<SendMessageResponse>> {
    return this.makeRequest<SendMessageResponse>(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: data.number,
        text: data.text,
        delay: data.delay,
        quoted: data.quoted
      })
    })
  }

  /**
   * Enviar áudio WhatsApp (Evolution API v2.2.3+)
   * Endpoint específico para áudio que aceita apenas base64
   */
  async sendWhatsAppAudio(instanceName: string, data: SendWhatsAppAudioRequest): Promise<EvolutionAPIResponse<SendMessageResponse>> {
    console.log('🎵 Evolution API - Enviando áudio via endpoint específico:', {
      endpoint: `/message/sendWhatsAppAudio/${instanceName}`,
      hasAudio: !!data.audio,
      isBase64: data.audio.length > 0 && !data.audio.startsWith('http'),
      audioLength: data.audio.length,
      number: data.number
    })

    return this.makeRequest<SendMessageResponse>(`/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: data.number,
        audio: data.audio,
        delay: data.delay,
        quoted: data.quoted
      })
    })
  }

  /**
   * Enviar mensagem de mídia (imagem, vídeo, áudio, documento)
   */
  async sendMediaMessage(instanceName: string, data: SendMediaMessageRequest): Promise<EvolutionAPIResponse<SendMessageResponse>> {
    // Preparar payload sem campos vazios/undefined
    const payload: any = {
      number: data.number,
      mediatype: data.mediatype,
      media: data.media
    }

    // Adicionar mimetype se fornecido (especialmente para URLs)
    if (data.mimetype && data.mimetype.trim()) {
      payload.mimetype = data.mimetype.trim()
    }

    // Adicionar campos opcionais apenas se tiverem valor
    if (data.caption && data.caption.trim()) {
      payload.caption = data.caption.trim()
    }

    if (data.fileName && data.fileName.trim()) {
      payload.fileName = data.fileName.trim()
    }

    if (data.delay) {
      payload.delay = data.delay
    }

    if (data.quoted) {
      payload.quoted = data.quoted
    }

    console.log('🔄 Evolution API - Enviando mídia com payload:', {
      endpoint: `/message/sendMedia/${instanceName}`,
      hasMedia: !!data.media,
      mediaType: data.mediatype,
      isUrl: data.media.startsWith('http'),
      isBase64: data.media.startsWith('data:'),
      hasMimeType: !!data.mimetype,
      hasCaption: !!data.caption,
      hasFileName: !!data.fileName,
      payloadKeys: Object.keys(payload)
    })

    return this.makeRequest<SendMessageResponse>(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  /**
   * Enviar mensagem de localização
   */
  async sendLocationMessage(instanceName: string, data: SendLocationMessageRequest): Promise<EvolutionAPIResponse<SendMessageResponse>> {
    return this.makeRequest<SendMessageResponse>(`/message/sendLocation/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: data.number,
        latitude: data.latitude,
        longitude: data.longitude,
        name: data.name,
        address: data.address
      })
    })
  }

  /**
   * Marcar mensagem como lida
   */
  async markMessageAsRead(instanceName: string, remoteJid: string, messageId: string): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/chat/markMessageAsRead/${instanceName}`, {
      method: 'PUT',
      body: JSON.stringify({
        readMessages: [
          {
            remoteJid,
            id: messageId,
            fromMe: false
          }
        ]
      })
    })
  }

  // ============================================================================
  // GESTÃO DE CONTATOS
  // ============================================================================

  /**
   * Buscar contatos
   */
  async getContacts(instanceName: string): Promise<EvolutionAPIResponse<ContactsResponse>> {
    return this.makeRequest<ContactsResponse>(`/chat/findContacts/${instanceName}`, {
      method: 'GET'
    })
  }

  /**
   * Buscar foto do perfil de um contato
   */
  async getProfilePicture(instanceName: string, number: string): Promise<EvolutionAPIResponse<ProfilePictureResponse>> {
    return this.makeRequest<ProfilePictureResponse>(`/chat/getProfilePicture/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number })
    })
  }

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkNumberExists(instanceName: string, numbers: string[]): Promise<EvolutionAPIResponse<{ exists: boolean; jid: string }[]>> {
    return this.makeRequest(`/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ numbers })
    })
  }

  // ============================================================================
  // GESTÃO DE GRUPOS
  // ============================================================================

  /**
   * Buscar grupos
   */
  async getGroups(instanceName: string): Promise<EvolutionAPIResponse<GroupsResponse>> {
    return this.makeRequest<GroupsResponse>(`/group/findGroupInfos/${instanceName}`, {
      method: 'GET'
    })
  }

  /**
   * Criar grupo
   */
  async createGroup(instanceName: string, subject: string, participants: string[]): Promise<EvolutionAPIResponse<{ groupId: string }>> {
    return this.makeRequest(`/group/create/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        subject,
        participants
      })
    })
  }

  /**
   * Adicionar participantes ao grupo
   */
  async addToGroup(instanceName: string, groupId: string, participants: string[]): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/group/updateParticipant/${instanceName}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid: groupId,
        action: 'add',
        participants
      })
    })
  }

  /**
   * Remover participantes do grupo
   */
  async removeFromGroup(instanceName: string, groupId: string, participants: string[]): Promise<EvolutionAPIResponse<{ message: string }>> {
    return this.makeRequest(`/group/updateParticipant/${instanceName}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid: groupId,
        action: 'remove',
        participants
      })
    })
  }

  // ============================================================================
  // CONFIGURAÇÕES DA INSTÂNCIA
  // ============================================================================

  /**
   * Configurar definições da instância
   */
  async updateSettings(instanceName: string, settings: SettingsRequest): Promise<EvolutionAPIResponse<SettingsResponse>> {
    return this.makeRequest<SettingsResponse>(`/settings/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  }

  /**
   * Obter configurações da instância
   */
  async getSettings(instanceName: string): Promise<EvolutionAPIResponse<SettingsResponse>> {
    return this.makeRequest<SettingsResponse>(`/settings/find/${instanceName}`, {
      method: 'GET'
    })
  }

  // ============================================================================
  // PERFIL BUSINESS
  // ============================================================================

  /**
   * Obter perfil business
   */
  async getBusinessProfile(instanceName: string, number: string): Promise<EvolutionAPIResponse<BusinessProfileResponse>> {
    return this.makeRequest<BusinessProfileResponse>(`/chat/getBusinessProfile/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number })
    })
  }

  // ============================================================================
  // UTILITÁRIOS DE TESTE
  // ============================================================================

  /**
   * Testar conectividade com a API
   */
  async ping(): Promise<EvolutionAPIResponse<{ message: string; timestamp: number }>> {
    return this.makeRequest('/', {
      method: 'GET'
    })
  }

  /**
   * Obter informações da API
   */
  async getApiInfo(): Promise<EvolutionAPIResponse<{ version: string; build: string }>> {
    return this.makeRequest('/info', {
      method: 'GET'
    })
  }
}

// ============================================================================
// FACTORY PARA CRIAR CLIENTE
// ============================================================================

/**
 * Criar cliente Evolution API usando variáveis de ambiente
 */
export function createEvolutionAPIClient(): EvolutionAPIClient {
  const baseUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!baseUrl) {
    throw new Error('EVOLUTION_API_URL não está definida nas variáveis de ambiente')
  }

  if (!apiKey) {
    throw new Error('EVOLUTION_API_KEY não está definida nas variáveis de ambiente')
  }

  return new EvolutionAPIClient(baseUrl, apiKey)
}

// ============================================================================
// INSTÂNCIA SINGLETON (OPCIONAL)
// ============================================================================

let evolutionClient: EvolutionAPIClient | null = null

export function getEvolutionAPIClient(): EvolutionAPIClient {
  if (!evolutionClient) {
    evolutionClient = createEvolutionAPIClient()
  }
  return evolutionClient
} 