'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Image,
  FileText,
  Download,
  Play,
  Pause,
  MessageSquare,
  Bot,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

interface ChatAreaProps {
  conversation: WhatsAppConversation
  messages: WhatsAppMessage[]
  isLoading: boolean
  onSendMessage: (content: string, conversationId: string) => void
  onLoadMore: () => void
}

export function ChatArea({ 
  conversation, 
  messages, 
  isLoading, 
  onSendMessage, 
  onLoadMore 
}: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages])

  // Scroll imediato após enviar mensagem
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        })
      }
    }, 100)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return
    
    setIsSending(true)
    try {
      await onSendMessage(newMessage.trim(), conversation.id)
      setNewMessage('')
      scrollToBottom()
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'DELIVERED':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'READ':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'FAILED':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } else {
        return date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit',
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    } catch {
      return ''
    }
  }

  const getContactDisplayName = (contact: WhatsAppMessage['contact']) => {
    return contact.name || contact.pushName || contact.phoneNumber
  }

  const getContactInitials = (contact: WhatsAppMessage['contact']) => {
    const name = getContactDisplayName(contact)
    return name.slice(0, 2).toUpperCase()
  }

  const renderMessageContent = (message: WhatsAppMessage) => {
    switch (message.messageType) {
      case 'IMAGE':
        return (
          <div className="space-y-2">
            {message.mediaUrl && (
              <div className="relative rounded-lg overflow-hidden max-w-sm">
                <img 
                  src={message.mediaUrl} 
                  alt="Imagem"
                  className="w-full h-auto"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => window.open(message.mediaUrl!, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )
      
      case 'AUDIO':
        return (
          <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 max-w-sm">
            <Button variant="ghost" size="sm" disabled>
              <Play className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-gray-300 rounded-full">
                <div className="h-1 bg-green-500 rounded-full w-0"></div>
              </div>
            </div>
            <span className="text-xs text-gray-500">0:00</span>
          </div>
        )
      
      case 'VIDEO':
        return (
          <div className="space-y-2">
            {message.mediaUrl && (
              <div className="relative rounded-lg overflow-hidden max-w-sm">
                <video 
                  controls
                  className="w-full h-auto"
                  poster={message.mediaUrl}
                >
                  <source src={message.mediaUrl} type={message.mimetype || 'video/mp4'} />
                </video>
              </div>
            )}
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )
      
      case 'DOCUMENT':
        return (
          <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 max-w-sm">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.fileName || 'Documento'}
              </p>
              <p className="text-xs text-gray-500">{message.mimetype}</p>
            </div>
            {message.mediaUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.mediaUrl!, '_blank')}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      
      case 'LOCATION':
        return (
          <div className="bg-gray-100 rounded-lg p-3 max-w-sm">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">📍</span>
              <span className="text-sm font-medium">Localização</span>
            </div>
            <p className="text-sm text-gray-600">{message.content}</p>
          </div>
        )
      
      case 'CONTACT':
        return (
          <div className="bg-gray-100 rounded-lg p-3 max-w-sm">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👤</span>
              <div>
                <p className="text-sm font-medium">Contato</p>
                <p className="text-xs text-gray-600">{message.content}</p>
              </div>
            </div>
          </div>
        )
      
      case 'STICKER':
        return (
          <div className="text-4xl">
            {message.content || '😊'}
          </div>
        )
      
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-gray-500">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Área de Mensagens */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma mensagem ainda
                </h3>
                <p className="text-gray-600">
                  Envie uma mensagem para começar a conversa
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isFromMe = message.fromMe
                const showAvatar = !isFromMe && (
                  index === 0 || 
                  messages[index - 1].fromMe !== message.fromMe ||
                  messages[index - 1].contact.id !== message.contact.id
                )
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} space-x-2`}
                  >
                    {/* Avatar (apenas para mensagens de outros) */}
                    {!isFromMe && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.contact.profilePicUrl || undefined} />
                            <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                              {getContactInitials(message.contact)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    {/* Conteúdo da Mensagem */}
                    <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isFromMe ? 'order-1' : ''}`}>
                      {/* Nome do remetente (apenas em grupos e se não for minha) */}
                      {!isFromMe && conversation.isGroup && showAvatar && (
                        <p className="text-xs text-gray-600 mb-1 ml-3">
                          {getContactDisplayName(message.contact)}
                        </p>
                      )}

                      <div
                        className={`
                          rounded-lg px-3 py-2 shadow-sm
                          ${isFromMe 
                            ? 'bg-green-500 text-white ml-auto' 
                            : 'bg-white text-gray-900'
                          }
                        `}
                      >
                        {/* Conteúdo da mensagem */}
                        {renderMessageContent(message)}

                        {/* Tool Execution (se houver) */}
                        {message.toolExecution && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                            <div className="flex items-center space-x-2 mb-1">
                              <Bot className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-700">
                                Ação Executada
                              </span>
                            </div>
                            <p className="text-xs text-blue-600">
                              {message.toolExecution.description}
                            </p>
                          </div>
                        )}

                        {/* Timestamp e status */}
                        <div className={`flex items-center justify-end space-x-1 mt-1`}>
                          <span className={`text-xs ${isFromMe ? 'text-green-100' : 'text-gray-500'}`}>
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {isFromMe && getMessageStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Área de Input */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          {/* Botão de anexos */}
          <Button variant="ghost" size="sm" disabled>
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Input de mensagem */}
          <div className="flex-1 relative">
            <Input
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || conversation.instance.status !== 'CONNECTED'}
              className="pr-10"
            />
            
            {/* Botão de emoji */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              disabled
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão de enviar */}
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending || conversation.instance.status !== 'CONNECTED'}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Aviso se instância desconectada */}
        {conversation.instance.status !== 'CONNECTED' && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            ⚠️ Instância WhatsApp desconectada. Não é possível enviar mensagens.
          </div>
        )}
      </div>
    </div>
  )
} 