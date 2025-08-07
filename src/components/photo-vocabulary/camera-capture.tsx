'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, X, RotateCcw, Check, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (imageFile: File) => void
  onClose: () => void
  className?: string
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('카메라에 접근할 수 없습니다. 권한을 확인해주세요.')
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageDataUrl)
        stopCamera()
      }
    }, 'image/jpeg', 0.8)
  }, [stopCamera])

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current || !capturedImage) return

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        })
        onCapture(file)
      }
    }, 'image/jpeg', 0.8)
  }, [capturedImage, onCapture])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onCapture(file)
    }
  }, [onCapture])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  // Start camera on mount
  React.useEffect(() => {
    if (!capturedImage) {
      startCamera()
    }

    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [facingMode, capturedImage, startCamera, stopCamera])

  return (
    <div className={cn("fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50", className)}>
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">사진 촬영</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex gap-2">
            {capturedImage ? (
              <>
                <Button onClick={retakePhoto} variant="outline" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  다시 찍기
                </Button>
                <Button onClick={confirmCapture} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  사용하기
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!isStreaming}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  촬영
                </Button>
                <Button onClick={switchCamera} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="mt-3 pt-3 border-t">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              갤러리에서 선택
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CameraCapture