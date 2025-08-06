import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const word = searchParams.get('word')
    
    if (!word) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 })
    }
    
    const db = getAdminFirestore()
    
    // words 컬렉션에서 검색
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', word)
      .get()
    
    if (!wordsSnapshot.empty) {
      const wordData = wordsSnapshot.docs[0].data()
      console.log(`Found word "${word}" in words collection:`)
      console.log(JSON.stringify(wordData, null, 2))
      
      return NextResponse.json({
        collection: 'words',
        id: wordsSnapshot.docs[0].id,
        data: wordData
      })
    }
    
    // ai_generated_words 컬렉션에서 검색
    const aiGeneratedSnapshot = await db.collection('ai_generated_words')
      .where('word', '==', word)
      .get()
    
    if (!aiGeneratedSnapshot.empty) {
      const wordData = aiGeneratedSnapshot.docs[0].data()
      console.log(`Found word "${word}" in ai_generated_words collection:`)
      console.log(JSON.stringify(wordData, null, 2))
      
      return NextResponse.json({
        collection: 'ai_generated_words',
        id: aiGeneratedSnapshot.docs[0].id,
        data: wordData
      })
    }
    
    // photo_vocabulary_words 컬렉션에서 검색
    const photoVocabSnapshot = await db.collection('photo_vocabulary_words')
      .where('word', '==', word)
      .get()
    
    if (!photoVocabSnapshot.empty) {
      const wordData = photoVocabSnapshot.docs[0].data()
      console.log(`Found word "${word}" in photo_vocabulary_words collection:`)
      console.log(JSON.stringify(wordData, null, 2))
      
      return NextResponse.json({
        collection: 'photo_vocabulary_words',
        id: photoVocabSnapshot.docs[0].id,
        data: wordData
      })
    }
    
    return NextResponse.json({ 
      message: `Word "${word}" not found in any collection` 
    }, { status: 404 })
    
  } catch (error) {
    console.error('Error checking word:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}