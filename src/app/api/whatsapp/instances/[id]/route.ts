// ============================================================================
// API WHATSAPP INSTANCE [ID] - PANDORA PRO
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
// GET - Obter detalhes da instância
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

    if (!instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ instance })

  } catch (error) {
    console.error('Erro ao obter instância WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Atualizar instância
// ============================================================================
export async function PUT(request: NextRequest, { params }: Params) {
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
    const { name, isActive } = body

    // Validações
    if (name && typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nome inválido' },
        { status: 400 }
      )
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Status de ativação inválido' },
        { status: 400 }
      )
    }

    // Verificar se instância existe
    const existingInstance = await prisma.whatsAppInstance.findFirst({
      where: {
        id,
        officeId: session.user.officeId
      }
    })

    if (!existingInstance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o nome já existe em outra instância
    if (name && name !== existingInstance.name) {
      const nameExists = await prisma.whatsAppInstance.findFirst({
        where: {
          name,
          officeId: session.user.officeId,
          id: { not: id }
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'Já existe uma instância com este nome' },
          { status: 409 }
        )
      }
    }

    // Atualizar instância
    const instance = await prisma.whatsAppInstance.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json({
      instance,
      message: 'Instância atualizada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar instância WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Deletar instância
// ============================================================================
export async function DELETE(request: NextRequest, { params }: Params) {
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

    // Verificar se instância existe
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

    // Deletar instância na Evolution API primeiro
    const evolutionClient = getEvolutionAPIClient()
    try {
      await evolutionClient.deleteInstance(instance.name)
    } catch (evolutionError) {
      console.error('Erro ao deletar instância na Evolution API:', evolutionError)
      // Continua mesmo se der erro na Evolution API
    }

    // Deletar instância do banco de dados
    await prisma.whatsAppInstance.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Instância deletada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar instância WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 