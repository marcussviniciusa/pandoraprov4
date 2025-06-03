// ============================================================================
// MINIO STORAGE CLIENT - PANDORA PRO
// ============================================================================

import { Client as MinioClient } from 'minio'

// Configuração do MinIO a partir das variáveis de ambiente
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, '').replace(/:\d+$/, '') || 'localhost',
  port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : (process.env.MINIO_ENDPOINT?.includes(':443') ? 443 : process.env.MINIO_ENDPOINT?.includes(':80') ? 80 : 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.MINIO_ENDPOINT?.startsWith('https://') || false,
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || ''
}

const bucketName = process.env.MINIO_BUCKET || 'pandora-files'

console.log('🔧 Configuração MinIO:', {
  endPoint: minioConfig.endPoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
  hasAccessKey: !!minioConfig.accessKey,
  hasSecretKey: !!minioConfig.secretKey,
  bucket: bucketName,
  originalEndpoint: process.env.MINIO_ENDPOINT
})

// Cliente MinIO singleton
let minioClient: MinioClient | null = null

/**
 * Obter cliente MinIO (lazy initialization)
 */
export function getMinioClient(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient(minioConfig)
  }
  return minioClient
}

/**
 * Verificar se bucket existe e criar se necessário
 */
export async function ensureBucketExists(): Promise<void> {
  const client = getMinioClient()
  
  const bucketExists = await client.bucketExists(bucketName)
  if (!bucketExists) {
    await client.makeBucket(bucketName)
    console.log(`✅ Bucket '${bucketName}' criado com sucesso`)
  }
}

/**
 * Upload de arquivo de mídia para MinIO
 */
export async function uploadMediaFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = 'whatsapp-media'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getMinioClient()
    
    // Garantir que o bucket existe
    await ensureBucketExists()
    
    // Gerar path único para o arquivo
    const timestamp = Date.now()
    const fileExtension = fileName.split('.').pop() || ''
    const uniqueFileName = `${timestamp}-${fileName}`
    const objectPath = `${folder}/${uniqueFileName}`
    
    // Metadata do arquivo
    const metadata = {
      'Content-Type': mimeType,
      'X-Uploaded-At': new Date().toISOString(),
      'X-Original-Name': fileName
    }
    
    console.log('📤 Uploading para MinIO:', {
      bucket: bucketName,
      objectPath,
      size: buffer.length,
      mimeType,
      fileName: uniqueFileName
    })
    
    // Upload do arquivo
    const uploadResult = await client.putObject(
      bucketName,
      objectPath,
      buffer,
      buffer.length,
      metadata
    )
    
    // Gerar URL pública (presigned URL com longa expiração)
    const publicUrl = await client.presignedGetObject(
      bucketName,
      objectPath,
      24 * 60 * 60 // 24 horas
    )
    
    console.log('✅ Upload para MinIO bem-sucedido:', {
      etag: uploadResult.etag,
      url: publicUrl,
      objectPath
    })
    
    return {
      success: true,
      url: publicUrl
    }
    
  } catch (error) {
    console.error('❌ Erro no upload para MinIO:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Converter base64 para buffer
 */
export function base64ToBuffer(base64Data: string): { buffer: Buffer; mimeType: string } {
  // Extrair mime type e dados
  const matches = base64Data.match(/^data:([a-zA-Z0-9\/+]+);base64,(.+)$/)
  
  if (!matches) {
    throw new Error('Formato base64 inválido')
  }
  
  const mimeType = matches[1]
  const data = matches[2]
  const buffer = Buffer.from(data, 'base64')
  
  return { buffer, mimeType }
}

/**
 * Upload de áudio gravado para MinIO
 */
export async function uploadAudioFile(
  base64Data: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { buffer, mimeType } = base64ToBuffer(base64Data)
    
    console.log('🎵 Preparando upload de áudio:', {
      fileName,
      mimeType,
      bufferSize: buffer.length
    })
    
    return await uploadMediaFile(buffer, fileName, mimeType, 'whatsapp-audio')
    
  } catch (error) {
    console.error('❌ Erro no upload de áudio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro no upload de áudio'
    }
  }
}

/**
 * Upload de imagem/vídeo para MinIO
 */
export async function uploadImageVideoFile(
  base64Data: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { buffer, mimeType } = base64ToBuffer(base64Data)
    
    console.log('📸 Preparando upload de imagem/vídeo:', {
      fileName,
      mimeType,
      bufferSize: buffer.length
    })
    
    const folder = mimeType.startsWith('video/') ? 'whatsapp-videos' : 'whatsapp-images'
    return await uploadMediaFile(buffer, fileName, mimeType, folder)
    
  } catch (error) {
    console.error('❌ Erro no upload de imagem/vídeo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro no upload de imagem/vídeo'
    }
  }
}

/**
 * Upload de documento para MinIO
 */
export async function uploadDocumentFile(
  base64Data: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { buffer, mimeType } = base64ToBuffer(base64Data)
    
    console.log('📄 Preparando upload de documento:', {
      fileName,
      mimeType,
      bufferSize: buffer.length
    })
    
    return await uploadMediaFile(buffer, fileName, mimeType, 'whatsapp-documents')
    
  } catch (error) {
    console.error('❌ Erro no upload de documento:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro no upload de documento'
    }
  }
}

/**
 * Verificar se MinIO está configurado
 */
export function isMinioConfigured(): boolean {
  return !!(
    process.env.MINIO_ENDPOINT &&
    process.env.MINIO_ACCESS_KEY &&
    process.env.MINIO_SECRET_KEY &&
    process.env.MINIO_BUCKET
  )
}

/**
 * Testar conexão com MinIO
 */
export async function testMinioConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isMinioConfigured()) {
      return {
        success: false,
        error: 'MinIO não está configurado'
      }
    }
    
    const client = getMinioClient()
    await ensureBucketExists()
    
    // Teste simples: listar objetos no bucket
    await client.listObjects(bucketName, '', false).toArray()
    
    return { success: true }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na conexão com MinIO'
    }
  }
} 