// ============================================================================
// API HEALTH CHECK EVOLUTION API - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvolutionAPIClient } from '@/lib/evolution-api'

// ============================================================================
// GET - Verificar saúde da Evolution API
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      )
    }

    // Verificar variáveis de ambiente
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionUrl || !evolutionKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Configuração da Evolution API incompleta',
        details: {
          hasUrl: !!evolutionUrl,
          hasKey: !!evolutionKey,
          url: evolutionUrl ? evolutionUrl.replace(/\/+$/, '') : null
        },
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Testar conectividade
    const client = getEvolutionAPIClient()
    const startTime = Date.now()
    
    try {
      const pingResult = await client.ping()
      const responseTime = Date.now() - startTime

      if (pingResult.success) {
        return NextResponse.json({
          status: 'healthy',
          message: 'Evolution API conectada com sucesso',
          details: {
            url: evolutionUrl.replace(/\/+$/, ''),
            responseTime: `${responseTime}ms`,
            data: pingResult.data
          },
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao conectar com Evolution API',
          details: {
            url: evolutionUrl.replace(/\/+$/, ''),
            responseTime: `${responseTime}ms`,
            error: pingResult.error
          },
          timestamp: new Date().toISOString()
        }, { status: 502 })
      }
    } catch (connectionError) {
      const responseTime = Date.now() - startTime
      
      return NextResponse.json({
        status: 'error',
        message: 'Falha na conexão com Evolution API',
        details: {
          url: evolutionUrl.replace(/\/+$/, ''),
          responseTime: `${responseTime}ms`,
          error: connectionError instanceof Error ? connectionError.message : 'Erro desconhecido'
        },
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Erro no health check:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Erro interno no health check',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Testar configuração personalizada
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { url, apiKey } = body

    if (!url || !apiKey) {
      return NextResponse.json(
        { error: 'URL e API Key são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente temporário para teste
    const { EvolutionAPIClient } = await import('@/lib/evolution-api/client')
    const testClient = new EvolutionAPIClient(url, apiKey)
    
    const startTime = Date.now()
    
    try {
      const pingResult = await testClient.ping()
      const responseTime = Date.now() - startTime

      if (pingResult.success) {
        return NextResponse.json({
          status: 'success',
          message: 'Configuração testada com sucesso',
          details: {
            url: url.replace(/\/+$/, ''),
            responseTime: `${responseTime}ms`,
            data: pingResult.data
          },
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Erro na configuração fornecida',
          details: {
            url: url.replace(/\/+$/, ''),
            responseTime: `${responseTime}ms`,
            error: pingResult.error
          },
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }
    } catch (connectionError) {
      const responseTime = Date.now() - startTime
      
      return NextResponse.json({
        status: 'error',
        message: 'Falha na conexão com a configuração fornecida',
        details: {
          url: url.replace(/\/+$/, ''),
          responseTime: `${responseTime}ms`,
          error: connectionError instanceof Error ? connectionError.message : 'Erro desconhecido'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro no teste de configuração:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Erro interno no teste de configuração',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 