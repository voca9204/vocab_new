// Dynamic routes for personal collection operations
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { isAdmin } from '@/lib/auth/admin'
import type { PersonalCollection } from '@/types/collections'

// Helper function to get user quota
async function getUserQuota(userId: string, userEmail?: string) {
  const db = getAdminFirestore()
  const quotaDoc = await db.collection('user_quotas').doc(userId).get()
  
  if (quotaDoc.exists) {
    return quotaDoc.data()
  }
  
  // Create default quota for new user
  const plan = (userEmail && isAdmin(userEmail)) ? 'admin' : 'free'
  const PLAN_LIMITS = {
    free: {
      maxVocabularies: 5,
      maxWordsPerVocabulary: 100,
      maxTotalWords: 500,
      maxFileSize: 5 * 1024 * 1024,
    },
    admin: {
      maxVocabularies: -1,
      maxWordsPerVocabulary: -1,
      maxTotalWords: -1,
      maxFileSize: -1,
    }
  }
  
  const newQuota = {
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

// DELETE /api/collections/personal/[id] - Delete a personal collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    console.log('🗑️ [Personal Collections API] DELETE 요청, ID:', collectionId)
    
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
    
    console.log('🗑️ [Personal Collections API] 사용자 인증 완료:', userId)
    
    const db = getAdminFirestore()
    
    // Get collection to verify ownership
    const collectionDoc = await db.collection('personal_collections').doc(collectionId).get()
    
    if (!collectionDoc.exists) {
      console.log('❌ [Personal Collections API] 컬렉션 없음:', collectionId)
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    const collectionData = collectionDoc.data() as PersonalCollection
    
    // Check ownership
    if (collectionData.userId !== userId && !isAdmin(userEmail)) {
      console.log('❌ [Personal Collections API] 권한 없음')
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

// PUT /api/collections/personal/[id] - Update a personal collection
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    console.log('📝 [Personal Collections API] PUT 요청, ID:', collectionId)
    
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
    
    // Parse request body
    const body = await request.json()
    
    // Update allowed fields
    const updates: any = {
      updatedAt: new Date()
    }
    
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.isPrivate !== undefined) updates.isPrivate = body.isPrivate
    if (body.tags !== undefined) updates.tags = body.tags
    
    // Update collection
    await db.collection('personal_collections').doc(collectionId).update(updates)
    
    console.log('✅ [Personal Collections API] 컬렉션 업데이트 완료:', collectionId)
    
    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      collectionId
    })
    
  } catch (error) {
    console.error('❌ [Personal Collections API] PUT 오류:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}