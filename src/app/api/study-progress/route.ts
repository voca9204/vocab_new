import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, getAdminAuth } from '@/lib/firebase/admin'
import type { StudyActivityType } from '@/types/vocabulary-v2'

// Spaced-repetition intervals (in days) keyed by consecutive-correct streak.
// Matches the schedule advertised in the review UI: 1 → 3 → 7 → 14 → 30 → 60 days.
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60]
const DAY_MS = 24 * 60 * 60 * 1000

const ALLOWED_STUDY_TYPES = ['quiz', 'flashcard', 'typing', 'review'] as const
const ALLOWED_RESULTS = ['correct', 'incorrect'] as const

/**
 * Authorization: Bearer <idToken> 를 검증하고 토큰의 uid가 userId와 일치하는지 확인.
 * 실패 시 에러 응답(NextResponse)을, 성공 시 null을 반환한다.
 * (이 라우트는 Admin SDK로 Firestore 규칙을 우회하므로 여기서 직접 인가를 강제해야 함)
 */
async function verifyOwner(request: NextRequest, userId: string): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7))
    if (decoded.uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

/**
 * Compute the next review date from the new consecutive-correct streak.
 * An incorrect answer (streak 0) schedules a retry in 1 day.
 */
function computeNextReviewDate(from: Date, streakCount: number): Date {
  const index = Math.min(Math.max(streakCount - 1, 0), REVIEW_INTERVALS_DAYS.length - 1)
  const days = streakCount <= 0 ? 1 : REVIEW_INTERVALS_DAYS[index]
  return new Date(from.getTime() + days * DAY_MS)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const wordIds = searchParams.get('wordIds')?.split(',')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    const authErr = await verifyOwner(request, userId)
    if (authErr) return authErr

    console.log(`[study-progress] Fetching progress for user ${userId}, words: ${wordIds?.length || 'all'}`)

    const userWordsRef = adminDb.collection('user_words')
    let query = userWordsRef.where('userId', '==', userId)

    // If specific wordIds are provided, filter by them
    if (wordIds && wordIds.length > 0) {
      // Firestore 'in' query is limited to 10 items, so we need to batch
      const batches = []
      for (let i = 0; i < wordIds.length; i += 10) {
        const batch = wordIds.slice(i, i + 10)
        batches.push(batch)
      }

      const allResults = []
      for (const batch of batches) {
        const snapshot = await userWordsRef
          .where('userId', '==', userId)
          .where('wordId', 'in', batch)
          .get()

        snapshot.docs.forEach(doc => {
          allResults.push({
            id: doc.id,
            ...doc.data()
          })
        })
      }

      return NextResponse.json({
        success: true,
        userWords: allResults
      })
    } else {
      // Get all user words
      const snapshot = await query.get()

      const userWords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return NextResponse.json({
        success: true,
        userWords
      })
    }
  } catch (error) {
    console.error('[study-progress] Error fetching study progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study progress' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a fetch request (for large word lists) or save request
    if (body.action === 'fetch') {
      // Handle fetching progress for large word lists
      const { userId, wordIds } = body

      if (!userId) {
        return NextResponse.json(
          { error: 'Missing userId parameter' },
          { status: 400 }
        )
      }

      const fetchAuthErr = await verifyOwner(request, userId)
      if (fetchAuthErr) return fetchAuthErr

      console.log(`[study-progress] POST fetch - Fetching progress for user ${userId}, words: ${wordIds?.length || 'all'}`)

      const userWordsRef = adminDb.collection('user_words')
      let query = userWordsRef.where('userId', '==', userId)

      // If specific wordIds are provided, filter by them
      if (wordIds && wordIds.length > 0) {
        // Firestore 'in' query is limited to 10 items, so we need to batch
        const batches = []
        for (let i = 0; i < wordIds.length; i += 10) {
          const batch = wordIds.slice(i, i + 10)
          batches.push(batch)
        }

        const allResults = []
        for (const batch of batches) {
          const snapshot = await userWordsRef
            .where('userId', '==', userId)
            .where('wordId', 'in', batch)
            .get()

          snapshot.docs.forEach(doc => {
            allResults.push({
              id: doc.id,
              ...doc.data()
            })
          })
        }

        return NextResponse.json({
          success: true,
          userWords: allResults
        })
      } else {
        // Get all user words
        const snapshot = await query.get()

        const userWords = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        return NextResponse.json({
          success: true,
          userWords
        })
      }
    }

    // Otherwise, handle saving progress (original POST behavior)
    const { userId, wordId, result, studyType } = body

    if (!userId || !wordId || !result || !studyType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 허용된 값만 — 동적 필드 경로 주입/스키마 오염 방지
    if (!ALLOWED_RESULTS.includes(result)) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 400 })
    }
    if (!ALLOWED_STUDY_TYPES.includes(studyType)) {
      return NextResponse.json({ error: 'Invalid studyType' }, { status: 400 })
    }

    const recordAuthErr = await verifyOwner(request, userId)
    if (recordAuthErr) return recordAuthErr

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
      const initialStreak = result === 'correct' ? 1 : 0
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
          streakCount: initialStreak,
          nextReviewDate: computeNextReviewDate(now, initialStreak),
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
        // Atomic increment avoids lost updates on near-simultaneous submissions
        'studyStatus.totalReviews': FieldValue.increment(1),
        updatedAt: now
      }

      if (result === 'correct') {
        const newStreak = (existingData.studyStatus?.streakCount || 0) + 1
        updates['studyStatus.correctCount'] = FieldValue.increment(1)
        updates['studyStatus.streakCount'] = newStreak
        // Simple mastery calculation
        const currentMastery = existingData.studyStatus?.masteryLevel || 0
        updates['studyStatus.masteryLevel'] = Math.min(100, currentMastery + 10)
        // Schedule the next review further out as the streak grows
        updates['studyStatus.nextReviewDate'] = computeNextReviewDate(now, newStreak)
      } else if (result === 'incorrect') {
        updates['studyStatus.incorrectCount'] = FieldValue.increment(1)
        updates['studyStatus.streakCount'] = 0
        // Decrease mastery on incorrect
        const currentMastery = existingData.studyStatus?.masteryLevel || 0
        updates['studyStatus.masteryLevel'] = Math.max(0, currentMastery - 5)
        // Reset the schedule: retry in 1 day
        updates['studyStatus.nextReviewDate'] = computeNextReviewDate(now, 0)
      }

      // Update activity stats (atomic increment)
      const activityPath = `studyStatus.activityStats.${studyType}.count`
      updates[activityPath] = FieldValue.increment(1)
      
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