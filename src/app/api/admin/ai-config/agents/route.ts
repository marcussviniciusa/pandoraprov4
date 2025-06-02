import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AIProvider, AIModel, AgentType } from "@/generated/prisma"
import { multiProviderAIManager } from "@/lib/ai/multi-provider-manager"

// GET - Listar agentes do escritório
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!session.user.officeId) {
      return NextResponse.json({ error: "Escritório não encontrado" }, { status: 400 })
    }

    const agents = await prisma.aiAgent.findMany({
      where: { officeId: session.user.officeId },
      orderBy: { createdAt: 'asc' }
    })

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

// POST - Criar novo agente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!session.user.officeId) {
      return NextResponse.json({ error: "Escritório não encontrado" }, { status: 400 })
    }

    const body = await request.json()
    const { 
      name, 
      type, 
      prompt, 
      provider, 
      aiModel, 
      temperature = 0.7, 
      maxTokens = 1000 
    } = body

    // Validações
    if (!name || !type || !prompt || !provider || !aiModel) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios: name, type, prompt, provider, aiModel" },
        { status: 400 }
      )
    }

    if (!Object.values(AgentType).includes(type)) {
      return NextResponse.json(
        { error: "Tipo de agente inválido" },
        { status: 400 }
      )
    }

    if (!Object.values(AIProvider).includes(provider)) {
      return NextResponse.json(
        { error: "Provider inválido" },
        { status: 400 }
      )
    }

    if (!Object.values(AIModel).includes(aiModel)) {
      return NextResponse.json(
        { error: "Modelo de IA inválido" },
        { status: 400 }
      )
    }

    // Verificar se o provider está configurado
    const providerConfig = await prisma.aIProviderConfig.findFirst({
      where: {
        officeId: session.user.officeId,
        provider,
        isActive: true
      }
    })

    if (!providerConfig) {
      return NextResponse.json(
        { error: `Provider ${provider} não configurado ou inativo` },
        { status: 400 }
      )
    }

    // Verificar se já existe agente do mesmo tipo (exceto RECEPTIONIST)
    if (type !== AgentType.RECEPTIONIST) {
      const existingAgent = await prisma.aiAgent.findFirst({
        where: {
          officeId: session.user.officeId,
          type,
          isActive: true
        }
      })

      if (existingAgent) {
        return NextResponse.json(
          { error: `Já existe um agente ${type} ativo. Desative o existente antes de criar um novo.` },
          { status: 400 }
        )
      }
    }

    // Criar agente
    const agent = await prisma.aiAgent.create({
      data: {
        name,
        type,
        prompt,
        provider,
        aiModel,
        temperature,
        maxTokens,
        model: `${provider}-${aiModel}`,
        officeId: session.user.officeId
      }
    })

    // Refresh dos agentes
    await multiProviderAIManager.refreshAgents()

    return NextResponse.json({
      success: true,
      message: "Agente criado com sucesso",
      data: agent
    })

  } catch (error) {
    console.error("❌ Erro ao criar agente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Deletar agente
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")

    if (!agentId || !session.user.officeId) {
      return NextResponse.json(
        { error: "AgentId é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se o agente pertence ao escritório
    const agent = await prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        officeId: session.user.officeId
      }
    })

    if (!agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
      )
    }

    // Não permitir deletar o Recepcionista se for o único
    if (agent.type === AgentType.RECEPTIONIST) {
      const receptionistCount = await prisma.aiAgent.count({
        where: {
          officeId: session.user.officeId,
          type: AgentType.RECEPTIONIST,
          isActive: true
        }
      })

      if (receptionistCount <= 1) {
        return NextResponse.json(
          { error: "Não é possível deletar o único Recepcionista ativo" },
          { status: 400 }
        )
      }
    }

    // Deletar agente
    await prisma.aiAgent.delete({
      where: { id: agentId }
    })

    // Refresh dos agentes
    await multiProviderAIManager.refreshAgents()

    return NextResponse.json({
      success: true,
      message: "Agente deletado com sucesso"
    })

  } catch (error) {
    console.error("❌ Erro ao deletar agente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 