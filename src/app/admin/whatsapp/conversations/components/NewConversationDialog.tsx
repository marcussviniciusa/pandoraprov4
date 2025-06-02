'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageSquare, Phone } from 'lucide-react'

interface WhatsAppInstance {
  id: string
  name: string
  phoneNumber: string | null
  status: string
}

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instances: WhatsAppInstance[]
  onConversationCreated: () => void
}

export function NewConversationDialog({
  open,
  onOpenChange,
  instances,
  onConversationCreated
}: NewConversationDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [selectedInstance, setSelectedInstance] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Filtrar apenas instâncias conectadas
  const connectedInstances = instances.filter(instance => instance.status === 'CONNECTED')

  const formatPhoneNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '')
    
    // Adiciona automaticamente +55 se não tiver código do país
    if (numbers.length > 0 && !numbers.startsWith('55')) {
      return `+55${numbers}`
    } else if (numbers.length > 0) {
      return `+${numbers}`
    }
    
    return value
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const validatePhoneNumber = (phone: string) => {
    // Remove caracteres não numéricos para validação
    const numbers = phone.replace(/\D/g, '')
    
    // Verifica se tem pelo menos 10 dígitos (código país + DDD + número)
    if (numbers.length < 10) {
      return 'Número deve ter pelo menos 10 dígitos'
    }
    
    // Verifica formato brasileiro (11 ou 10 dígitos após código do país)
    if (numbers.startsWith('55')) {
      const localNumber = numbers.substring(2)
      if (localNumber.length !== 10 && localNumber.length !== 11) {
        return 'Número brasileiro deve ter 10 ou 11 dígitos após o código do país'
      }
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedInstance) {
      toast({
        title: 'Erro',
        description: 'Selecione uma instância WhatsApp',
        variant: 'destructive'
      })
      return
    }

    if (!phoneNumber.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um número de telefone',
        variant: 'destructive'
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma mensagem',
        variant: 'destructive'
      })
      return
    }

    const phoneError = validatePhoneNumber(phoneNumber)
    if (phoneError) {
      toast({
        title: 'Número inválido',
        description: phoneError,
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      // Enviar mensagem (isso criará automaticamente a conversa)
      const response = await fetch(`/api/whatsapp/instances/${selectedInstance}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''), // Enviar apenas números
          message: message.trim(),
          messageType: 'text'
        })
      })

      if (response.ok) {
        toast({
          title: 'Conversa iniciada!',
          description: 'Sua mensagem foi enviada e a conversa foi criada.'
        })
        
        // Limpar formulário
        setPhoneNumber('')
        setMessage('')
        setSelectedInstance('')
        
        // Fechar dialog
        onOpenChange(false)
        
        // Atualizar lista de conversas
        onConversationCreated()
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setPhoneNumber('')
      setMessage('')
      setSelectedInstance('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Digite o número de telefone e envie a primeira mensagem para iniciar uma nova conversa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance">Instância WhatsApp</Label>
            <Select value={selectedInstance} onValueChange={setSelectedInstance}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma instância conectada" />
              </SelectTrigger>
              <SelectContent>
                {connectedInstances.length === 0 ? (
                  <SelectItem value="" disabled>
                    Nenhuma instância conectada
                  </SelectItem>
                ) : (
                  connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{instance.name}</span>
                        {instance.phoneNumber && (
                          <span className="text-muted-foreground">
                            ({instance.phoneNumber})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Número de Telefone</Label>
            <Input
              id="phoneNumber"
              type="text"
              placeholder="+5511999999999"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Digite com código do país. Ex: +5511999999999
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Inicial</Label>
            <Textarea
              id="message"
              placeholder="Olá! Como posso ajudá-lo?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || connectedInstances.length === 0}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar e Criar Conversa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 