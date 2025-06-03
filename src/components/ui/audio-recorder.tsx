'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Trash2,
  Send
} from 'lucide-react'

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, duration: number) => void
  onCancel?: () => void
  className?: string
}

export function AudioRecorder({ onAudioReady, onCancel, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000, // Padrão para opus
          channelCount: 1 // Mono para melhor compatibilidade
        } 
      })
      
      streamRef.current = stream
      
      // Usar formato OGG com opus (formato nativo do WhatsApp para voz)
      let mimeType = 'audio/ogg;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback para webm apenas se OGG não for suportado
        mimeType = 'audio/webm;codecs=opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm'
        }
      }
      
      console.log('🎤 Iniciando gravação com formato:', mimeType)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000 // 64kbps para voz (WhatsApp padrão)
      })
      
      const audioChunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
          console.log('🎵 Chunk de áudio:', event.data.size, 'bytes')
        }
      }
      
      mediaRecorder.onstop = () => {
        // Usar audio/ogg para melhor compatibilidade com WhatsApp
        const fileType = mimeType.includes('ogg') ? 'audio/ogg' : 'audio/webm'
        const blob = new Blob(audioChunks, { type: fileType })
        
        console.log('🎵 Áudio gravado:', {
          size: blob.size,
          type: blob.type,
          mimeType: mimeType,
          chunks: audioChunks.length,
          duration: recordingTime,
          minSize: blob.size >= 2048 ? '✅' : '❌ (muito pequeno)'
        })
        
        // Validação de tamanho mínimo (aumentado para 2KB)
        if (blob.size < 2048) {
          console.warn('⚠️ Áudio muito pequeno, pode não ser entregue pelo WhatsApp')
        }
        
        setAudioBlob(blob)
        
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Parar stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250) // Coletar dados a cada 250ms para melhor qualidade
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer de gravação
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      alert('Erro ao acessar microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Verificar duração mínima (aumentado para 2 segundos)
      if (recordingTime < 2) {
        console.warn('⚠️ Áudio muito curto (mín. 2s), continuando gravação...')
        return
      }
      
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setDuration(recordingTime)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setAudioUrl('')
    setIsPlaying(false)
    setDuration(0)
    setRecordingTime(0)
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }

  const sendAudio = () => {
    if (audioBlob) {
      onAudioReady(audioBlob, duration)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`}>
      {!audioBlob ? (
        // Estado de gravação
        <div className="flex items-center space-x-3">
          {!isRecording ? (
            <>
              <Button
                onClick={startRecording}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Mic className="w-4 h-4 mr-2" />
                Gravar
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
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-600">
                  Gravando... {formatTime(recordingTime)}
                </span>
              </div>
              <Button
                onClick={stopRecording}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar
              </Button>
            </>
          )}
        </div>
      ) : (
        // Estado de reprodução
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Button
              onClick={playAudio}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Áudio gravado - {formatTime(duration)}
                </span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
                <div className="h-1 bg-green-500 rounded-full w-full"></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={sendAudio}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Áudio
            </Button>
            
            <Button
              onClick={deleteRecording}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </div>
      )}
    </div>
  )
} 