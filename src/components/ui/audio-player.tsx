'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { 
  Play, 
  Pause, 
  Volume2,
  Download
} from 'lucide-react'

interface AudioPlayerProps {
  audioUrl?: string | null
  fileName?: string | null
  caption?: string | null
  isFromMe?: boolean
  className?: string
}

export function AudioPlayer({ 
  audioUrl, 
  fileName, 
  caption, 
  isFromMe = false, 
  className 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    // Se é base64, criar blob URL
    if (audioUrl.startsWith('data:')) {
      try {
        const response = fetch(audioUrl)
        response.then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob)
            audio.src = blobUrl
            
            // Cleanup function para revogar URL
            return () => URL.revokeObjectURL(blobUrl)
          })
          .catch(() => setError('Erro ao processar áudio'))
      } catch {
        setError('Formato de áudio inválido')
        return
      }
    }

    const handleLoadStart = () => setIsLoading(true)
    const handleLoadedData = () => {
      setIsLoading(false)
      setDuration(audio.duration || 0)
    }
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleError = () => {
      setError('Erro ao carregar áudio')
      setIsLoading(false)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl])

  const togglePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error)
      setError('Erro ao reproduzir áudio')
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickPercentage = clickX / rect.width
    const newTime = clickPercentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Se não há URL de áudio, mostrar placeholder
  if (!audioUrl) {
    return (
      <div className={`flex items-center space-x-3 ${
        isFromMe ? 'bg-green-400/20' : 'bg-gray-100'
      } rounded-lg p-3 max-w-sm ${className}`}>
        <Button variant="ghost" size="sm" disabled>
          <Volume2 className="w-4 h-4 text-gray-400" />
        </Button>
        <div className="flex-1">
          <div className={`text-xs mb-1 ${
            isFromMe ? 'text-green-700' : 'text-gray-600'
          }`}>
            🎵 {fileName || caption || 'Mensagem de áudio'}
          </div>
          <div className="h-1 bg-gray-300 rounded-full">
            <div className="h-1 bg-gray-400 rounded-full w-0"></div>
          </div>
          <div className={`text-[10px] mt-1 ${
            isFromMe ? 'text-green-600' : 'text-gray-500'
          }`}>
            Áudio não disponível
          </div>
        </div>
        <span className={`text-xs ${
          isFromMe ? 'text-green-600' : 'text-gray-400'
        }`}>
          --:--
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-3 ${
        isFromMe ? 'bg-red-400/20' : 'bg-red-50'
      } rounded-lg p-3 max-w-sm ${className}`}>
        <Volume2 className="w-4 h-4 text-red-400" />
        <div className="flex-1">
          <div className="text-xs text-red-600">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Player Principal */}
      <div className={`flex items-center space-x-3 ${
        isFromMe ? 'bg-green-400/20' : 'bg-gray-100'
      } rounded-lg p-3 max-w-sm transition-all duration-200 hover:shadow-sm`}>
        
        {/* Botão Play/Pause */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={togglePlayPause}
          disabled={isLoading}
          className={`flex-shrink-0 ${
            isFromMe 
              ? 'hover:bg-green-500/30 text-green-700' 
              : 'hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        
        {/* Área do Player */}
        <div className="flex-1 min-w-0">
          {/* Nome do arquivo */}
          {(fileName || caption) && (
            <div className={`text-xs mb-1 truncate ${
              isFromMe ? 'text-green-800' : 'text-gray-600'
            }`}>
              <span className={`mr-1 ${isPlaying ? 'animate-pulse' : ''}`}>
                🎵
              </span>
              {fileName || caption}
            </div>
          )}
          
          {/* Barra de progresso */}
          <div 
            className="relative h-2 bg-gray-300 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${
                isFromMe ? 'bg-green-600' : 'bg-blue-500'
              } ${isPlaying ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            />
            
            {/* Indicador de posição */}
            <div 
              className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-all duration-100 ${
                isFromMe ? 'bg-green-700' : 'bg-blue-600'
              } opacity-0 group-hover:opacity-100`}
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>
        
        {/* Tempo */}
        <div className="flex flex-col items-end text-xs text-gray-500 min-w-[35px]">
          <span className={isFromMe ? 'text-green-700' : 'text-gray-600'}>
            {formatTime(currentTime)}
          </span>
          {duration > 0 && (
            <span className={`text-[10px] ${isFromMe ? 'text-green-600' : 'text-gray-400'}`}>
              {formatTime(duration)}
            </span>
          )}
        </div>

        {/* Botão de Download */}
        {audioUrl && audioUrl.startsWith('http') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(audioUrl, '_blank')}
            className={`flex-shrink-0 ${
              isFromMe 
                ? 'hover:bg-green-500/30 text-green-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Download className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Caption */}
      {caption && caption !== fileName && (
        <div className={`text-xs px-1 ${
          isFromMe ? 'text-green-100' : 'text-gray-600'
        }`}>
          {caption}
        </div>
      )}

      {/* Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          className="hidden"
        />
      )}
    </div>
  )
} 