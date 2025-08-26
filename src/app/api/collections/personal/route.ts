// Personal Collections API (All Users)

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { isAdmin } from '@/lib/auth/admin'
import type { 
  PersonalCollection,
  UploadPersonalCollectionRequest,
  CollectionFilterOptions,
  UserQuota,
  UserPlan
} from '@/types/collections'

// Plan limits
const PLAN_LIMITS = {
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

// Helper function to get user quota
async function getUserQuota(userId: string, userEmail?: string): Promise<UserQuota> {
  const db = getAdminFirestore()
  const quotaDoc = await db.collection('user_quotas').doc(userId).get()
  
  if (quotaDoc.exists) {
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
  
  await db.collection('user_quotas').doc(userId).set(newQuota)
  return newQuota
}

// GET /api/collections/personal - Get user's personal collections
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Personal Collections API] GET 요청 시작')
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    console.log('🔑 [Personal Collections API] Authorization 헤더:', authHeader ? '존재함' : '없음')
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ [Personal Collections API] 인증 헤더 없음 - 401 반환')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    console.log('🎫 [Personal Collections API] 토큰 추출 완료, 길이:', token?.length)
    
    let auth
    try {
      auth = getAdminAuth()
      console.log('🔐 [Personal Collections API] Firebase Admin Auth 초기화 완료')
    } catch (authError) {
      console.error('❌ [Personal Collections API] Admin Auth 초기화 실패:', authError)
      throw new Error('Admin Auth initialization failed')
    }
    
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log('✅ [Personal Collections API] 토큰 검증 완료, 사용자 ID:', decodedToken.uid)
    } catch (tokenError) {
      console.error('❌ [Personal Collections API] 토큰 검증 실패:', tokenError)
      throw new Error('Token verification failed')
    }
    
    const userId = decodedToken.uid
    const userEmail = decodedToken.email
    
    const { searchParams } = new URL(request.url)
    
    // Check if requesting a specific collection by ID
    const collectionId = searchParams.get('id')
    if (collectionId) {
      console.log('📚 [Personal Collections API] 특정 컬렉션 조회:', collectionId)
      
      const db = getAdminFirestore()
      const collectionDoc = await db.collection('personal_collections').doc(collectionId).get()
      
      if (!collectionDoc.exists) {
        console.log('❌ [Personal Collections API] 컬렉션 없음:', collectionId)
        return NextResponse.json(
          { success: false, error: 'Collection not found' },
          { status: 404 }
        )
      }
      
      const collectionData = collectionDoc.data()
      
      // 권한 확인: 본인 컬렉션이거나 공개 컬렉션이거나 관리자
      if (collectionData.userId !== userId && 
          collectionData.isPrivate !== false && 
          !isAdmin(userEmail)) {
        console.log('❌ [Personal Collections API] 접근 권한 없음')
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
      
      return NextResponse.json({
        success: true,
        collection: {
          id: collectionDoc.id,
          ...collectionData
        }
      })
    }
    
    // Parse filter options for list query
    const options: CollectionFilterOptions = {
      isPrivate: searchParams.get('isPrivate') ? searchParams.get('isPrivate') === 'true' : undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      cursor: searchParams.get('cursor') || undefined
    }
    
    console.log('📊 [Personal Collections API] 필터 옵션:', options)
    
    let db
    try {
      db = getAdminFirestore()
      console.log('🗄️ [Personal Collections API] Firestore 연결 완료')
    } catch (dbError) {
      console.error('❌ [Personal Collections API] Firestore 연결 실패:', dbError)
      console.error('❌ [Personal Collections API] DB 에러 메시지:', (dbError as Error)?.message)
      throw new Error('Firestore connection failed')
    }
    
    // Check if requesting another user's collections (admin only)
    const targetUserId = searchParams.get('userId') || userId
    console.log('👤 [Personal Collections API] 대상 사용자 ID:', targetUserId)
    
    if (targetUserId !== userId && !isAdmin(userEmail)) {
      console.log('❌ [Personal Collections API] 권한 없음 - 403 반환')
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }
    
    console.log('🔍 [Personal Collections API] Firestore 쿼리 시작...')
    let query = db.collection('personal_collections')
      .where('userId', '==', targetUserId)
    
    console.log('🔍 [Personal Collections API] 기본 쿼리 생성 완료')
    
    // Apply filters
    if (options.isPrivate !== undefined) {
      query = query.where('isPrivate', '==', options.isPrivate)
    }
    if (options.tags && options.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', options.tags)
    }
    
    // Apply sorting (Firestore requires orderBy field to be present)
    // 인덱스 문제 해결을 위해 일시적으로 정렬 비활성화
    // const sortField = options.sortBy || 'createdAt'
    // const sortDirection = options.sortOrder || 'desc'
    // query = query.orderBy(sortField, sortDirection as any)
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.cursor) {
      const cursorDoc = await db.collection('personal_collections').doc(options.cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }
    
    console.log('📋 [Personal Collections API] 쿼리 실행 중...')
    console.log('📋 [Personal Collections API] 쿼리 파라미터:', {
      collection: 'personal_collections',
      userId: targetUserId,
      isPrivate: options.isPrivate,
      tags: options.tags,
      // sortBy: sortField,
      // sortOrder: sortDirection,
      limit: options.limit
    })
    
    let snapshot
    try {
      snapshot = await query.get()
      console.log('📄 [Personal Collections API] 문서 개수:', snapshot.docs.length)
    } catch (queryError) {
      console.error('❌ [Personal Collections API] Firestore 쿼리 오류:', queryError)
      console.error('❌ [Personal Collections API] 쿼리 오류 메시지:', (queryError as Error)?.message)
      throw queryError
    }
    
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PersonalCollection[]
    
    console.log('🔍 [Personal Collections API] 컬렉션 매핑 완료:', collections.length, '개')
    
    // Apply search filter (client-side for now)
    let filteredCollections = collections
    if (options.search) {
      const searchLower = options.search.toLowerCase()
      filteredCollections = collections.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.tags.some(t => t.toLowerCase().includes(searchLower))
      )
      console.log('🔎 [Personal Collections API] 검색 필터 적용 후:', filteredCollections.length, '개')
    }
    
    console.log('👤 [Personal Collections API] 사용자 할당량 조회 중...')
    // Get user quota
    const quota = await getUserQuota(targetUserId, userEmail)
    console.log('📊 [Personal Collections API] 할당량 조회 완료:', quota?.usage)
    
    const result = {
      success: true,
      collections: filteredCollections,
      totalCount: filteredCollections.length,
      quota,
      hasMore: collections.length === options.limit,
      nextCursor: collections.length > 0 ? collections[collections.length - 1].id : null
    }
    
    console.log('✅ [Personal Collections API] 성공 응답 준비 완료')
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Personal Collections API] 치명적 오류:', error)
    console.error('❌ [Personal Collections API] 오류 스택:', (error as Error)?.stack)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

