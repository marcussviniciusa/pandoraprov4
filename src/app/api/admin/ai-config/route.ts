import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AIProvider, AIModel } from "@/generated/prisma"
import { multiProviderAIManager } from "@/lib/ai/multi-provider-manager"

// GET - Buscar configurações de IA do escritório
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!session.user.officeId) {
      return NextResponse.json({ error: "Escritório não encontrado" }, { status: 400 })
    }

    // Buscar configurações de providers
    const providerConfigs = await prisma.aIProviderConfig.findMany({
      where: { officeId: session.user.officeId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Note: não retornamos a apiKey por segurança
      }
    })

    // Buscar agentes e suas configurações
    const agents = await prisma.aiAgent.findMany({
      where: { officeId: session.user.officeId },
      include: { office: true }
    })

    // Buscar modelos disponíveis
    const availableModels = await multiProviderAIManager.getAvailableModels()

    // Verificar saúde dos providers
    const providerHealth = await multiProviderAIManager.checkProviderHealth(session.user.officeId)

    return NextResponse.json({
      success: true,
      data: {
        providerConfigs,
        agents,
        availableModels,
        providerHealth
      }
    })

  } catch (error) {
    console.error("❌ Erro ao buscar configurações de IA:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST - Criar/atualizar configuração de provider
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
    const { provider, apiKey, isActive = true } = body

    // Validações
    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider e API Key são obrigatórios" },
        { status: 400 }
      )
    }

    if (!Object.values(AIProvider).includes(provider)) {
      return NextResponse.json(
        { error: "Provider inválido" },
        { status: 400 }
      )
    }

    // Criar ou atualizar configuração
    const config = await prisma.aIProviderConfig.upsert({
      where: {
        officeId_provider: {
          officeId: session.user.officeId,
          provider
        }
      },
      update: {
        apiKey,
        isActive,
        updatedAt: new Date()
      },
      create: {
        officeId: session.user.officeId,
        provider,
        apiKey,
        isActive
      }
    })

    // Refresh dos agentes para usar nova configuração
    await multiProviderAIManager.refreshAgents()

    return NextResponse.json({
      success: true,
      message: `Configuração do ${provider} ${isActive ? 'ativada' : 'desativada'} com sucesso`,
      data: {
        id: config.id,
        provider: config.provider,
        isActive: config.isActive
      }
    })

  } catch (error) {
    console.error("❌ Erro ao salvar configuração de provider:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// PUT - Atualizar agente com novo modelo
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!session.user.officeId) {
      return NextResponse.json({ error: "Escritório não encontrado" }, { status: 400 })
    }

    const body = await request.json()
    const { agentId, provider, aiModel, temperature, maxTokens } = body

    // Validações
    if (!agentId || !provider || !aiModel) {
      return NextResponse.json(
        { error: "AgentId, provider e aiModel são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se o agente pertence ao escritório
    const existingAgent = await prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        officeId: session.user.officeId
      }
    })

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
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

    // Atualizar agente
    const updatedAgent = await prisma.aiAgent.update({
      where: { id: agentId },
      data: {
        provider,
        aiModel,
        temperature: temperature ?? existingAgent.temperature,
        maxTokens: maxTokens ?? existingAgent.maxTokens,
        model: `${provider}-${aiModel}`, // Identificador único
        updatedAt: new Date()
      }
    })

    // Refresh dos agentes
    await multiProviderAIManager.refreshAgents()

    return NextResponse.json({
      success: true,
      message: "Agente atualizado com sucesso",
      data: updatedAgent
    })

  } catch (error) {
    console.error("❌ Erro ao atualizar agente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Remover configuração de provider
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "USER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider") as AIProvider

    if (!provider || !session.user.officeId) {
      return NextResponse.json(
        { error: "Provider e officeId são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se há agentes usando este provider
    const agentsUsingProvider = await prisma.aiAgent.findMany({
      where: {
        officeId: session.user.officeId,
        provider,
        isActive: true
      }
    })

    if (agentsUsingProvider.length > 0) {
      return NextResponse.json(
        { 
          error: `Não é possível remover ${provider}. ${agentsUsingProvider.length} agente(s) ainda está(ão) usando este provider.`,
          agentsCount: agentsUsingProvider.length
        },
        { status: 400 }
      )
    }

    // Remover configuração
    await prisma.aIProviderConfig.deleteMany({
      where: {
        officeId: session.user.officeId,
        provider
      }
    })

    // Refresh dos agentes
    await multiProviderAIManager.refreshAgents()

    return NextResponse.json({
      success: true,
      message: `Configuração do ${provider} removida com sucesso`
    })

  } catch (error) {
    console.error("❌ Erro ao remover configuração de provider:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 