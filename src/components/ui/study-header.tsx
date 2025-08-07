'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface StudyHeaderProps {
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  backPath?: string
}

export function StudyHeader({ 
  title, 
  subtitle, 
  rightContent,
  backPath = '/study' 
}: StudyHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backPath)}
          className="p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold whitespace-nowrap">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        <div className="w-10">
          {rightContent}
        </div>
      </div>
    </div>
  )
}