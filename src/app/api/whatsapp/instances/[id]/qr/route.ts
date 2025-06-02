// ============================================================================
// API WHATSAPP QR CODE - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEvolutionAPIClient } from '@/lib/evolution-api'
import { EvolutionAPIResponse, InstanceStatus, ConnectInstanceResponse } from '@/lib/evolution-api'

interface Params {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// GET - Obter QR Code da instância
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

    // Verificar se instância existe e pertence ao escritório
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

    // Se já está conectada, não precisa de QR Code
    if (instance.status === 'CONNECTED') {
      return NextResponse.json({
        qrCode: null,
        status: 'CONNECTED',
        phoneNumber: instance.phoneNumber,
        message: 'Instância já está conectada'
      })
    }

    // Verificar status na Evolution API antes de buscar QR Code
    const evolutionClient = getEvolutionAPIClient()
    
    // Primeiro, verificar se a instância já está conectada
    try {
      const statusResponse: EvolutionAPIResponse<InstanceStatus> = await evolutionClient.getInstanceStatus(instance.name)
      console.log('🟢 Status atual na Evolution API:', JSON.stringify(statusResponse, null, 2))
      
      if (statusResponse.success && statusResponse.data?.instance?.state === 'open') {
        console.log('🟢 Instância já está conectada na Evolution API! Atualizando banco...')
        
        // Atualizar status para CONNECTED no banco
        await prisma.whatsAppInstance.update({
          where: { id },
          data: {
            status: 'CONNECTED',
            qrCode: null, // Limpar QR Code pois não é mais necessário
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          qrCode: null,
          status: 'CONNECTED',
          instanceName: instance.name,
          phoneNumber: instance.phoneNumber,
          message: 'Instância já está conectada!'
        })
      }
    } catch (statusError) {
      console.log('⚠️ Erro ao verificar status (pode ser normal se instância não existe):', statusError)
    }

    // Buscar QR Code na Evolution API
    const qrResponse: EvolutionAPIResponse<ConnectInstanceResponse> = await evolutionClient.connectInstance(instance.name)

    console.log('🟢 Evolution API Response (connectInstance):', JSON.stringify(qrResponse, null, 2))

    if (!qrResponse.success) {
      console.error('❌ Erro ao obter QR Code:', qrResponse.error)
      return NextResponse.json(
        { 
          error: 'Erro ao obter QR Code',
          details: qrResponse.error?.message 
        },
        { status: 500 }
      )
    }

    console.log('🟢 QR Code data:', {
      hasQrCode: !!qrResponse.data?.base64,
      qrCodeLength: qrResponse.data?.base64?.length,
      qrCodePreview: qrResponse.data?.base64?.substring(0, 50) + '...'
    })

    // Atualizar QR Code no banco se disponível
    if (qrResponse.data?.base64) {
      await prisma.whatsAppInstance.update({
        where: { id },
        data: {
          qrCode: qrResponse.data.base64,
          status: 'CONNECTING',
          updatedAt: new Date()
        }
      })
    }

    // Buscar a instância atualizada para garantir que temos o status correto
    const updatedInstance = await prisma.whatsAppInstance.findUnique({
      where: { id }
    })

    const responseData = {
      qrCode: qrResponse.data?.base64,
      status: updatedInstance?.status || instance.status, // Usar status atualizado
      instanceName: instance.name,
      phoneNumber: instance.phoneNumber
    }

    console.log('🟢 Returning data:', {
      hasQrCode: !!responseData.qrCode,
      status: responseData.status,
      instanceName: responseData.instanceName,
      phoneNumber: responseData.phoneNumber
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Erro ao obter QR Code:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Forçar regeneração do QR Code
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
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

    // Verificar se instância existe e pertence ao escritório
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

    // Verificar se já está conectada antes de regenerar
    const evolutionClient = getEvolutionAPIClient()
    
    try {
      const statusResponse: EvolutionAPIResponse<InstanceStatus> = await evolutionClient.getInstanceStatus(instance.name)
      
      if (statusResponse.success && statusResponse.data?.instance?.state === 'open') {
        console.log('🟢 Instância já está conectada - não é necessário regenerar QR Code')
        
        // Atualizar status no banco se necessário
        if (instance.status !== 'CONNECTED') {
          await prisma.whatsAppInstance.update({
            where: { id },
            data: {
              status: 'CONNECTED',
              qrCode: null,
              updatedAt: new Date()
            }
          })
        }

        return NextResponse.json({
          qrCode: null,
          status: 'CONNECTED',
          message: 'Instância já está conectada - QR Code não necessário'
        })
      }
    } catch (statusError) {
      console.log('⚠️ Erro ao verificar status, prosseguindo com regeneração:', statusError)
    }

    // Reiniciar conexão na Evolution API
    const connectResponse: EvolutionAPIResponse<ConnectInstanceResponse> = await evolutionClient.connectInstance(instance.name)

    if (!connectResponse.success) {
      console.error('Erro ao reconectar instância:', connectResponse.error)
      return NextResponse.json(
        { 
          error: 'Erro ao reconectar instância',
          details: connectResponse.error?.message 
        },
        { status: 500 }
      )
    }

    // Atualizar status e QR Code no banco
    await prisma.whatsAppInstance.update({
      where: { id },
      data: {
        status: 'CONNECTING',
        qrCode: connectResponse.data?.base64 || null,
        phoneNumber: null, // Limpar número anterior
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      qrCode: connectResponse.data?.base64,
      status: 'CONNECTING',
      message: 'QR Code regenerado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao regenerar QR Code:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 