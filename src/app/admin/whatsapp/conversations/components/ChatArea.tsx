'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AudioRecorder } from '@/components/ui/audio-recorder'
import { AudioPlayer } from '@/components/ui/audio-player'
import { MediaUploader } from '@/components/ui/media-uploader'
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
  AlertCircle,
  Mic,
  X
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
  onSendMessage: (
    data: {
      content?: string
      messageType: 'text' | 'image' | 'video' | 'audio' | 'document'
      mediaData?: string
      fileName?: string
      caption?: string
    },
    conversationId: string
  ) => void
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
  const [inputMode, setInputMode] = useState<'text' | 'media' | 'audio'>('text')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages])

  // Auto-focus no input quando conversa muda ou componente é montado
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && conversation.instance.status === 'CONNECTED') {
        inputRef.current.focus()
      }
    }
    
    // Focus imediato
    focusInput()
    
    // Focus após um pequeno delay para garantir que o componente esteja totalmente renderizado
    const timeoutId = setTimeout(focusInput, 100)
    
    return () => clearTimeout(timeoutId)
  }, [conversation.id, conversation.instance.status])

  // Manter foco no input após mudanças de estado de envio
  useEffect(() => {
    if (!isSending && conversation.instance.status === 'CONNECTED') {
      // Delay maior para garantir que o DOM foi atualizado
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 200)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isSending, conversation.instance.status])

  // Garantir foco após scroll para baixo
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputRef.current && conversation.instance.status === 'CONNECTED') {
        inputRef.current.focus()
      }
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [messages.length])

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
    
    const messageToSend = newMessage.trim()
    setIsSending(true)
    
    try {
      // Limpar input imediatamente para UX mais fluida
      setNewMessage('')
      
      await onSendMessage(
        {
          content: messageToSend,
          messageType: 'text',
          mediaData: undefined,
          fileName: undefined,
          caption: undefined
        },
        conversation.id
      )
      scrollToBottom()
      
      // Múltiplas tentativas de manter foco com delays diferentes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 150)
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 300)
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // Restaurar mensagem em caso de erro
      setNewMessage(messageToSend)
      // Manter foco mesmo em caso de erro
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter = nova linha (comportamento padrão do textarea)
        return
      } else {
        // Enter = enviar mensagem
        e.preventDefault()
        handleSendMessage()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Esc = limpar input
    if (e.key === 'Escape') {
      setNewMessage('')
      e.preventDefault()
    }
    
    // Ctrl/Cmd + A = selecionar tudo no input
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.stopPropagation() // Previne seleção de toda a página
    }
  }

  const handleInputClick = () => {
    // Garantir foco ao clicar
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Função para garantir foco quando necessário
  const ensureFocus = () => {
    if (inputRef.current && conversation.instance.status === 'CONNECTED') {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
    }
  }

  // Função para envio de mídia
  const handleMediaSend = async (mediaData: string, fileName: string, mediaType: string, caption?: string) => {
    setIsSending(true)
    
    try {
      await onSendMessage(
        {
          content: caption,
          messageType: mediaType as 'image' | 'video' | 'audio' | 'document',
          mediaData,
          fileName,
          caption
        },
        conversation.id
      )
      
      setInputMode('text')
      scrollToBottom()
      
      // Manter foco no input após envio
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 300)
      
    } catch (error) {
      console.error('Erro ao enviar mídia:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Função para envio de áudio
  const handleAudioSend = async (audioBlob: Blob, duration: number) => {
    setIsSending(true)
    
    try {
      console.log('🎵 Iniciando envio de áudio:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        duration: duration
      })
      
      // Converter áudio para base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        
        console.log('🎵 Áudio convertido para base64:', {
          base64Length: base64.length,
          base64Start: base64.substring(0, 100),
          mimeType: base64.split(',')[0],
          audioType: audioBlob.type
        })
        
        // Gerar nome do arquivo baseado no tipo e duração
        const fileExtension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm'
        const fileName = `audio_${Date.now()}.${fileExtension}`
        const durationFormatted = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
        
        await onSendMessage(
          {
            content: `🎵 Áudio - ${durationFormatted}`,
            messageType: 'audio',
            mediaData: base64,
            fileName,
            caption: `Áudio - ${durationFormatted}`
          },
          conversation.id
        )
        
        setInputMode('text')
        scrollToBottom()
        
        // Manter foco no input após envio
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 300)
      }
      
      reader.onerror = (error) => {
        console.error('❌ Erro ao converter áudio para base64:', error)
      }
      
      reader.readAsDataURL(audioBlob)
      
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Função para cancelar modo de mídia/áudio
  const handleCancelMode = () => {
    setInputMode('text')
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
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
          <AudioPlayer
            audioUrl={message.mediaUrl}
            fileName={message.fileName}
            caption={message.content}
            isFromMe={message.fromMe}
          />
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

  // Função para focar no input (pode ser chamada externamente)
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus()
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
        {/* Componentes especiais para mídia e áudio */}
        {inputMode === 'media' && (
          <div className="mb-4">
            <MediaUploader
              onMediaReady={handleMediaSend}
              onCancel={handleCancelMode}
            />
          </div>
        )}
        
        {inputMode === 'audio' && (
          <div className="mb-4">
            <AudioRecorder
              onAudioReady={handleAudioSend}
              onCancel={handleCancelMode}
            />
          </div>
        )}

        {/* Barra de input principal */}
        {inputMode === 'text' && (
          <div className="flex items-center space-x-2">
            {/* Botão de mídia */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setInputMode('media')}
              disabled={isSending || conversation.instance.status !== 'CONNECTED'}
              className="text-gray-500 hover:text-gray-700"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Input de mensagem */}
            <div className="flex-1 relative">
              <Input
                placeholder={
                  conversation.instance.status === 'CONNECTED' 
                    ? "Digite uma mensagem..." 
                    : "Instância desconectada..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
                onBlur={ensureFocus}
                disabled={isSending || conversation.instance.status !== 'CONNECTED'}
                className={`pr-20 transition-all duration-200 ${
                  isSending ? 'opacity-75' : ''
                } ${
                  conversation.instance.status !== 'CONNECTED' 
                    ? 'bg-gray-50 text-gray-400' 
                    : 'bg-white'
                }`}
                ref={inputRef}
                autoComplete="off"
                spellCheck={false}
                autoFocus={conversation.instance.status === 'CONNECTED'}
              />
              
              {/* Botão de emoji */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled
              >
                <Smile className="w-4 h-4" />
              </Button>

              {/* Indicador de digitação */}
              {isSending && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de áudio */}
            <Button
              onClick={() => setInputMode('audio')}
              disabled={isSending || conversation.instance.status !== 'CONNECTED'}
              size="sm"
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              <Mic className="w-4 h-4" />
            </Button>

            {/* Botão de enviar */}
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending || conversation.instance.status !== 'CONNECTED'}
              size="sm"
              className={`transition-all duration-200 ${
                newMessage.trim() && !isSending && conversation.instance.status === 'CONNECTED'
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Barra de controle para modos especiais */}
        {inputMode !== 'text' && (
          <div className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {inputMode === 'media' ? 'Modo de envio de arquivo' : 'Modo de gravação de áudio'}
              </span>
            </div>
            <Button
              onClick={handleCancelMode}
              size="sm"
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Aviso se instância desconectada */}
        {conversation.instance.status !== 'CONNECTED' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Instância WhatsApp desconectada. Não é possível enviar mensagens.</span>
          </div>
        )}

        {/* Dica de uso */}
        {conversation.instance.status === 'CONNECTED' && messages.length === 0 && inputMode === 'text' && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Pressione Enter para enviar • 📎 para arquivos • 🎤 para áudio
          </div>
        )}
      </div>
    </div>
  )
} 