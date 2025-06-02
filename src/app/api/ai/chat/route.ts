import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { multiProviderAIManager } from "@/lib/ai/multi-provider-manager"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      message, 
      agentId, 
      clientPhone,
      clientName,
      conversationHistory = []
    } = body

    // Validações
    if (!message || !agentId || !clientPhone) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios: message, agentId, clientPhone" },
        { status: 400 }
      )
    }

    let conversationId: string | undefined

    // Criar/buscar conversa primeiro se temos officeId
    if (session.user?.officeId) {
      // Buscar ou criar cliente
      let client = await prisma.client.findFirst({
        where: {
          phone: clientPhone,
          officeId: session.user.officeId
        }
      })

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: clientName || "Cliente não identificado",
            phone: clientPhone,
            officeId: session.user.officeId
          }
        })
      }

      // Buscar ou criar conversa
      let conversation = await prisma.conversation.findFirst({
        where: {
          clientId: client.id,
          status: "ACTIVE"
        }
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            clientId: client.id,
            officeId: session.user.officeId,
            createdBy: session.user.id,
            status: "ACTIVE"
          }
        })
      }

      conversationId = conversation.id

      // Salvar mensagem do cliente
      await prisma.message.create({
        data: {
          content: message,
          conversationId: conversation.id,
          isFromClient: true,
          isFromAI: false,
          userId: session.user.id
        }
      })
    }

    // Processar mensagem com o agente de IA (agora com conversationId)
    const result = await multiProviderAIManager.processMessage(
      agentId,
      message,
      {
        clientPhone,
        clientName,
        conversationHistory
      },
      conversationId
    )

    // Salvar resposta da IA se temos conversationId
    if (conversationId && session.user?.id) {
      await prisma.message.create({
        data: {
          content: result.response,
          conversationId,
          isFromClient: false,
          isFromAI: true,
          userId: session.user.id,
          metadata: {
            provider: result.provider,
            model: result.model,
            shouldTransfer: result.shouldTransfer,
            suggestedAgent: result.suggestedAgent,
            suggestedTags: result.suggestedTags,
            toolExecutions: result.toolExecutions
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      shouldTransfer: result.shouldTransfer,
      suggestedAgent: result.suggestedAgent,
      suggestedTags: result.suggestedTags,
      provider: result.provider,
      model: result.model,
      toolExecutions: result.toolExecutions
    })

  } catch (error) {
    console.error("❌ Erro na API de chat:", error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// GET: Listar agentes disponíveis
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Se não tem escritório (super admin), não pode acessar agentes
    if (!session.user.officeId) {
      return NextResponse.json(
        { error: "Super Admin não tem acesso direto aos agentes" },
        { status: 403 }
      )
    }

    const agents = await multiProviderAIManager.getAvailableAgents(session.user.officeId)

    return NextResponse.json({
      success: true,
      data: agents
    })

  } catch (error) {
    console.error("❌ Erro ao listar agentes:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 