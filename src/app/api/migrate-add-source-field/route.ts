import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 통계
    const stats = {
      total: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    }
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    stats.total = wordsSnapshot.size
    
    // 배치 처리
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      
      // 이미 source 필드가 있는 경우 스킵
      if (data.source) {
        stats.skipped++
        continue
      }
      
      // source 필드 추가
      const updateData = {
        source: {
          type: 'veterans_pdf', // 기본값: V.ZIP 3K PDF
          origin: 'vzip_3k.pdf',
          addedAt: data.createdAt || new Date(),
          uploadedBy: data.userId || 'system'
        },
        updatedAt: new Date()
      }
      
      try {
        batch.update(doc.ref, updateData)
        batchCount++
        stats.updated++
        
        if (batchCount >= batchSize) {
          await batch.commit()
          console.log(`Committed batch of ${batchCount} updates`)
          batch = db.batch()
          batchCount = 0
        }
      } catch (error) {
        console.error(`Failed to update word "${data.word}":`, error)
        stats.failed++
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${batchCount} updates`)
    }
    
    console.log('\n=== Migration Summary ===')
    console.log(`Total words: ${stats.total}`)
    console.log(`Updated: ${stats.updated}`)
    console.log(`Skipped (already has source): ${stats.skipped}`)
    console.log(`Failed: ${stats.failed}`)
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed: Added source field to words collection',
      stats
    })
    
  } catch (error) {
    console.error('Error in migration:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}