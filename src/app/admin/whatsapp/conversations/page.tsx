'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  MessageSquare, 
  Phone, 
  Video, 
  MoreVertical,
  ArrowLeft,
  Users,
  Clock,
  CheckCheck,
  Check,
  Send,
  Paperclip,
  Smile,
  Archive,
  Pin,
  Trash2,
  Plus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import AuthGuard from '@/components/auth/AuthGuard'
import { ConversationsList } from './components/ConversationsList'
import { ChatArea } from './components/ChatArea'
import { ConversationHeader } from './components/ConversationHeader'
import { NewConversationDialog } from './components/NewConversationDialog'

interface WhatsAppConversation {
  id: string
  title: string
  isGroup: boolean
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  unreadCount: number
  isArchived: boolean
  isPinned: boolean
  aiEnabled: boolean
  lastMessageAt: string
  createdAt: string
  contact: {
    id: string
    name: string | null
    pushName: string | null
    phoneNumber: string
    profilePicUrl: string | null
    isGroup: boolean
  }
  instance: {
    id: string
    name: string
    phoneNumber: string | null
    status: string
  }
  assignedUser: {
    id: string
    name: string
    email: string
  } | null
  currentAgent: {
    id: string
    name: string
    type: string
  } | null
  lastMessage: {
    id: string
    content: string
    messageType: string
    fromMe: boolean
    timestamp: string
    status: string
  } | null
}

