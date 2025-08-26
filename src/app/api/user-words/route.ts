import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    console.log(`[user-words API] Fetching user words for: ${userId}`)
    
    // Get all user words for this user
    const userWordsRef = adminDb.collection('user_words')
    const querySnapshot = await userWordsRef
      .where('userId', '==', userId)
      .get()
    
    const userWords = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log(`[user-words API] Found ${userWords.length} user word records`)
    
    return NextResponse.json({
      success: true,
      userWords
    })
  } catch (error) {
    console.error('[user-words API] Error fetching user words:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user words' },
      { status: 500 }
    )
  }
}