// ============================================================================
// API WHATSAPP CONTACTS - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET - Listar contatos WhatsApp
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
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search')
    const instanceId = searchParams.get('instanceId')
    const isGroup = searchParams.get('isGroup')
    const isBlocked = searchParams.get('isBlocked')
    const hasClient = searchParams.get('hasClient') === 'true'

    // Construir filtros
    const where: any = {
      instance: {
        officeId: session.user.officeId
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { pushName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (instanceId) {
      where.instanceId = instanceId
    }

    if (isGroup !== null && isGroup !== undefined) {
      where.isGroup = isGroup === 'true'
    }

    if (isBlocked !== null && isBlocked !== undefined) {
      where.isBlocked = isBlocked === 'true'
    }

    if (hasClient) {
      where.clientId = { not: null }
    }

    const [contacts, total] = await Promise.all([
      prisma.whatsAppContact.findMany({
        where,
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
          },
          _count: {
            select: {
              conversations: true,
              messages: true
            }
          }
        },
        orderBy: [
          { lastSeen: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.whatsAppContact.count({ where })
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        groups: contacts.filter(c => c.isGroup).length,
        blocked: contacts.filter(c => c.isBlocked).length,
        withClient: contacts.filter(c => c.clientId).length
      }
    })

  } catch (error) {
    console.error('Erro ao listar contatos WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 