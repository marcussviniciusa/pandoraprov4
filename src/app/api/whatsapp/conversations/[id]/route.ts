// ============================================================================
// API WHATSAPP CONVERSATION [ID] - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    id: string
  }
}

// ============================================================================
// GET - Obter conversa específica
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id: params.id,
        instance: {
          officeId: session.user.officeId
        }
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            pushName: true,
            phoneNumber: true,
            profilePicUrl: true,
            isGroup: true,
            isBlocked: true,
            tags: true,
            notes: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        currentAgent: {
          select: {
            id: true,
            name: true,
            type: true,
            prompt: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })

  } catch (error) {
    console.error('Erro ao buscar conversa WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Atualizar conversa
// ============================================================================
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      status, 
      assignedUserId, 
      currentAgentId, 
      aiEnabled, 
      isArchived, 
      isPinned, 
      title 
    } = body

    // Verificar se conversa existe e pertence ao escritório
    const existingConversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id: params.id,
        instance: {
          officeId: session.user.officeId
        }
      }
    })

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Validar usuário atribuído se fornecido
    if (assignedUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: assignedUserId,
          officeId: session.user.officeId
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Usuário não encontrado ou não pertence ao escritório' },
          { status: 400 }
        )
      }
    }

    // Validar agente IA se fornecido
    if (currentAgentId) {
      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: currentAgentId,
          officeId: session.user.officeId
        }
      })

      if (!agent) {
        return NextResponse.json(
          { error: 'Agente IA não encontrado ou não pertence ao escritório' },
          { status: 400 }
        )
      }
    }

    // Atualizar conversa
    const updatedConversation = await prisma.whatsAppConversation.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(assignedUserId !== undefined && { assignedUserId }),
        ...(currentAgentId !== undefined && { currentAgentId }),
        ...(typeof aiEnabled === 'boolean' && { aiEnabled }),
        ...(typeof isArchived === 'boolean' && { isArchived }),
        ...(typeof isPinned === 'boolean' && { isPinned }),
        ...(title && { title }),
        updatedAt: new Date()
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            pushName: true,
            phoneNumber: true,
            profilePicUrl: true,
            isGroup: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        currentAgent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    return NextResponse.json({
      conversation: updatedConversation,
      message: 'Conversa atualizada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar conversa WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 