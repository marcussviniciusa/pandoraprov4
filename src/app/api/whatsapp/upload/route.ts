// ============================================================================
// API UPLOAD - WHATSAPP MEDIA - PANDORA PRO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ============================================================================
// POST - Upload de arquivo de mídia
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.officeId) {
      return NextResponse.json(
        { error: 'Não autorizado - sem escritório associado' },
        { status: 401 }
      )
    }

    // Apenas ADMIN e SUPER_ADMIN podem fazer upload
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (max 30MB para WhatsApp)
    const maxSize = 30 * 1024 * 1024 // 30MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo permitido: 30MB' },
        { status: 400 }
      )
    }

    // Validar tipos de arquivo permitidos
    const allowedTypes = {
      'image/jpeg': 'image',
      'image/jpg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/webp': 'image',
      'video/mp4': 'video',
      'video/3gpp': 'video',
      'video/quicktime': 'video',
      'audio/mpeg': 'audio',
      'audio/mp4': 'audio',
      'audio/amr': 'audio',
      'audio/ogg': 'audio',
      'audio/wav': 'audio',
      'application/pdf': 'document',
      'application/msword': 'document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
      'application/vnd.ms-excel': 'document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
      'application/vnd.ms-powerpoint': 'document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
      'text/plain': 'document'
    }

    const mediaType = allowedTypes[file.type as keyof typeof allowedTypes]
    if (!mediaType) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado' },
        { status: 400 }
      )
    }

    // Converter arquivo para base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Retornar dados do arquivo processado
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        mediaType,
        base64: dataUrl,
        lastModified: file.lastModified
      }
    })

  } catch (error) {
    console.error('❌ Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 