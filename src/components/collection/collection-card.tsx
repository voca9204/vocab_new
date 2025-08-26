'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, X, BookOpen, User, Camera, Globe, Brain, Target } from 'lucide-react'
import type { Collection } from '@/contexts/collection-context-v2'

interface CollectionCardProps {
  collection: Collection
  isSelected?: boolean
  onSelect?: (collection: Collection) => void
  onUnselect?: (collectionId: string) => void
  onToggle?: (collectionId: string) => void
  showActions?: boolean
  className?: string
}

interface CollectionListItemProps extends CollectionCardProps {
  compact?: boolean
}

const getTypeIcon = (type: Collection['type']) => {
  switch (type) {
    case 'official': return BookOpen
    case 'personal': return User
    case 'ai-generated': return Brain
    case 'photo': return Camera
    case 'public': return Globe
    default: return BookOpen
  }
}

const getTypeColor = (type: Collection['type']) => {
  switch (type) {
    case 'official': return 'bg-blue-100 text-blue-800'
    case 'personal': return 'bg-green-100 text-green-800'
    case 'ai-generated': return 'bg-purple-100 text-purple-800'
    case 'photo': return 'bg-yellow-100 text-yellow-800'
    case 'public': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function CollectionCard({
  collection,
  isSelected = false,
  onSelect,
  onUnselect,
  onToggle,
  showActions = true,
  className
}: CollectionCardProps) {
  const Icon = getTypeIcon(collection.type)
  
  const handleClick = () => {
    
    if (onToggle) {
      onToggle(collection.id)
    } else if (isSelected && onUnselect) {
      onUnselect(collection.id)
    } else if (!isSelected && onSelect) {
      onSelect(collection)
    }
  }

  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-gray-600" />
            <Badge className={cn('text-xs', getTypeColor(collection.type))}>
              {collection.type}
            </Badge>
          </div>
          {showActions && (
            <Button
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              className="h-6 w-6 p-0"
            >
              {isSelected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </Button>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {collection.name}
        </h3>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span>{collection.wordCount} 단어</span>
          </div>
          {collection.progress && (
            <span>{collection.progress.studied}/{collection.wordCount}</span>
          )}
        </div>
        
        {collection.progress && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ 
                  width: `${Math.round((collection.progress.studied / collection.wordCount) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CollectionListItem({
  collection,
  isSelected = false,
  onSelect,
  onUnselect,
  onToggle,
  showActions = true,
  compact = false,
  className
}: CollectionListItemProps) {
  const Icon = getTypeIcon(collection.type)
  
  const handleClick = () => {
    
    if (onToggle) {
      onToggle(collection.id)
    } else if (isSelected && onUnselect) {
      onUnselect(collection.id)
    } else if (!isSelected && onSelect) {
      onSelect(collection)
    }
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{collection.name}</h4>
          {!compact && (
            <p className="text-sm text-gray-600">
              {collection.wordCount} 단어
              {collection.progress && (
                <span className="ml-2">
                  · {collection.progress.studied} 학습됨
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={cn('text-xs', getTypeColor(collection.type))}>
          {collection.type}
        </Badge>
        {showActions && (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            className="h-6 w-6 p-0"
          >
            {isSelected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}