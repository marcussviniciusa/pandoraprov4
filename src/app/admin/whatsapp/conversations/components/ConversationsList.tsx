'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  MoreVertical, 
  Users, 
  Pin, 
  Archive, 
  Trash2,
  MessageSquare,
  Clock,
  CheckCheck,
  Check,
  Bot,
  User
} from 'lucide-react'

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

interface ConversationsListProps {
  conversations: WhatsAppConversation[]
  selectedConversation: WhatsAppConversation | null
  isLoading: boolean
  onSelectConversation: (conversation: WhatsAppConversation) => void
  onUpdate: () => void
}

export function ConversationsList({
  conversations,
  selectedConversation,
  isLoading,
  onSelectConversation,
  onUpdate
}: ConversationsListProps) {

  const getContactDisplayName = (conversation: WhatsAppConversation) => {
    return conversation.contact.name || 
           conversation.contact.pushName || 
           conversation.contact.phoneNumber ||
           conversation.title
  }

  const getContactInitials = (conversation: WhatsAppConversation) => {
    const name = getContactDisplayName(conversation)
    if (conversation.isGroup) return '👥'
    return name.slice(0, 2).toUpperCase()
  }

  const getLastMessagePreview = (message: WhatsAppConversation['lastMessage']) => {
    if (!message) return 'Nenhuma mensagem ainda'
    
    switch (message.messageType) {
      case 'IMAGE':
        return '📷 Imagem'
      case 'AUDIO':
        return '🎵 Áudio'
      case 'VIDEO':
        return '📹 Vídeo'
      case 'DOCUMENT':
        return '📄 Documento'
      case 'LOCATION':
        return '📍 Localização'
      case 'STICKER':
        return '😊 Sticker'
      case 'CONTACT':
        return '👤 Contato'
      default:
        return message.content || 'Mensagem'
    }
  }

  const getMessageStatusIcon = (status: string, fromMe: boolean) => {
    if (!fromMe) return null
    
    switch (status) {
      case 'SENT':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'DELIVERED':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'READ':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const formatLastMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } else if (diffInHours < 24 * 7) {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' })
      } else {
        return date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      }
    } catch {
      return ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-gray-500">Carregando conversas...</p>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Nenhuma conversa encontrada
          </h3>
          <p className="text-xs text-gray-500">
            As conversas aparecerão aqui quando receberem mensagens
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`
              flex items-center p-3 rounded-lg cursor-pointer transition-colors
              hover:bg-gray-50
              ${selectedConversation?.id === conversation.id 
                ? 'bg-green-50 border-l-4 border-l-green-500' 
                : 'hover:bg-gray-50'
              }
            `}
            onClick={() => onSelectConversation(conversation)}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={conversation.contact.profilePicUrl || undefined} />
                <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                  {getContactInitials(conversation)}
                </AvatarFallback>
              </Avatar>
              
              {/* Indicadores de status */}
              <div className="absolute -bottom-1 -right-1 flex space-x-1">
                {conversation.isPinned && (
                  <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Pin className="w-2.5 h-2.5 text-yellow-600" />
                  </div>
                )}
                {conversation.aiEnabled && (
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="w-2.5 h-2.5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Conteúdo da Conversa */}
            <div className="flex-1 min-w-0 ml-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {getContactDisplayName(conversation)}
                  </h3>
                  {conversation.isGroup && (
                    <Users className="w-3 h-3 text-gray-400" />
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  {conversation.lastMessage && 
                    getMessageStatusIcon(
                      conversation.lastMessage.status, 
                      conversation.lastMessage.fromMe
                    )
                  }
                  <span className="text-xs text-gray-500">
                    {formatLastMessageTime(conversation.lastMessageAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 truncate flex-1">
                  {getLastMessagePreview(conversation.lastMessage)}
                </p>
                
                <div className="flex items-center space-x-2 ml-2">
                  {/* Badge de mensagens não lidas */}
                  {conversation.unreadCount > 0 && (
                    <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 min-w-[20px] h-5">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Badge>
                  )}
                  
                  {/* Menu de ações */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pin className="w-4 h-4 mr-2" />
                        {conversation.isPinned ? 'Desafixar' : 'Fixar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bot className="w-4 h-4 mr-2" />
                        {conversation.aiEnabled ? 'Desativar IA' : 'Ativar IA'}
                      </DropdownMenuItem>
                      {conversation.assignedUser ? (
                        <DropdownMenuItem>
                          <User className="w-4 h-4 mr-2" />
                          Remover responsável
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <User className="w-4 h-4 mr-2" />
                          Atribuir responsável
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Indicadores adicionais */}
              <div className="flex items-center mt-1 space-x-2">
                {conversation.assignedUser && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    👤 {conversation.assignedUser.name}
                  </span>
                )}
                {conversation.currentAgent && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    🤖 {conversation.currentAgent.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  📱 {conversation.instance.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 