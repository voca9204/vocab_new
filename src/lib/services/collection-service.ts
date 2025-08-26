// Collection Management Service

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { 
  OfficialCollection, 
  PersonalCollection, 
  VocabularyCollection,
  CollectionFilterOptions,
  UserQuota,
  UserPlan,
  CollectionsListResponse
} from '@/types/collections'
import { isAdmin } from '@/lib/auth/admin'

// Collection paths
const OFFICIAL_COLLECTIONS = 'vocabulary_collections'
const PERSONAL_COLLECTIONS = 'personal_collections'
const USER_QUOTAS = 'user_quotas'

// Plan limits
const PLAN_LIMITS: Record<UserPlan, UserQuota['limits']> = {
  free: {
    maxVocabularies: 5,
    maxWordsPerVocabulary: 100,
    maxTotalWords: 500,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  premium: {
    maxVocabularies: 50,
    maxWordsPerVocabulary: 1000,
    maxTotalWords: 10000,
    maxFileSize: 20 * 1024 * 1024, // 20MB
  },
  pro: {
    maxVocabularies: -1, // unlimited
    maxWordsPerVocabulary: 10000,
    maxTotalWords: -1, // unlimited
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  admin: {
    maxVocabularies: -1,
    maxWordsPerVocabulary: -1,
    maxTotalWords: -1,
    maxFileSize: -1,
  }
}

export class CollectionService {
  // ==================== User Quota Management ====================
  
  async getUserQuota(userId: string, userEmail?: string): Promise<UserQuota> {
    const quotaRef = doc(db, USER_QUOTAS, userId)
    const quotaDoc = await getDoc(quotaRef)
    
    if (quotaDoc.exists()) {
      return quotaDoc.data() as UserQuota
    }
    
    // Create default quota for new user
    const plan: UserPlan = (userEmail && isAdmin(userEmail)) ? 'admin' : 'free'
    const newQuota: UserQuota = {
      userId,
      plan,
      limits: PLAN_LIMITS[plan],
      usage: {
        vocabularyCount: 0,
        totalWordCount: 0,
        storageUsed: 0
      },
      updatedAt: new Date()
    }
    
    await setDoc(quotaRef, {
      ...newQuota,
      updatedAt: serverTimestamp()
    })
    
    return newQuota
  }
  
  async checkQuota(
    userId: string, 
    wordCount: number,
    userEmail?: string
  ): Promise<{ allowed: boolean; message?: string }> {
    const quota = await this.getUserQuota(userId, userEmail)
    
    // Admins have no limits
    if (quota.plan === 'admin') {
      return { allowed: true }
    }
    
    const { limits, usage } = quota
    
    // Check vocabulary count
    if (limits.maxVocabularies !== -1 && usage.vocabularyCount >= limits.maxVocabularies) {
      return { 
        allowed: false, 
        message: `단어장 개수 한도 초과 (${limits.maxVocabularies}개)` 
      }
    }
    
    // Check total word count
    if (limits.maxTotalWords !== -1 && usage.totalWordCount + wordCount > limits.maxTotalWords) {
      return { 
        allowed: false, 
        message: `총 단어 수 한도 초과 (${limits.maxTotalWords}개)` 
      }
    }
    
    // Check words per vocabulary
    if (limits.maxWordsPerVocabulary !== -1 && wordCount > limits.maxWordsPerVocabulary) {
      return { 
        allowed: false, 
        message: `단어장당 단어 수 한도 초과 (${limits.maxWordsPerVocabulary}개)` 
      }
    }
    
    return { allowed: true }
  }
  
  async updateQuotaUsage(
    userId: string,
    changes: {
      vocabularyCount?: number
      totalWordCount?: number
      storageUsed?: number
    }
  ): Promise<void> {
    const quotaRef = doc(db, USER_QUOTAS, userId)
    
    const updates: any = {
      updatedAt: serverTimestamp()
    }
    
    if (changes.vocabularyCount !== undefined) {
      updates['usage.vocabularyCount'] = increment(changes.vocabularyCount)
    }
    if (changes.totalWordCount !== undefined) {
      updates['usage.totalWordCount'] = increment(changes.totalWordCount)
    }
    if (changes.storageUsed !== undefined) {
      updates['usage.storageUsed'] = increment(changes.storageUsed)
    }
    
    await updateDoc(quotaRef, updates)
  }
  
  // ==================== Official Collections (Admin Only) ====================
  
  async createOfficialCollection(
    collection: Omit<OfficialCollection, 'id' | 'createdAt' | 'updatedAt'>,
    adminEmail: string
  ): Promise<OfficialCollection> {
    if (!isAdmin(adminEmail)) {
      throw new Error('Admin access required')
    }
    
    const collectionRef = doc(collection(db, OFFICIAL_COLLECTIONS))
    const newCollection: OfficialCollection = {
      ...collection,
      id: collectionRef.id,
      isOfficial: true,
      uploadedByEmail: adminEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await setDoc(collectionRef, {
      ...newCollection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    return newCollection
  }
  
  async updateOfficialCollection(
    collectionId: string,
    updates: Partial<OfficialCollection>,
    adminEmail: string
  ): Promise<void> {
    if (!isAdmin(adminEmail)) {
      throw new Error('Admin access required')
    }
    
    const collectionRef = doc(db, OFFICIAL_COLLECTIONS, collectionId)
    await updateDoc(collectionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  }
  
  async deleteOfficialCollection(
    collectionId: string,
    adminEmail: string
  ): Promise<void> {
    if (!isAdmin(adminEmail)) {
      throw new Error('Admin access required')
    }
    
    const collectionRef = doc(db, OFFICIAL_COLLECTIONS, collectionId)
    await deleteDoc(collectionRef)
  }
  
  async getOfficialCollections(
    options?: CollectionFilterOptions
  ): Promise<CollectionsListResponse> {
    let q = query(collection(db, OFFICIAL_COLLECTIONS))
    
    // Apply filters
    if (options?.category) {
      q = query(q, where('category', '==', options.category))
    }
    if (options?.difficulty) {
      q = query(q, where('difficulty', '==', options.difficulty))
    }
    if (options?.tags && options.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', options.tags))
    }
    
    // Apply sorting
    const sortField = options?.sortBy || 'createdAt'
    const sortDirection = options?.sortOrder || 'desc'
    q = query(q, orderBy(sortField, sortDirection))
    
    // Apply pagination
    if (options?.limit) {
      q = query(q, limit(options.limit))
    }
    if (options?.cursor) {
      const cursorDoc = await getDoc(doc(db, OFFICIAL_COLLECTIONS, options.cursor))
      if (cursorDoc.exists()) {
        q = query(q, startAfter(cursorDoc))
      }
    }
    
    const snapshot = await getDocs(q)
    const collections = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as OfficialCollection[]
    
    return {
      collections,
      totalCount: collections.length,
      hasMore: snapshot.docs.length === (options?.limit || 0),
      nextCursor: snapshot.docs[snapshot.docs.length - 1]?.id
    }
  }
  
  // ==================== Personal Collections (All Users) ====================
  
  async createPersonalCollection(
    collection: Omit<PersonalCollection, 'id' | 'createdAt' | 'updatedAt'>,
    userEmail?: string
  ): Promise<PersonalCollection> {
    // Check quota
    const quotaCheck = await this.checkQuota(
      collection.userId,
      collection.wordCount,
      userEmail
    )
    
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.message || 'Quota exceeded')
    }
    
    const collectionRef = doc(collection(db, PERSONAL_COLLECTIONS))
    const newCollection: PersonalCollection = {
      ...collection,
      id: collectionRef.id,
      userEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await setDoc(collectionRef, {
      ...newCollection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    // Update quota usage
    await this.updateQuotaUsage(collection.userId, {
      vocabularyCount: 1,
      totalWordCount: collection.wordCount
    })
    
    return newCollection
  }
  
  async updatePersonalCollection(
    collectionId: string,
    updates: Partial<PersonalCollection>,
    userId: string,
    userEmail?: string
  ): Promise<void> {
    const collectionRef = doc(db, PERSONAL_COLLECTIONS, collectionId)
    const collectionDoc = await getDoc(collectionRef)
    
    if (!collectionDoc.exists()) {
      throw new Error('Collection not found')
    }
    
    const collection = collectionDoc.data() as PersonalCollection
    
    // Check ownership (unless admin)
    if (collection.userId !== userId && !isAdmin(userEmail)) {
      throw new Error('You do not have permission to update this collection')
    }
    
    // If word count is changing, check quota
    if (updates.wordCount && updates.wordCount !== collection.wordCount) {
      const wordDiff = updates.wordCount - collection.wordCount
      if (wordDiff > 0) {
        const quotaCheck = await this.checkQuota(userId, wordDiff, userEmail)
        if (!quotaCheck.allowed) {
          throw new Error(quotaCheck.message || 'Quota exceeded')
        }
      }
      
      // Update quota usage
      await this.updateQuotaUsage(userId, {
        totalWordCount: wordDiff
      })
    }
    
    await updateDoc(collectionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  }
  
  async deletePersonalCollection(
    collectionId: string,
    userId: string,
    userEmail?: string
  ): Promise<void> {
    const collectionRef = doc(db, PERSONAL_COLLECTIONS, collectionId)
    const collectionDoc = await getDoc(collectionRef)
    
    if (!collectionDoc.exists()) {
      throw new Error('Collection not found')
    }
    
    const collection = collectionDoc.data() as PersonalCollection
    
    // Check ownership (unless admin)
    if (collection.userId !== userId && !isAdmin(userEmail)) {
      throw new Error('You do not have permission to delete this collection')
    }
    
    await deleteDoc(collectionRef)
    
    // Update quota usage
    await this.updateQuotaUsage(userId, {
      vocabularyCount: -1,
      totalWordCount: -collection.wordCount
    })
  }
  
  async getPersonalCollections(
    userId: string,
    options?: CollectionFilterOptions
  ): Promise<CollectionsListResponse> {
    let q = query(
      collection(db, PERSONAL_COLLECTIONS),
      where('userId', '==', userId)
    )
    
    // Apply filters
    if (options?.isPrivate !== undefined) {
      q = query(q, where('isPrivate', '==', options.isPrivate))
    }
    if (options?.tags && options.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', options.tags))
    }
    
    // Apply sorting
    const sortField = options?.sortBy || 'createdAt'
    const sortDirection = options?.sortOrder || 'desc'
    q = query(q, orderBy(sortField, sortDirection))
    
    // Apply pagination
    if (options?.limit) {
      q = query(q, limit(options.limit))
    }
    
    const snapshot = await getDocs(q)
    const collections = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as PersonalCollection[]
    
    const quota = await this.getUserQuota(userId)
    
    return {
      collections,
      totalCount: collections.length,
      quota,
      hasMore: snapshot.docs.length === (options?.limit || 0),
      nextCursor: snapshot.docs[snapshot.docs.length - 1]?.id
    }
  }
  
  async getPublicPersonalCollections(
    options?: CollectionFilterOptions
  ): Promise<CollectionsListResponse> {
    let q = query(
      collection(db, PERSONAL_COLLECTIONS),
      where('isPrivate', '==', false)
    )
    
    // Apply filters
    if (options?.tags && options.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', options.tags))
    }
    
    // Apply sorting
    const sortField = options?.sortBy || 'createdAt'
    const sortDirection = options?.sortOrder || 'desc'
    q = query(q, orderBy(sortField, sortDirection))
    
    // Apply pagination
    if (options?.limit) {
      q = query(q, limit(options.limit))
    }
    
    const snapshot = await getDocs(q)
    const collections = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as PersonalCollection[]
    
    return {
      collections,
      totalCount: collections.length,
      hasMore: snapshot.docs.length === (options?.limit || 0),
      nextCursor: snapshot.docs[snapshot.docs.length - 1]?.id
    }
  }
  
  // ==================== Shared Methods ====================
  
  async getCollection(collectionId: string): Promise<VocabularyCollection | null> {
    // Try official collections first
    const officialDoc = await getDoc(doc(db, OFFICIAL_COLLECTIONS, collectionId))
    if (officialDoc.exists()) {
      return {
        ...officialDoc.data(),
        id: officialDoc.id
      } as OfficialCollection
    }
    
    // Then try personal collections
    const personalDoc = await getDoc(doc(db, PERSONAL_COLLECTIONS, collectionId))
    if (personalDoc.exists()) {
      return {
        ...personalDoc.data(),
        id: personalDoc.id
      } as PersonalCollection
    }
    
    return null
  }
  
  async shareCollection(
    collectionId: string,
    userIds: string[],
    userId: string
  ): Promise<void> {
    const collectionRef = doc(db, PERSONAL_COLLECTIONS, collectionId)
    const collectionDoc = await getDoc(collectionRef)
    
    if (!collectionDoc.exists()) {
      throw new Error('Collection not found')
    }
    
    const collection = collectionDoc.data() as PersonalCollection
    
    if (collection.userId !== userId) {
      throw new Error('You do not have permission to share this collection')
    }
    
    await updateDoc(collectionRef, {
      isShared: true,
      sharedWith: userIds,
      updatedAt: serverTimestamp()
    })
  }
}

// Export singleton instance
export const collectionService = new CollectionService()