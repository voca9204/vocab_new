'use client'

import React from 'react'
import { CollectionCard, CollectionListItem } from './collection-card'
import { LoadingMessage } from '@/components/ui/loading-message'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'

interface CollectionGridProps {
  collections: Collection[]
  selectedCollections?: Collection[]
  onSelect?: (collection: Collection) => void
  onUnselect?: (collectionId: string) => void
  onToggle?: (collectionId: string) => void
  viewMode?: 'grid' | 'list'
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function CollectionGrid({
  collections,
  selectedCollections = [],
  onSelect,
  onUnselect,
  onToggle,
  viewMode = 'grid',
  loading = false,
  emptyMessage = '표시할 단어장이 없습니다.',
  className
}: CollectionGridProps) {
  const selectedIds = new Set(selectedCollections.map(c => c.id))

  if (loading) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <LoadingMessage 
          message="단어장을 불러오는 중..."
          size="sm"
        />
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {collections.map((collection) => (
          <CollectionListItem
            key={collection.id}
            collection={collection}
            isSelected={selectedIds.has(collection.id)}
            onSelect={onSelect}
            onUnselect={onUnselect}
            onToggle={onToggle}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
      className
    )}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          isSelected={selectedIds.has(collection.id)}
          onSelect={onSelect}
          onUnselect={onUnselect}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}