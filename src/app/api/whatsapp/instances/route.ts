// ============================================================================
// API WHATSAPP INSTANCES - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient } from '@/lib/evolution-api'
import { generateId } from '@/lib/utils'

// ============================================================================
// GET - Listar instâncias
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    // Apenas ADMIN e SUPER_ADMIN podem gerenciar instâncias
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const where: any = {
      officeId: session.user.officeId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.status = status
    }

    const [instances, total] = await Promise.all([
      prisma.whatsAppInstance.findMany({
        where,
        include: {
          office: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              conversations: true,
              messages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.whatsAppInstance.count({ where })
    ])

    return NextResponse.json({
      instances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao listar instâncias WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Criar nova instância
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    // Apenas ADMIN e SUPER_ADMIN podem criar instâncias
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nome da instância é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe instância com este nome no escritório
    const existingInstance = await prisma.whatsAppInstance.findFirst({
      where: {
        name,
        officeId: session.user.officeId
      }
    })

    if (existingInstance) {
      return NextResponse.json(
        { error: 'Já existe uma instância com este nome' },
        { status: 409 }
      )
    }

    // Verificar configuração da Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionUrl || !evolutionKey) {
      return NextResponse.json(
        { 
          error: 'Evolution API não configurada',
          details: 'Verifique as variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY no arquivo .env'
        },
        { status: 503 }
      )
    }

    // Testar conectividade com Evolution API primeiro
    const evolutionClient = getEvolutionAPIClient()
    
    try {
      const pingResult = await evolutionClient.ping()
      if (!pingResult.success) {
        return NextResponse.json(
          { 
            error: 'Evolution API não está respondendo',
            details: `Erro: ${pingResult.error?.message || 'Conexão falhou'}. Verifique se a Evolution API está rodando em ${evolutionUrl}`
          },
          { status: 503 }
        )
      }
    } catch (connectError) {
      return NextResponse.json(
        { 
          error: 'Falha na conexão com Evolution API',
          details: `Não foi possível conectar com ${evolutionUrl}. Verifique se o serviço está rodando e as credenciais estão corretas.`
        },
        { status: 503 }
      )
    }

    // Criar instância na Evolution API
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp`
    
    const evolutionResponse = await evolutionClient.createInstance({
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })

    if (!evolutionResponse.success) {
      console.error('Erro ao criar instância na Evolution API:', evolutionResponse.error)
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let errorMessage = 'Erro ao criar instância na Evolution API'
      let details = evolutionResponse.error?.message || 'Erro desconhecido'
      
      if (evolutionResponse.error?.statusCode === 401) {
        errorMessage = 'Credenciais inválidas para Evolution API'
        details = 'Verifique a EVOLUTION_API_KEY no arquivo .env'
      } else if (evolutionResponse.error?.statusCode === 409) {
        errorMessage = 'Instância já existe na Evolution API'
        details = 'Escolha um nome diferente para a instância'
      }
      
      return NextResponse.json(
        { error: errorMessage, details },
        { status: 500 }
      )
    }

    // Criar instância no banco de dados
    const instance = await prisma.whatsAppInstance.create({
      data: {
        id: generateId(),
        name,
        status: 'CONNECTING',
        webhookUrl,
        officeId: session.user.officeId,
        createdById: session.user.id,
        connectionData: evolutionResponse.data as any,
        isActive: true
      },
      include: {
        office: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      }
    })

    // Configurar webhook na Evolution API
    try {
      await evolutionClient.setWebhook(name, {
        url: `${webhookUrl}/${instance.id}`,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE'
        ]
      })
    } catch (webhookError) {
      console.error('Erro ao configurar webhook:', webhookError)
      // Não falha a criação se webhook der erro
    }

    return NextResponse.json({
      instance,
      message: 'Instância criada com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar instância WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 