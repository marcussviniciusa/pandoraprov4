'use client'

import { useState, useRef } from 'react'
import { Button } from './button'
import { Input } from './input'
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  X, 
  Send,
  Loader2
} from 'lucide-react'

interface MediaFile {
  file: File
  preview: string
  type: 'image' | 'video' | 'document'
}

interface MediaUploaderProps {
  onMediaReady: (mediaData: string, fileName: string, mediaType: string, caption?: string) => void
  onCancel?: () => void
  className?: string
}

export function MediaUploader({ onMediaReady, onCancel, className }: MediaUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = {
    'image/*': 'image',
    'video/*': 'video',
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'text/plain': 'document'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho (30MB)
    if (file.size > 30 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo permitido: 30MB')
      return
    }

    // Determinar tipo de mídia
    let mediaType: 'image' | 'video' | 'document' = 'document'
    
    if (file.type.startsWith('image/')) {
      mediaType = 'image'
    } else if (file.type.startsWith('video/')) {
      mediaType = 'video'
    }

    // Criar preview
    let preview = ''
    if (mediaType === 'image' || mediaType === 'video') {
      preview = URL.createObjectURL(file)
    }

    setSelectedFile({
      file,
      preview,
      type: mediaType
    })
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      // Upload do arquivo
      const formData = new FormData()
      formData.append('file', selectedFile.file)

      const response = await fetch('/api/whatsapp/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro no upload')
      }

      const result = await response.json()
      
      // Chamar callback com dados do arquivo
      onMediaReady(
        result.file.base64,
        result.file.name,
        result.file.mediaType,
        caption.trim() || undefined
      )

    } catch (error) {
      console.error('Erro no upload:', error)
      alert(error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview)
    }
    setSelectedFile(null)
    setCaption('')
    onCancel?.()
  }

  const renderPreview = () => {
    if (!selectedFile) return null

    const { file, preview, type } = selectedFile

    switch (type) {
      case 'image':
        return (
          <div className="relative w-full max-w-sm mx-auto">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto rounded-lg"
            />
          </div>
        )
      
      case 'video':
        return (
          <div className="relative w-full max-w-sm mx-auto">
            <video
              src={preview}
              controls
              className="w-full h-auto rounded-lg"
            />
          </div>
        )
      
      case 'document':
        return (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )
    }
  }

  const getFileTypeIcon = () => {
    if (!selectedFile) return <Upload className="w-6 h-6" />
    
    switch (selectedFile.type) {
      case 'image':
        return <Image className="w-6 h-6" />
      case 'video':
        return <Video className="w-6 h-6" />
      case 'document':
        return <FileText className="w-6 h-6" />
      default:
        return <Upload className="w-6 h-6" />
    }
  }

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`}>
      {!selectedFile ? (
        // Seleção de arquivo
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {getFileTypeIcon()}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Selecione uma imagem, vídeo ou documento
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Máximo: 30MB • Formatos: JPG, PNG, GIF, MP4, PDF, DOC, XLS, TXT
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Escolher Arquivo
            </Button>
            
            {onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="ghost"
                className="text-gray-500"
              >
                Cancelar
              </Button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.keys(acceptedTypes).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        // Preview e envio
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Arquivo selecionado</h4>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="ghost"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {renderPreview()}
          
          {/* Campo de legenda */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Legenda (opcional)
            </label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Digite uma legenda..."
              disabled={isUploading}
              maxLength={1000}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Arquivo
                </>
              )}
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.keys(acceptedTypes).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
} 