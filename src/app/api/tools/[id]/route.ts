import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateToolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
  webhookUrl: z.string().url('URL inválida').optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tool = await prisma.tool.findFirst({
      where: { 
        id: params.id,
        officeId: session.user.officeId 
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { executions: true } },
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            description: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true
          }
        }
      }
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ tool })
  } catch (error) {
    console.error('Erro ao buscar tool:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId || session.user.role === 'USER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const updateData = updateToolSchema.parse(body)

    // Verifica se a tool existe e pertence ao escritório
    const existingTool = await prisma.tool.findFirst({
      where: { 
        id: params.id,
        officeId: session.user.officeId 
      }
    })

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool não encontrada' }, { status: 404 })
    }

    const tool = await prisma.tool.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { executions: true } }
      }
    })

    return NextResponse.json({ tool })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar tool:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.officeId || session.user.role === 'USER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verifica se a tool existe e pertence ao escritório
    const existingTool = await prisma.tool.findFirst({
      where: { 
        id: params.id,
        officeId: session.user.officeId 
      }
    })

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool não encontrada' }, { status: 404 })
    }

    // Deleta execuções relacionadas primeiro
    await prisma.toolExecution.deleteMany({
      where: { toolId: params.id }
    })

    // Deleta a tool
    await prisma.tool.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Tool deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar tool:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
} 