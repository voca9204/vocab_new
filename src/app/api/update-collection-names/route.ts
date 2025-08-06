import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 이름 매핑
    const nameMapping = {
      'V.ZIP 3K 단어장': 'SAT 단어장',
      'SAT 어휘 컬렉션': '수능 단어장',
      '일반 공식 단어장': '수능 단어장'
    }
    
    // vocabulary_collections 업데이트
    const collectionsSnapshot = await db
      .collection('vocabulary_collections')
      .get()
    
    let updatedCount = 0
    const batch = db.batch()
    
    for (const doc of collectionsSnapshot.docs) {
      const data = doc.data()
      const oldName = data.name || data.displayName
      
      if (nameMapping[oldName]) {
        batch.update(doc.ref, {
          name: nameMapping[oldName],
          displayName: nameMapping[oldName],
          updatedAt: new Date()
        })
        updatedCount++
        console.log(`Updating ${oldName} → ${nameMapping[oldName]}`)
      }
    }
    
    // user_settings에서 selectedVocabularies 업데이트
    const userSettingsSnapshot = await db
      .collection('user_settings')
      .get()
    
    for (const doc of userSettingsSnapshot.docs) {
      const data = doc.data()
      const selectedVocabularies = data.selectedVocabularies || []
      
      const updatedVocabularies = selectedVocabularies.map((vocab: string) => 
        nameMapping[vocab] || vocab
      )
      
      if (JSON.stringify(selectedVocabularies) !== JSON.stringify(updatedVocabularies)) {
        batch.update(doc.ref, {
          selectedVocabularies: updatedVocabularies,
          updatedAt: new Date()
        })
        console.log(`Updating user ${doc.id} vocabularies`)
      }
    }
    
    await batch.commit()
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} collection names`,
      mapping: nameMapping
    })
    
  } catch (error) {
    console.error('Collection name update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}