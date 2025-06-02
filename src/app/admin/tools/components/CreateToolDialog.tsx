'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  webhookUrl: z.string().url('URL inválida'),
})

type FormData = z.infer<typeof formSchema>

interface Tool {
  id: string
  name: string
  description: string
  webhookUrl: string
  isActive: boolean
  createdAt: string
  createdBy: {
    name: string
    email: string
  }
  _count: {
    executions: number
  }
}

interface CreateToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToolCreated: (tool: Tool) => void
}

export function CreateToolDialog({ open, onOpenChange, onToolCreated }: CreateToolDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      webhookUrl: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        onToolCreated(result.tool)
        form.reset()
        onOpenChange(false)
      } else {
        setError(Array.isArray(result.error) 
          ? result.error.map((e: any) => e.message).join(', ')
          : result.error || 'Erro ao criar tool'
        )
      }
    } catch (error) {
      setError('Erro de conexão')
    } finally {
      setIsSubmitting(false)
    }
  }

  const testWebhook = async () => {
    const webhookUrl = form.getValues('webhookUrl')
    if (!webhookUrl) return

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Teste de conectividade do Pandora Pro',
          requestId: 'test_' + Date.now(),
          timestamp: new Date().toISOString(),
          metadata: {
            toolName: 'Teste',
            source: 'pandora-test'
          }
        })
      })
      
      if (response.ok) {
        alert('✅ Webhook testado com sucesso!')
      } else {
        alert('⚠️ Webhook respondeu, mas com erro: ' + response.status)
      }
    } catch (error) {
      alert('❌ Erro ao testar webhook: ' + (error as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tool de Automação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tool</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Consultar CPF, Gerar Documento" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome descritivo para identificar a automação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Para IA)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva quando e como a IA deve usar esta tool..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Explique detalhadamente quando a IA deve usar esta automação.
                    Seja específico sobre contextos e palavras-chave que devem ativar a tool.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Webhook (n8n)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://sua-instancia-n8n.com/webhook/..."
                        {...field} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={testWebhook}
                        disabled={!field.value}
                      >
                        Testar
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    URL do webhook do seu workflow n8n que processará a automação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Dica:</strong> Use palavras-chave específicas na descrição como "CPF", "consultar", 
                "gerar documento", etc. A IA usará essas palavras para detectar quando executar a automação.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Tool'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 