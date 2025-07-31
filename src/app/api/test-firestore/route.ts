import { NextRequest, NextResponse } from 'next/server'
import { FirestoreREST } from '@/lib/firebase/firestore-rest'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Firestore REST API...')
    
    const firestore = new FirestoreREST()
    
    // Try to query the words collection
    const words = await firestore.query('words', {
      limit: 5
    })
    
    return NextResponse.json({
      success: true,
      message: 'Firestore REST API test successful',
      wordCount: words.length,
      words: words.map(w => ({ word: w.word, id: w.id }))
    })
  } catch (error) {
    console.error('Firestore REST API test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Firestore REST API test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}