// POST /api/collections/personal - Create personal collection
export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email
    
    const body: UploadPersonalCollectionRequest = await request.json()
    
    // Validate required fields
    if (!body.name || !body.words || body.words.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    
    // Check user quota
    const quota = await getUserQuota(userId, userEmail)
    
    // Check vocabulary count limit
    if (quota.plan !== 'admin' && quota.limits.maxVocabularies !== -1) {
      if (quota.usage.vocabularyCount >= quota.limits.maxVocabularies) {
        return NextResponse.json(
          { 
            success: false, 
            error: `단어장 개수 한도 초과 (최대 ${quota.limits.maxVocabularies}개)`,
            quota 
          },
          { status: 400 }
        )
      }
    }
    
    // Check words per vocabulary limit
    if (quota.plan !== 'admin' && quota.limits.maxWordsPerVocabulary !== -1) {
      if (body.words.length > quota.limits.maxWordsPerVocabulary) {
        return NextResponse.json(
          { 
            success: false, 
            error: `단어장당 단어 수 한도 초과 (최대 ${quota.limits.maxWordsPerVocabulary}개)`,
            quota 
          },
          { status: 400 }
        )
      }
    }
    
    // Check total words limit
    if (quota.plan !== 'admin' && quota.limits.maxTotalWords !== -1) {
      if (quota.usage.totalWordCount + body.words.length > quota.limits.maxTotalWords) {
        const remaining = quota.limits.maxTotalWords - quota.usage.totalWordCount
        return NextResponse.json(
          { 
            success: false, 
            error: `총 단어 수 한도 초과 (남은 단어: ${remaining}개)`,
            quota 
          },
          { status: 400 }
        )
      }
    }
    
    // Create the collection document first (needed for reference)
    const collectionRef = db.collection('personal_collections').doc()
    
    // Save words to the personal_collection_words collection
    const wordIds: string[] = []
    const batch = db.batch()
    
    // Process all words in a single loop with batch operations
    const masterChecks = await Promise.all(
      body.words.map((wordData: any) => 
        db.collection('words').doc(wordData.word.toLowerCase()).get()
      )
    )
    
    for (let i = 0; i < body.words.length; i++) {
      const wordData = body.words[i]
      const wordRef = db.collection('personal_collection_words').doc()
      wordIds.push(wordRef.id)
      
      // Ensure no undefined values
      const wordDoc: any = {
        word: wordData.word || '',
        definition: wordData.definition || wordData.korean || '',
        korean: wordData.korean || wordData.definition || '',
        example: wordData.example || wordData.examples?.[0] || '',
        pronunciation: wordData.pronunciation || '',
        etymology: wordData.etymology || '',
        partOfSpeech: wordData.partOfSpeech || [],
        synonyms: wordData.synonyms || [],
        source: {
          type: body.sourceType || 'personal',
          userId,
          addedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Remove any undefined values
      Object.keys(wordDoc).forEach(key => {
        if (wordDoc[key] === undefined) {
          delete wordDoc[key]
        }
      })
      
      batch.set(wordRef, wordDoc)
      
      // AI 캐시에 저장 (마스터 DB에 없는 경우만)
      const masterCheck = masterChecks[i]
      
      if (!masterCheck.exists) {
        // 품질 점수 계산 (더 풍부한 데이터일수록 높은 점수)
        let qualityScore = 0
        if (wordData.definition || wordData.korean) qualityScore += 1
        if (wordData.etymology) qualityScore += 3  // etymology는 높은 가중치
        if (wordData.pronunciation) qualityScore += 2
        if (wordData.example || wordData.examples?.length > 0) qualityScore += 1
        if (wordData.synonyms?.length > 0) qualityScore += 1
        if (wordData.partOfSpeech?.length > 0) qualityScore += 1
        
        const cacheRef = db.collection('ai_generated_words').doc(wordData.word.toLowerCase())
        
        // 기존 캐시 확인
        const existingCache = await cacheRef.get()
        const existingQuality = existingCache.data()?.qualityScore || 0
        
        // 품질이 더 좋은 경우에만 업데이트
        if (!existingCache.exists || qualityScore > existingQuality) {
          batch.set(cacheRef, {
            word: wordData.word.toLowerCase(),
            definition: wordData.definition || wordData.korean || '',
            korean: wordData.korean || wordData.definition || '',
            pronunciation: wordData.pronunciation || '',
            etymology: wordData.etymology || '',
            example: wordData.example || wordData.examples?.[0] || '',
            partOfSpeech: wordData.partOfSpeech || [],
            synonyms: wordData.synonyms || [],
            qualityScore: qualityScore,  // 품질 점수 저장
            source: {
              type: 'ai_cached',
              fromCollection: collectionRef.id,
              userId,
              cachedAt: new Date()
            },
            aiGenerated: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }, { merge: true }) // merge: 기존 데이터가 있으면 합치기
        }
      }
    }
    const collection: PersonalCollection = {
      id: collectionRef.id,
      userId,
      userEmail,
      name: body.name,
      description: body.description,
      words: wordIds,
      wordCount: wordIds.length,
      isPrivate: body.isPrivate ?? true,
      isShared: false,
      tags: body.tags || [],
      source: {
        type: 'manual',
        uploadedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    batch.set(collectionRef, collection)
    
    // Update user quota
    batch.update(db.collection('user_quotas').doc(userId), {
      'usage.vocabularyCount': quota.usage.vocabularyCount + 1,
      'usage.totalWordCount': quota.usage.totalWordCount + wordIds.length,
      updatedAt: new Date()
    })
    
    // Commit the batch
    await batch.commit()
    
    return NextResponse.json({
      success: true,
      collection,
      message: `Successfully created ${body.name} with ${wordIds.length} words`,
      quotaUsage: {
        vocabularyCount: quota.usage.vocabularyCount + 1,
        totalWordCount: quota.usage.totalWordCount + wordIds.length,
        limits: quota.limits
      }
    })
  } catch (error) {
    console.error('Error creating personal collection:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/personal - Delete personal collection
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [Personal Collections API] DELETE 요청 시작')
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email
    
    // Get collection ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const collectionId = pathParts[pathParts.length - 1]
    
    console.log('🗑️ [Personal Collections API] 삭제 대상 컬렉션 ID:', collectionId)
    
    if (!collectionId || collectionId === 'personal') {
      return NextResponse.json(
        { success: false, error: 'Collection ID required' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    
    // Get collection to verify ownership
    const collectionDoc = await db.collection('personal_collections').doc(collectionId).get()
    
    if (!collectionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    const collectionData = collectionDoc.data() as PersonalCollection
    
    // Check ownership
    if (collectionData.userId !== userId && !isAdmin(userEmail)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Start batch operation
    const batch = db.batch()
    
    // Delete collection
    batch.delete(db.collection('personal_collections').doc(collectionId))
    
    // Delete associated words if they exist
    if (collectionData.words && collectionData.words.length > 0) {
      console.log('🗑️ [Personal Collections API] 연관 단어 삭제:', collectionData.words.length, '개')
      // Note: Firestore batch has a limit of 500 operations
      // If there are many words, we might need to split into multiple batches
      const wordsToDelete = collectionData.words.slice(0, 450) // Leave room for other operations
      for (const wordId of wordsToDelete) {
        batch.delete(db.collection('personal_collection_words').doc(wordId))
      }
    }
    
    // Update user quota
    const quota = await getUserQuota(userId, userEmail)
    batch.update(db.collection('user_quotas').doc(userId), {
      'usage.vocabularyCount': Math.max(0, quota.usage.vocabularyCount - 1),
      'usage.totalWordCount': Math.max(0, quota.usage.totalWordCount - (collectionData.wordCount || 0)),
      updatedAt: new Date()
    })
    
    // Commit the batch
    await batch.commit()
    
    console.log('✅ [Personal Collections API] 컬렉션 삭제 완료:', collectionId)
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted collection ${collectionData.name}`,
      deletedId: collectionId
    })
    
  } catch (error) {
    console.error('❌ [Personal Collections API] DELETE 오류:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}

// Note: PUT and DELETE methods are handled in [id]/route.ts for dynamic routing
// Old PUT and DELETE methods removed - use /api/collections/personal/[id] instead