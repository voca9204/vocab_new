import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

interface SaveToPersonalRequest {
  userId: string
  wordId: string
  word: string  // For quick reference
  collectionName?: string  // "나만의 단어장", "어려운 단어" 등
  tags?: string[]
  notes?: string
  source?: {
    type: 'manual' | 'ai_discovery' | 'bookmark'
    context?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveToPersonalRequest = await request.json()
    const { userId, wordId, word, collectionName = '나만의 단어장', tags = [], notes, source } = body

    if (!userId || !wordId || !word) {
      return NextResponse.json({ 
        success: false,
        error: 'userId, wordId, and word are required' 
      }, { status: 400 })
    }

    const db = getAdminFirestore()
    
    // Check if already in personal vocabulary
    const existingEntry = await db.collection('personal_vocabulary')
      .where('userId', '==', userId)
      .where('wordId', '==', wordId)
      .where('collectionName', '==', collectionName)
      .limit(1)
      .get()
    
    if (!existingEntry.empty) {
      return NextResponse.json({
        success: false,
        message: '이미 개인 단어장에 추가된 단어입니다.'
      }, { status: 409 })
    }
    
    // Add to personal vocabulary
    const now = new Date()
    const personalEntry = {
      userId,
      wordId,
      word: word.toLowerCase(),
      collectionName,
      tags,
      notes: notes || '',
      source: source || { type: 'manual' },
      addedAt: now,
      updatedAt: now
    }
    
    const docRef = await db.collection('personal_vocabulary').add(personalEntry)
    
    console.log(`Word "${word}" added to personal vocabulary for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      personalEntryId: docRef.id,
      message: '개인 단어장에 추가되었습니다.'
    })
    
  } catch (error) {
    console.error('Error saving to personal vocabulary:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to save to personal vocabulary',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}