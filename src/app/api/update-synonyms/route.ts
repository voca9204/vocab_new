import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

interface UpdateSynonymsRequest {
  userId: string
  wordId: string
  synonyms: string[]
  collection: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId, wordId, synonyms, collection } = await request.json() as UpdateSynonymsRequest
    
    if (!userId || !wordId || !collection) {
      return NextResponse.json(
        { success: false, message: 'userId, wordId, and collection are required' },
        { status: 400 }
      )
    }

    console.log(`[update-synonyms] Updating synonyms for ${wordId} in ${collection}`)
    console.log(`[update-synonyms] Synonyms to save:`, synonyms, `Count:`, synonyms?.length)

    const db = getAdminFirestore()
    
    // Update based on collection type
    if (collection === 'photo_vocabulary_words') {
      // Photo vocabulary words store synonyms directly
      await db.collection('photo_vocabulary_words').doc(wordId).update({
        synonyms: synonyms || [],
        updatedAt: new Date()
      })
    } else if (collection === 'personal_collection_words') {
      // Personal collection words store synonyms directly
      await db.collection('personal_collection_words').doc(wordId).update({
        synonyms: synonyms || [],
        updatedAt: new Date()
      })
    } else if (collection === 'words') {
      // Regular words need to update the definitions array
      const wordDoc = await db.collection('words').doc(wordId).get()
      if (wordDoc.exists) {
        await db.collection('words').doc(wordId).update({
          synonyms: synonyms || [],
          updatedAt: new Date()
        })
      }
    } else if (collection === 'ai_generated_words') {
      // AI generated words
      await db.collection('ai_generated_words').doc(wordId).update({
        synonyms: synonyms || [],
        updatedAt: new Date()
      })
    } else {
      return NextResponse.json(
        { success: false, message: `Unknown collection: ${collection}` },
        { status: 400 }
      )
    }
    
    console.log(`[update-synonyms] Successfully updated synonyms for ${wordId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Synonyms updated successfully'
    })
  } catch (error) {
    console.error('[update-synonyms] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update synonyms'
      },
      { status: 500 }
    )
  }
}