interface WhatsAppMessage {
  id: string
  content: string
  messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'STICKER' | 'CONTACT' | 'POLL'
  fromMe: boolean
  timestamp: string
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  mediaUrl?: string | null
  mimetype?: string | null
  fileName?: string | null
  contact: {
    id: string
    name: string | null
    pushName: string | null
    phoneNumber: string
    profilePicUrl: string | null
  }
  toolExecution?: {
    id: string
    description: string
    status: string
    responseData: any
  } | null
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [messagesCache, setMessagesCache] = useState<Record<string, WhatsAppMessage[]>>({}) // Cache de mensagens
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showConversationsList, setShowConversationsList] = useState(true)
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
  const [instances, setInstances] = useState<{ id: string; name: string; phoneNumber: string | null; status: string }[]>([])
  const { toast } = useToast()

  // Detectar dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setShowConversationsList(window.innerWidth >= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Carregar conversas
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/whatsapp/conversations?${params}`)
      const data = await response.json()

      if (response.ok) {
        setConversations(data.conversations)
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao carregar conversas',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingConversations(false)
    }
  }, [searchTerm, toast])

  // Carregar instâncias WhatsApp
  const loadInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/instances')
      const data = await response.json()

      if (response.ok) {
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error)
    }
  }, [])

  // Carregar mensagens da conversa selecionada
  const loadMessages = useCallback(async (conversationId: string, forceReload = false) => {
    // Verificar cache primeiro (exceto se forceReload for true)
    if (!forceReload && messagesCache[conversationId]) {
      setMessages(messagesCache[conversationId])
      
      // Marcar como lida em background
      fetch(`/api/whatsapp/conversations/${conversationId}/mark-read`, {
        method: 'POST'
      }).then(response => {
        if (response.ok) {
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unreadCount: 0 }
              : conv
          ))
        }
      }).catch(() => {}) // Ignorar erros silenciosamente
      
      return
    }

    try {
      setIsLoadingMessages(true)
      
      // Carregar mensagens e marcar como lida em paralelo
      const [messagesResponse, markReadResponse] = await Promise.all([
        fetch(`/api/whatsapp/conversations/${conversationId}/messages?limit=20`),
        fetch(`/api/whatsapp/conversations/${conversationId}/mark-read`, {
          method: 'POST'
        })
      ])

      if (messagesResponse.ok) {
        const data = await messagesResponse.json()
        const loadedMessages = data.messages || []
        
        // Atualizar estado e cache
        setMessages(loadedMessages)
        setMessagesCache(prev => ({
          ...prev,
          [conversationId]: loadedMessages
        }))
        
        // Atualizar unreadCount local apenas se mark-read foi bem-sucedido
        if (markReadResponse.ok) {
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unreadCount: 0 }
              : conv
          ))
        }
      } else {
        const data = await messagesResponse.json()
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao carregar mensagens',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingMessages(false)
    }
  }, [toast, messagesCache])

  // Selecionar conversa
  const handleSelectConversation = useCallback(async (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation)
    await loadMessages(conversation.id)
    
    if (isMobile) {
      setShowConversationsList(false)
    }
  }, [loadMessages, isMobile])

  // Voltar para lista (mobile)
  const handleBackToList = useCallback(() => {
    setShowConversationsList(true)
    setSelectedConversation(null)
    setMessages([])
  }, [])

  // Enviar mensagem
  const handleSendMessage = useCallback(async (content: string, conversationId: string) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/whatsapp/instances/${selectedConversation.instance.id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedConversation.contact.phoneNumber,
          message: content,
          messageType: 'text'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Criar mensagem local para adicionar à lista imediatamente
        const newMessage: WhatsAppMessage = {
          id: data.messageId || `temp-${Date.now()}`,
          content,
          messageType: 'TEXT',
          fromMe: true,
          timestamp: new Date().toISOString(),
          status: 'SENT',
          contact: selectedConversation.contact
        }
        
        // Adicionar mensagem à lista local e ao cache
        const updatedMessages = [...messages, newMessage]
        setMessages(updatedMessages)
        setMessagesCache(prev => ({
          ...prev,
          [conversationId]: updatedMessages
        }))
        
        // Atualizar conversa na lista (timestamp e última mensagem)
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessageAt: new Date().toISOString(),
                lastMessage: {
                  id: newMessage.id,
                  content,
                  messageType: 'TEXT',
                  fromMe: true,
                  timestamp: new Date().toISOString(),
                  status: 'SENT'
                }
              }
            : conv
        ))
        
        toast({
          title: 'Mensagem enviada',
          description: 'Sua mensagem foi enviada com sucesso'
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Erro ao enviar',
          description: data.error || 'Erro ao enviar mensagem',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão',
        variant: 'destructive'
      })
    }
  }, [selectedConversation, messages, toast])

  // Carregar conversas ao montar o componente
  useEffect(() => {
    loadConversations()
    loadInstances()
  }, [loadConversations, loadInstances])

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header Mobile */}
        {isMobile && !showConversationsList && selectedConversation && (
          <div className="bg-white border-b flex items-center p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="mr-3"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <ConversationHeader 
              conversation={selectedConversation}
              onUpdate={loadConversations}
            />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de Conversas */}
          {(showConversationsList || !isMobile) && (
            <div className={`${isMobile ? 'w-full' : 'w-80'} bg-white border-r flex flex-col`}>
              {/* Header da Lista */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-xl font-semibold">Conversas WhatsApp</h1>
                  <Button 
                    size="sm"
                    onClick={() => setIsNewConversationOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nova
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Lista de Conversas */}
              <ConversationsList
                conversations={conversations}
                selectedConversation={selectedConversation}
                isLoading={isLoadingConversations}
                onSelectConversation={handleSelectConversation}
                onUpdate={loadConversations}
              />
            </div>
          )}

          {/* Área de Chat */}
          {(!isMobile || !showConversationsList) && (
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Header da Conversa (Desktop) */}
                  {!isMobile && (
                    <div className="bg-white border-b p-4">
                      <ConversationHeader 
                        conversation={selectedConversation}
                        onUpdate={loadConversations}
                      />
                    </div>
                  )}

                  {/* Área de Mensagens */}
                  <ChatArea
                    conversation={selectedConversation}
                    messages={messages}
                    isLoading={isLoadingMessages}
                    onSendMessage={handleSendMessage}
                    onLoadMore={() => {}} // TODO: Implementar paginação
                  />
                </>
              ) : (
                /* Estado Vazio */
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Selecione uma conversa
                    </h3>
                    <p className="text-gray-600">
                      Escolha uma conversa da lista para começar a chatear
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Nova Conversa */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        instances={instances}
        onConversationCreated={loadConversations}
      />
    </AuthGuard>
  )
} 