import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/firestore-v2'
import { VocabularyCollection } from '@/types/collections'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/utils/logger'

// Query Keys
export const collectionQueryKeys = {
  all: ['collections'] as const,
  byId: (id: string) => ['collections', 'byId', id] as const,
  byType: (type: 'official' | 'personal') => ['collections', 'type', type] as const,
  userCollections: (userId: string) => ['collections', 'user', userId] as const,
}

// Fetch all collections
export function useCollections() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: collectionQueryKeys.all,
    queryFn: async () => {
      logger.debug('Fetching all collections')
      const collections: VocabularyCollection[] = []
      
      // Fetch official collections
      const officialQuery = query(collection(db, 'vocabulary_collections'))
      const officialSnapshot = await getDocs(officialQuery)
      
      officialSnapshot.forEach((doc) => {
        const data = doc.data()
        collections.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          description: data.description,
          wordIds: data.wordIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          type: 'official',
          userId: data.userId,
        })
      })
      
      // Fetch personal collections
      if (user) {
        const personalQuery = query(
          collection(db, 'personal_collections'),
          where('userId', '==', user.uid)
        )
        const personalSnapshot = await getDocs(personalQuery)
        
        personalSnapshot.forEach((doc) => {
          const data = doc.data()
          collections.push({
            id: doc.id,
            name: data.name,
            category: data.category,
            description: data.description,
            wordIds: data.wordIds || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            type: 'personal',
            userId: data.userId,
          })
        })
      }
      
      logger.info(`Fetched ${collections.length} collections`)
      return collections
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch single collection
export function useCollection(collectionId: string | null) {
  return useQuery({
    queryKey: collectionQueryKeys.byId(collectionId || ''),
    queryFn: async () => {
      if (!collectionId) return null
      
      logger.debug(`Fetching collection: ${collectionId}`)
      
      // Try official collections first
      const officialDoc = await getDoc(doc(db, 'vocabulary_collections', collectionId))
      if (officialDoc.exists()) {
        const data = officialDoc.data()
        return {
          id: officialDoc.id,
          name: data.name,
          category: data.category,
          description: data.description,
          wordIds: data.wordIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          type: 'official' as const,
          userId: data.userId,
        }
      }
      
      // Try personal collections
      const personalDoc = await getDoc(doc(db, 'personal_collections', collectionId))
      if (personalDoc.exists()) {
        const data = personalDoc.data()
        return {
          id: personalDoc.id,
          name: data.name,
          category: data.category,
          description: data.description,
          wordIds: data.wordIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          type: 'personal' as const,
          userId: data.userId,
        }
      }
      
      return null
    },
    enabled: !!collectionId,
  })
}

// Create new collection
export function useCreateCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (data: {
      name: string
      category: string
      description: string
      wordIds: string[]
      type: 'official' | 'personal'
    }) => {
      if (!user) throw new Error('User not authenticated')
      
      logger.info(`Creating new ${data.type} collection: ${data.name}`)
      
      const collectionData = {
        name: data.name,
        category: data.category,
        description: data.description,
        wordIds: data.wordIds,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
      
      const collectionRef = data.type === 'official'
        ? doc(collection(db, 'vocabulary_collections'))
        : doc(collection(db, 'personal_collections'))
      
      await setDoc(collectionRef, collectionData)
      
      return { id: collectionRef.id, ...collectionData, type: data.type }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all })
    },
  })
}

// Update collection
export function useUpdateCollection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      id: string
      type: 'official' | 'personal'
      updates: Partial<{
        name: string
        category: string
        description: string
        wordIds: string[]
      }>
    }) => {
      logger.info(`Updating ${data.type} collection: ${data.id}`)
      
      const collectionRef = data.type === 'official'
        ? doc(db, 'vocabulary_collections', data.id)
        : doc(db, 'personal_collections', data.id)
      
      await updateDoc(collectionRef, {
        ...data.updates,
        updatedAt: Timestamp.now(),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.byId(variables.id) })
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all })
    },
  })
}

// Delete collection
export function useDeleteCollection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      id: string
      type: 'official' | 'personal'
    }) => {
      logger.info(`Deleting ${data.type} collection: ${data.id}`)
      
      const collectionRef = data.type === 'official'
        ? doc(db, 'vocabulary_collections', data.id)
        : doc(db, 'personal_collections', data.id)
      
      await deleteDoc(collectionRef)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all })
    },
  })
}