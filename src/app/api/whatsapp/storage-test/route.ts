// ============================================================================
// API TESTE STORAGE MINIO - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { testMinioConnection, isMinioConfigured } from '@/lib/storage'

// ============================================================================
// GET - Testar conexão com MinIO
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

    // Apenas ADMIN e SUPER_ADMIN podem testar storage
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      )
    }

    console.log('🧪 Testando conexão MinIO...')

    // Verificar configuração
    const isConfigured = isMinioConfigured()
    
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'MinIO não está configurado. Verifique as variáveis de ambiente.',
        requiredVars: [
          'MINIO_ENDPOINT',
          'MINIO_ACCESS_KEY', 
          'MINIO_SECRET_KEY',
          'MINIO_BUCKET'
        ]
      })
    }

    // Testar conexão
    const connectionTest = await testMinioConnection()
    
    if (connectionTest.success) {
      return NextResponse.json({
        configured: true,
        connected: true,
        message: 'MinIO conectado e funcionando!',
        endpoint: process.env.MINIO_ENDPOINT,
        bucket: process.env.MINIO_BUCKET,
        useSSL: process.env.MINIO_USE_SSL === 'true'
      })
    } else {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Erro na conexão com MinIO',
        error: connectionTest.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro ao testar MinIO:', error)
    return NextResponse.json(
      { 
        configured: false,
        connected: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 