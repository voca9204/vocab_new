import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// 짧은 정의를 보강하는 매핑
const shortDefinitionEnhancements: { [key: string]: string } = {
  // 단일 형용사
  '굼뜬': '굼뜬, 활동하지 않는, 불활성의',
  '객관적인': '객관적인, 공정한, 편견 없는',
  '참을 수 없는': '참을 수 없는, 견딜 수 없는',
  '번성하는': '번성하는, 성공적인, 부유한',
  '까다로운': '까다로운, 엄격한, 정확한',
  '유창한': '유창한, 능숙한, 거침없는',
  '솔직한': '솔직한, 숨김없는, 진실한',
  '완벽한': '완벽한, 결점 없는, 이상적인',
  '어리석은': '어리석은, 우둔한, 바보 같은',
  '연약한': '연약한, 부서지기 쉬운, 섬세한',
  '충분한': '충분한, 넉넉한, 풍부한',
  '사소한': '사소한, 하찮은, 중요하지 않은',
  '비열한': '비열한, 야비한, 불명예스러운',
  '불길한': '불길한, 불행을 예고하는, 으스스한',
  '근거없는': '근거없는, 이유 없는, 정당하지 않은',
  '급한': '급한, 긴급한, 절박한',
  '무관심한': '무관심한, 냉담한, 관심 없는',
  '허약한': '허약한, 병약한, 연약한',
  '엄숙한': '엄숙한, 진지한, 장엄한',
  '미숙한': '미숙한, 경험이 부족한, 익지 않은',
  
  // 단일 명사
  '부족': '부족, 결핍, 모자람',
  '어원': '어원, 단어의 기원과 역사',
  '개혁': '개혁, 개선, 변혁',
  '격려': '격려, 용기를 북돋음, 지원',
  '패배': '패배, 좌절, 실패',
  '직업': '직업, 생업, 전문 분야',
  '운': '운, 행운, 운명',
  '우화': '우화, 교훈적인 이야기, 비유',
  '안식처': '안식처, 피난처, 은신처',
  '대변인': '대변인, 옹호자, 지지자',
  '배반자': '배반자, 반역자, 신의를 저버린 사람',
  '전문가': '전문가, 숙련자, 대가',
  '비유': '비유, 은유, 상징',
  '표어': '표어, 구호, 슬로건',
  '특권': '특권, 특별한 권리, 혜택',
  
  // 단일 동사
  '무시하다': '무시하다, 소홀히 하다, 등한시하다',
  '모으다': '모으다, 수집하다, 축적하다',
  '추측하다': '추측하다, 짐작하다, 가정하다',
  '흡수하다': '흡수하다, 받아들이다, 이해하다',
  '배척하다': '배척하다, 거부하다, 추방하다',
  '속이다': '속이다, 기만하다, 사기치다',
  '즐겁게하다': '즐겁게하다, 기쁘게 하다, 유쾌하게 하다',
  '방해하다': '방해하다, 막다, 저지하다',
  '증명하다': '증명하다, 입증하다, 확인하다',
  '포기하다': '포기하다, 단념하다, 버리다',
  '타협하다': '타협하다, 양보하다, 중재하다',
  '약화시키다': '약화시키다, 쇠퇴시키다, 손상시키다',
  '경멸하다': '경멸하다, 업신여기다, 무시하다',
  '회복하다': '회복하다, 되찾다, 복구하다',
  '예상하다': '예상하다, 기대하다, 예측하다',
}

export async function POST(request: NextRequest) {
  try {
    const { limit = 100 } = await request.json()
    const db = getAdminFirestore()
    
    let fixedCount = 0
    const fixedWords: any[] = []
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    // 배치 처리
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      if (fixedCount >= limit) break
      
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        const defText = def.definition || def.text || ''
        
        // 짧은 정의 (15자 미만)이고 보강 가능한 경우
        if (defText.length < 15 && defText.length > 0) {
          // 직접 매칭
          if (shortDefinitionEnhancements[defText]) {
            hasChanges = true
            return {
              ...def,
              definition: shortDefinitionEnhancements[defText],
              text: shortDefinitionEnhancements[defText]
            }
          }
          
          // 패턴 기반 보강
          let enhancedText = defText
          
          // 형용사 패턴 (~한, ~는, ~인)
          if (/^[가-힣]+(한|는|인)$/.test(defText) && defText.length < 8) {
            const synonyms = getSynonyms(defText)
            if (synonyms) {
              enhancedText = `${defText}, ${synonyms}`
              hasChanges = true
            }
          }
          
          // 명사 패턴 (단일 명사)
          else if (/^[가-힣]+$/.test(defText) && defText.length < 5) {
            const explanation = getExplanation(defText)
            if (explanation) {
              enhancedText = `${defText}, ${explanation}`
              hasChanges = true
            }
          }
          
          // 동사 패턴 (~하다, ~되다, ~이다)
          else if (/^[가-힣]+(하다|되다|이다)$/.test(defText) && defText.length < 10) {
            const synonyms = getSynonyms(defText)
            if (synonyms) {
              enhancedText = `${defText}, ${synonyms}`
              hasChanges = true
            }
          }
          
          if (enhancedText !== defText) {
            return {
              ...def,
              definition: enhancedText,
              text: enhancedText
            }
          }
        }
        
        return def
      })
      
      if (hasChanges) {
        try {
          batch.update(doc.ref, {
            definitions: updatedDefinitions,
            updatedAt: new Date()
          })
          batchCount++
          fixedCount++
          
          fixedWords.push({
            word,
            oldDefinitions: definitions.map((d: any) => d.definition || d.text),
            newDefinitions: updatedDefinitions.map((d: any) => d.definition || d.text)
          })
          
          if (batchCount >= batchSize) {
            await batch.commit()
            batch = db.batch()
            batchCount = 0
          }
        } catch (error) {
          console.error(`Failed to update word "${word}":`, error)
        }
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
    }
    
    return NextResponse.json({
      success: true,
      message: `Enhanced ${fixedCount} short definitions`,
      fixedCount,
      sampleFixes: fixedWords.slice(0, 30)
    })
    
  } catch (error) {
    console.error('Error enhancing short definitions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 간단한 유의어 제공 함수
function getSynonyms(word: string): string | null {
  const synonymMap: { [key: string]: string } = {
    '굼뜬': '느린, 활동적이지 않은',
    '솔직한': '정직한, 거짓 없는',
    '연약한': '약한, 부서지기 쉬운',
    '어리석은': '미련한, 분별없는',
    '충분한': '넉넉한, 만족스러운',
    '무시하다': '소홀히 하다, 돌보지 않다',
    '모으다': '수집하다, 한데 합치다',
    '속이다': '거짓말하다, 현혹시키다',
  }
  return synonymMap[word] || null
}

// 간단한 설명 제공 함수
function getExplanation(word: string): string | null {
  const explanationMap: { [key: string]: string } = {
    '부족': '필요한 것이 모자라는 상태',
    '개혁': '제도나 체제를 고쳐 새롭게 함',
    '격려': '용기와 힘을 북돋아 줌',
    '패배': '싸움이나 경쟁에서 짐',
    '직업': '생계를 위해 하는 일',
    '운': '인간의 힘으로 어쩔 수 없는 운명',
  }
  return explanationMap[word] || null
}