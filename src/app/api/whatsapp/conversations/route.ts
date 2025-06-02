// ============================================================================
// API WHATSAPP CONVERSATIONS - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET - Listar conversas WhatsApp
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const instanceId = searchParams.get('instanceId')
    const assignedUserId = searchParams.get('assignedUserId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Construir filtros
    const where: any = {
      instance: {
        officeId: session.user.officeId
      }
    }

    if (search) {
      where.OR = [
        {
          contact: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          contact: {
            pushName: { contains: search, mode: 'insensitive' }
          }
        },
        {
          contact: {
            phoneNumber: { contains: search, mode: 'insensitive' }
          }
        },
        {
          title: { contains: search, mode: 'insensitive' }
        }
      ]
    }

    if (status) {
      where.status = status
    }

    if (instanceId) {
      where.instanceId = instanceId
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId
    }

    if (unreadOnly) {
      where.unreadCount = { gt: 0 }
    }

    const [conversations, total] = await Promise.all([
      prisma.whatsAppConversation.findMany({
        where,
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
          },
          messages: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: {
              id: true,
              content: true,
              messageType: true,
              fromMe: true,
              timestamp: true,
              status: true
            }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { lastMessageAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.whatsAppConversation.count({ where })
    ])

    // Formatar dados para resposta
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title || conv.contact.name || conv.contact.pushName || conv.contact.phoneNumber,
      isGroup: conv.isGroup,
      status: conv.status,
      unreadCount: conv.unreadCount,
      isArchived: conv.isArchived,
      isPinned: conv.isPinned,
      aiEnabled: conv.aiEnabled,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      contact: conv.contact,
      instance: conv.instance,
      assignedUser: conv.assignedUser,
      currentAgent: conv.currentAgent,
      lastMessage: conv.messages[0] || null
    }))

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        unread: conversations.filter(c => c.unreadCount > 0).length,
        assigned: conversations.filter(c => c.assignedUserId).length,
        withAI: conversations.filter(c => c.aiEnabled).length
      }
    })

  } catch (error) {
    console.error('Erro ao listar conversas WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 