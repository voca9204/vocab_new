import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // words 컬렉션에서 source.type별로 단어들 찾기
    const veteransWordsSnapshot = await db
      .collection('words')
      .where('source.type', '==', 'veterans_pdf')
      .get()
    
    const pdfWordsSnapshot = await db
      .collection('words')
      .where('source.type', '==', 'pdf')
      .get()
    
    console.log(`Found ${veteransWordsSnapshot.size} SAT words (veterans_pdf)`)
    console.log(`Found ${pdfWordsSnapshot.size} 수능 words (pdf)`)
    
    const satWordIds = veteransWordsSnapshot.docs.map(doc => doc.id)
    const suneungWordIds = pdfWordsSnapshot.docs.map(doc => doc.id)
    
    // 1. SAT 단어장 컬렉션 생성 또는 업데이트
    const satCollection = {
      name: 'SAT 단어장',
      displayName: 'SAT 단어장',
      description: 'V.ZIP 3K PDF에서 추출한 SAT 시험 대비 단어',
      words: satWordIds,
      isPrivate: false,
      userId: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 2. 수능 단어장 컬렉션 생성 또는 업데이트
    const suneungCollection = {
      name: '수능 단어장',
      displayName: '수능 단어장',
      description: '25년 수능 영단어 모음 PDF에서 추출한 단어',
      words: suneungWordIds,
      isPrivate: false,
      userId: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const results = {
      sat: { created: false, updated: false, wordCount: 0 },
      suneung: { created: false, updated: false, wordCount: 0 }
    }
    
    // SAT 단어장 처리
    const existingSatSnapshot = await db
      .collection('vocabulary_collections')
      .where('name', '==', 'SAT 단어장')
      .limit(1)
      .get()
    
    if (!existingSatSnapshot.empty) {
      const docRef = existingSatSnapshot.docs[0].ref
      await docRef.update({
        words: satWordIds,
        updatedAt: new Date()
      })
      results.sat.updated = true
    } else {
      await db.collection('vocabulary_collections').add(satCollection)
      results.sat.created = true
    }
    results.sat.wordCount = satWordIds.length
    
    // 수능 단어장 처리
    const existingSuneungSnapshot = await db
      .collection('vocabulary_collections')
      .where('name', '==', '수능 단어장')
      .limit(1)
      .get()
    
    if (!existingSuneungSnapshot.empty) {
      const docRef = existingSuneungSnapshot.docs[0].ref
      await docRef.update({
        words: suneungWordIds,
        updatedAt: new Date()
      })
      results.suneung.updated = true
    } else {
      await db.collection('vocabulary_collections').add(suneungCollection)
      results.suneung.created = true
    }
    results.suneung.wordCount = suneungWordIds.length
    
    return NextResponse.json({
      success: true,
      message: '단어장 컬렉션이 처리되었습니다',
      results
    })
    
  } catch (error) {
    console.error('Error creating SAT collection:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}