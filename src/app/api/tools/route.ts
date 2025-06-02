import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createToolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  webhookUrl: z.string().url('URL inválida'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tools = await prisma.tool.findMany({
      where: { officeId: session.user.officeId },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { executions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tools })
  } catch (error) {
    console.error('Erro ao buscar tools:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId || session.user.role === 'USER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, webhookUrl } = createToolSchema.parse(body)

    const tool = await prisma.tool.create({
      data: {
        name,
        description,
        webhookUrl,
        officeId: session.user.officeId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { executions: true } }
      }
    })

    return NextResponse.json({ tool }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar tool:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
} 