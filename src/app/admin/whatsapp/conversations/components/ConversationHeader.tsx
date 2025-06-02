'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  Phone, 
  Video, 
  MoreVertical,
  Users,
  Bot,
  User,
  Pin,
  Archive,
  Trash2,
  Settings,
  MessageSquare,
  Clock
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

interface ConversationHeaderProps {
  conversation: WhatsAppConversation
  onUpdate: () => void
}

export function ConversationHeader({ conversation, onUpdate }: ConversationHeaderProps) {
  const [isLoading, setIsLoading] = useState(false)

  const getContactDisplayName = () => {
    return conversation.contact.name || 
           conversation.contact.pushName || 
           conversation.contact.phoneNumber ||
           conversation.title
  }

  const getContactInitials = () => {
    const name = getContactDisplayName()
    if (conversation.isGroup) return '👥'
    return name.slice(0, 2).toUpperCase()
  }

  const getStatusText = () => {
    if (conversation.instance.status !== 'CONNECTED') {
      return 'Instância desconectada'
    }
    
    if (conversation.isGroup) {
      return 'Grupo do WhatsApp'
    }
    
    return 'Contato do WhatsApp'
  }

  const getStatusColor = () => {
    switch (conversation.status) {
      case 'OPEN':
        return 'text-green-600'
      case 'CLOSED':
        return 'text-gray-600'
      case 'PENDING':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleAction = async (action: string) => {
    try {
      setIsLoading(true)
      
      // TODO: Implementar ações de conversa
      switch (action) {
        case 'pin':
          // Fixar/desafixar conversa
          break
        case 'archive':
          // Arquivar conversa
          break
        case 'delete':
          // Excluir conversa
          break
        case 'toggleAI':
          // Ativar/desativar IA
          break
        case 'assignUser':
          // Atribuir usuário
          break
        default:
          console.log('Ação não implementada:', action)
      }
      
      onUpdate()
    } catch (error) {
      console.error('Erro ao executar ação:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* Avatar do contato */}
        <Avatar className="w-10 h-10">
          <AvatarImage src={conversation.contact.profilePicUrl || undefined} />
          <AvatarFallback className="bg-green-100 text-green-700">
            {getContactInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Informações do contato */}
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {getContactDisplayName()}
            </h2>
            {conversation.isGroup && (
              <Users className="w-4 h-4 text-gray-500" />
            )}
            {conversation.isPinned && (
              <Pin className="w-4 h-4 text-yellow-500" />
            )}
            {conversation.aiEnabled && (
              <Bot className="w-4 h-4 text-blue-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={getStatusColor()}>
              {getStatusText()}
            </span>
            
            {conversation.assignedUser && (
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {conversation.assignedUser.name}
              </span>
            )}
            
            {conversation.currentAgent && (
              <span className="flex items-center">
                <Bot className="w-3 h-3 mr-1" />
                {conversation.currentAgent.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ações do cabeçalho */}
      <div className="flex items-center space-x-2">
        {/* Botões de ação rápida */}
        {!conversation.isGroup && (
          <>
            <Button variant="ghost" size="sm" disabled>
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <Video className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Menu de mais opções */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleAction('pin')}>
              <Pin className="w-4 h-4 mr-2" />
              {conversation.isPinned ? 'Desafixar conversa' : 'Fixar conversa'}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleAction('toggleAI')}>
              <Bot className="w-4 h-4 mr-2" />
              {conversation.aiEnabled ? 'Desativar IA' : 'Ativar IA'}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleAction('assignUser')}>
              <User className="w-4 h-4 mr-2" />
              {conversation.assignedUser ? 'Alterar responsável' : 'Atribuir responsável'}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Configurações da conversa
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleAction('archive')}>
              <Archive className="w-4 h-4 mr-2" />
              {conversation.isArchived ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => handleAction('delete')}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 