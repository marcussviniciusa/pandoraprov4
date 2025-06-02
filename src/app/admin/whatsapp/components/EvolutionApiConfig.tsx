'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Settings, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Zap,
  Shield
} from 'lucide-react'

const configSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
})

interface TestResult {
  status: 'success' | 'error'
  message: string
  details?: any
  responseTime?: string
}

export function EvolutionApiConfig() {
  const [isOpen, setIsOpen] = useState(false)
  const [isTestingConfig, setIsTestingConfig] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      url: 'https://api.marcussviniciusa.cloud',
      apiKey: '',
    },
  })

  const testConfiguration = async (values: z.infer<typeof configSchema>) => {
    setIsTestingConfig(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/whatsapp/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (data.status === 'success') {
        setTestResult({
          status: 'success',
          message: 'Configuração testada com sucesso!',
          details: data.details,
          responseTime: data.details?.responseTime
        })
        toast({
          title: 'Sucesso',
          description: 'Conexão com Evolution API estabelecida!'
        })
      } else {
        setTestResult({
          status: 'error',
          message: data.message || 'Erro na configuração',
          details: data.details
        })
        toast({
          title: 'Erro na Configuração',
          description: data.message || 'Verifique os dados informados',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      toast({
        title: 'Erro',
        description: 'Erro de conexão com o servidor',
        variant: 'destructive'
      })
    } finally {
      setIsTestingConfig(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof configSchema>) => {
    await testConfiguration(values)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configurar API
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Configuração Evolution API</DialogTitle>
              <DialogDescription>
                Configure e teste a conexão com sua instância da Evolution API
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ℹ️ Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                • A Evolution API deve estar rodando e acessível
              </p>
              <p className="text-xs text-muted-foreground">
                • Use a API Key gerada na sua instância Evolution
              </p>
              <p className="text-xs text-muted-foreground">
                • As configurações são armazenadas no arquivo .env
              </p>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Evolution API *</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          placeholder="https://api.exemplo.com"
                          {...field}
                          disabled={isTestingConfig}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-2 shrink-0"
                          onClick={() => window.open(field.value, '_blank')}
                          disabled={!field.value || isTestingConfig}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      URL base da sua instância Evolution API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key *</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          type="password"
                          placeholder="sua-api-key-aqui"
                          {...field}
                          disabled={isTestingConfig}
                        />
                        <Shield className="w-4 h-4 ml-2 text-muted-foreground self-center" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Chave de API gerada na Evolution API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Test Result */}
              {testResult && (
                <Card className={testResult.status === 'success' ? 'border-green-200' : 'border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-2">
                      {testResult.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${
                          testResult.status === 'success' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {testResult.message}
                        </p>
                        
                        {testResult.responseTime && (
                          <p className="text-xs text-muted-foreground">
                            Tempo de resposta: {testResult.responseTime}
                          </p>
                        )}

                        {testResult.details && testResult.status === 'error' && (
                          <p className="text-xs text-red-600 mt-1">
                            {typeof testResult.details === 'object' 
                              ? testResult.details.error || JSON.stringify(testResult.details)
                              : testResult.details
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isTestingConfig}
                >
                  Fechar
                </Button>
                <Button type="submit" disabled={isTestingConfig}>
                  {isTestingConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    'Testar Configuração'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 