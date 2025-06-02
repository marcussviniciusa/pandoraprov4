// ============================================================================
// API WHATSAPP CONTACT [ID] - PANDORA PRO
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
// GET - Obter contato específico
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

    const contact = await prisma.whatsAppContact.findFirst({
      where: {
        id: params.id,
        instance: {
          officeId: session.user.officeId
        }
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            document: true,
            isLead: true,
            notes: true
          }
        },
        conversations: {
          select: {
            id: true,
            status: true,
            unreadCount: true,
            lastMessageAt: true,
            isArchived: true
          }
        },
        _count: {
          select: {
            messages: true,
            imports: true
          }
        }
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contact })

  } catch (error) {
    console.error('Erro ao buscar contato WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Atualizar contato
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
      name, 
      notes, 
      tags, 
      isBlocked, 
      clientId 
    } = body

    // Verificar se contato existe e pertence ao escritório
    const existingContact = await prisma.whatsAppContact.findFirst({
      where: {
        id: params.id,
        instance: {
          officeId: session.user.officeId
        }
      }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    // Validar cliente se fornecido
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          officeId: session.user.officeId
        }
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Cliente não encontrado ou não pertence ao escritório' },
          { status: 400 }
        )
      }
    }

    // Atualizar contato
    const updatedContact = await prisma.whatsAppContact.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(notes !== undefined && { notes }),
        ...(Array.isArray(tags) && { tags }),
        ...(typeof isBlocked === 'boolean' && { isBlocked }),
        ...(clientId !== undefined && { clientId }),
        updatedAt: new Date()
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isLead: true
          }
        }
      }
    })

    return NextResponse.json({
      contact: updatedContact,
      message: 'Contato atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar contato WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 