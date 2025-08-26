'use client'

import { cn } from '@/lib/utils'
import { Loader2, BookOpen, Brain, Camera, Globe, User } from 'lucide-react'

interface LoadingMessageProps {
  message?: string
  submessage?: string
  className?: string
  icon?: 'default' | 'wordbook' | 'brain' | 'camera' | 'globe' | 'user'
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingMessage({
  message = '로딩 중...',
  submessage,
  className,
  icon = 'default',
  size = 'md'
}: LoadingMessageProps) {
  const IconComponent = {
    default: Loader2,
    wordbook: BookOpen,
    brain: Brain,
    camera: Camera,
    globe: Globe,
    user: User
  }[icon]

  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      text: 'text-base',
      subtext: 'text-sm'
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      text: 'text-lg',
      subtext: 'text-sm'
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      text: 'text-xl',
      subtext: 'text-base'
    }
  }[size]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses.container,
      className
    )}>
      <IconComponent 
        className={cn(
          "text-blue-600 mb-4",
          sizeClasses.icon,
          icon === 'default' && "animate-spin"
        )}
      />
      
      <h3 className={cn("font-medium text-gray-900", sizeClasses.text)}>
        {message}
      </h3>
      
      {submessage && (
        <p className={cn("text-gray-500 mt-2", sizeClasses.subtext)}>
          {submessage}
        </p>
      )}
    </div>
  )
}

// Predefined loading messages for common scenarios
export const LoadingMessages = {
  LOADING_WORDBOOKS: {
    message: '단어장을 불러오는 중입니다',
    submessage: '잠시만 기다려주세요...',
    icon: 'wordbook' as const
  },
  LOADING_WORDS: {
    message: '선택된 단어장에서 단어를 불러오는 중입니다',
    submessage: '단어 데이터를 가져오고 있습니다...',
    icon: 'brain' as const
  },
  SELECTING_WORDBOOK: {
    message: '단어장을 선택하고 있습니다',
    submessage: '학습 환경을 준비하고 있습니다...',
    icon: 'wordbook' as const
  },
  PREPARING_STUDY: {
    message: '학습을 준비하고 있습니다',
    submessage: '최적의 학습 환경을 설정하고 있습니다...',
    icon: 'brain' as const
  },
  EXTRACTING_PHOTO: {
    message: '사진에서 단어를 추출하고 있습니다',
    submessage: 'AI가 텍스트를 분석하고 있습니다...',
    icon: 'camera' as const
  },
  SAVING_PROGRESS: {
    message: '학습 진도를 저장하고 있습니다',
    submessage: '변경사항을 안전하게 저장 중입니다...',
    icon: 'default' as const
  }
}