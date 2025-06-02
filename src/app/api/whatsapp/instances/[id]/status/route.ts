// ============================================================================
// API WHATSAPP STATUS - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient } from '@/lib/evolution-api'

interface Params {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// GET - Obter status da instância
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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

    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id,
        officeId: session.user.officeId
      }
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    // Buscar status na Evolution API
    const evolutionClient = getEvolutionAPIClient()
    const statusResponse = await evolutionClient.getInstanceStatus(instance.name)

    if (statusResponse.success && statusResponse.data) {
      console.log('🟢 Status Evolution API:', statusResponse.data)
      
      let newStatus = instance.status

      // Mapear status da Evolution API para o banco
      if (statusResponse.data.instance?.state === 'open') {
        newStatus = 'CONNECTED'
      } else if (statusResponse.data.instance?.state === 'close') {
        newStatus = 'DISCONNECTED'
      } else if (statusResponse.data.instance?.state === 'connecting') {
        newStatus = 'CONNECTING'
      }

      // Atualizar banco se status mudou
      if (newStatus !== instance.status) {
        console.log(`🔄 Atualizando status: ${instance.status} → ${newStatus}`)
        
        const updatedInstance = await prisma.whatsAppInstance.update({
          where: { id },
          data: {
            status: newStatus,
            updatedAt: new Date()
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

        return NextResponse.json(updatedInstance)
      }
    } else {
      // Erro ao obter status - pode ser que a instância não existe mais
      console.log('⚠️ Não foi possível obter status da Evolution API:', statusResponse?.error)
      
      // Se a instância não estava desconectada, marcar como ERROR
      if (instance.status !== 'DISCONNECTED') {
        console.log('🔄 Marcando instância como ERROR (sem comunicação com Evolution API)')
        
        await prisma.whatsAppInstance.update({
          where: { id },
          data: {
            status: 'ERROR',
            updatedAt: new Date()
          }
        })
      }
    }

    // Buscar instância atualizada do banco
    const updatedInstance = await prisma.whatsAppInstance.findFirst({
      where: {
        id,
        officeId: session.user.officeId
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

    return NextResponse.json(updatedInstance)

  } catch (error) {
    console.error('Erro ao obter status da instância:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Atualizar status da instância (restart, logout, etc)
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { action } = body

    if (!action || !['restart', 'logout', 'connect'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use: restart, logout ou connect' },
        { status: 400 }
      )
    }

    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id,
        officeId: session.user.officeId
      }
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    const evolutionClient = getEvolutionAPIClient()
    let actionResponse

    switch (action) {
      case 'restart':
        actionResponse = await evolutionClient.restartInstance(instance.name)
        break
      case 'logout':
        actionResponse = await evolutionClient.logoutInstance(instance.name)
        break
      case 'connect':
        actionResponse = await evolutionClient.connectInstance(instance.name)
        break
      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }

    if (!actionResponse || !actionResponse.success) {
      console.error('❌ Erro na Evolution API:', actionResponse?.error)
      
      // Se o erro é 400 e menciona que a instância não está conectada,
      // atualizar o status no banco para refletir a realidade
      if (actionResponse?.error?.message?.includes('is not connected') || 
          actionResponse?.error?.message?.includes('not connected')) {
        console.log('🔄 Instância já desconectada, atualizando status no banco...')
        
        await prisma.whatsAppInstance.update({
          where: { id },
          data: {
            status: 'DISCONNECTED',
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          message: 'Instância já estava desconectada. Status atualizado.',
          newStatus: 'DISCONNECTED',
          warning: 'A instância já estava desconectada na Evolution API'
        })
      }
      
      return NextResponse.json(
        { 
          error: `Erro ao executar ação "${action}"`,
          details: actionResponse?.error?.message || 'Erro desconhecido'
        },
        { status: 500 }
      )
    }

    // Atualizar status no banco baseado na ação
    let newStatus = instance.status
    if (action === 'logout') {
      newStatus = 'DISCONNECTED'
    } else if (action === 'connect') {
      newStatus = 'CONNECTING'
    }

    // Atualizar instância
    await prisma.whatsAppInstance.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: `Ação "${action}" executada com sucesso`,
      newStatus,
      actionData: actionResponse?.data
    })

  } catch (error) {
    console.error('Erro ao executar ação na instância:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 