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
    
    // veterans_vocabulary 컬렉션에서 검색
    const veteransSnapshot = await db.collection('veterans_vocabulary')
      .where('word', '==', word)
      .get()
    
    if (!veteransSnapshot.empty) {
      const wordData = veteransSnapshot.docs[0].data()
      console.log(`Found word "${word}" in veterans_vocabulary collection:`)
      console.log(JSON.stringify(wordData, null, 2))
      
      return NextResponse.json({
        collection: 'veterans_vocabulary',
        id: veteransSnapshot.docs[0].id,
        data: wordData
      })
    }
    
    // vocabulary 컬렉션에서 검색
    const vocabularySnapshot = await db.collection('vocabulary')
      .where('word', '==', word)
      .get()
    
    if (!vocabularySnapshot.empty) {
      const wordData = vocabularySnapshot.docs[0].data()
      console.log(`Found word "${word}" in vocabulary collection:`)
      console.log(JSON.stringify(wordData, null, 2))
      
      return NextResponse.json({
        collection: 'vocabulary',
        id: vocabularySnapshot.docs[0].id,
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