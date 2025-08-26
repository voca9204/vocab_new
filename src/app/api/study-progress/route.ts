import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import type { StudyActivityType } from '@/types/vocabulary-v2'

export async function POST(request: NextRequest) {
  try {
    const { userId, wordId, result, studyType } = await request.json()
    
    if (!userId || !wordId || !result || !studyType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log(`[study-progress] Recording ${result} result for word ${wordId} by user ${userId} in ${studyType}`)
    
    // Find existing user word record
    const userWordsRef = adminDb.collection('user_words')
    const querySnapshot = await userWordsRef
      .where('userId', '==', userId)
      .where('wordId', '==', wordId)
      .limit(1)
      .get()
    
    const now = new Date()
    let docRef
    let userWord
    
    if (querySnapshot.empty) {
      // Create new user word record
      docRef = userWordsRef.doc()
      userWord = {
        id: docRef.id,
        userId,
        wordId,
        studyStatus: {
          studied: true,
          masteryLevel: result === 'correct' ? 20 : 0,
          confidence: 'low',
          totalReviews: 1,
          correctCount: result === 'correct' ? 1 : 0,
          incorrectCount: result === 'incorrect' ? 1 : 0,
          streakCount: result === 'correct' ? 1 : 0,
          lastStudied: now,
          lastResult: result,
          lastActivity: studyType as StudyActivityType,
          activityStats: {
            flashcard: { count: studyType === 'flashcard' ? 1 : 0 },
            quiz: { count: studyType === 'quiz' ? 1 : 0 },
            typing: { count: studyType === 'typing' ? 1 : 0 },
            review: { count: studyType === 'review' ? 1 : 0 }
          }
        },
        isBookmarked: false,
        createdAt: now,
        updatedAt: now
      }
      
      await docRef.set(userWord)
    } else {
      // Update existing record
      const doc = querySnapshot.docs[0]
      docRef = doc.ref
      const existingData = doc.data()
      
      const updates: any = {
        'studyStatus.studied': true,
        'studyStatus.lastStudied': now,
        'studyStatus.lastResult': result,
        'studyStatus.lastActivity': studyType,
        'studyStatus.totalReviews': (existingData.studyStatus?.totalReviews || 0) + 1,
        updatedAt: now
      }
      
      if (result === 'correct') {
        updates['studyStatus.correctCount'] = (existingData.studyStatus?.correctCount || 0) + 1
        updates['studyStatus.streakCount'] = (existingData.studyStatus?.streakCount || 0) + 1
        // Simple mastery calculation
        const currentMastery = existingData.studyStatus?.masteryLevel || 0
        updates['studyStatus.masteryLevel'] = Math.min(100, currentMastery + 10)
      } else if (result === 'incorrect') {
        updates['studyStatus.incorrectCount'] = (existingData.studyStatus?.incorrectCount || 0) + 1
        updates['studyStatus.streakCount'] = 0
        // Decrease mastery on incorrect
        const currentMastery = existingData.studyStatus?.masteryLevel || 0
        updates['studyStatus.masteryLevel'] = Math.max(0, currentMastery - 5)
      }
      
      // Update activity stats
      const activityPath = `studyStatus.activityStats.${studyType}.count`
      const currentCount = existingData.studyStatus?.activityStats?.[studyType]?.count || 0
      updates[activityPath] = currentCount + 1
      
      await docRef.update(updates)
      
      // Get updated data
      const updatedDoc = await docRef.get()
      userWord = updatedDoc.data()
    }
    
    return NextResponse.json({
      success: true,
      studyStatus: userWord?.studyStatus || null
    })
  } catch (error) {
    console.error('[study-progress] Error recording study progress:', error)
    return NextResponse.json(
      { error: 'Failed to record study progress' },
      { status: 500 }
    )
  }
}