import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// Common Korean particles and their likely completions
const particleCompletions: { [key: string]: string } = {
  '주': '주다',
  '받': '받다',
  '보': '보다',
  '하': '하다',
  '되': '되다',
  '시': '시키다',
  '있': '있다',
  '없': '없다',
  '줄': '주다',
  '준': '준다',
  '않': '않다',
  '적': '적이다',
  '것': '것이다',
  '함': '함',
  '알': '알다',
  '모': '모르다',
  '나': '나다',
  '가': '가다',
  '오': '오다',
  '이': '이다',
  '히': '히',
  '게': '게 하다',
  '로': '로',
  '은': '은',
  '는': '는',
  '을': '을',
  '를': '를',
  '의': '의',
  '에': '에',
  '와': '와',
  '과': '과',
  '도': '도',
  '만': '만',
  '까지': '까지',
  '부터': '부터',
  '에서': '에서',
  '으로': '으로',
  '라고': '라고 하다',
  '처럼': '처럼',
  '같이': '같이',
  '대로': '대로',
  '따라': '따라',
  '위해': '위해',
  '때문': '때문에',
  '덕분': '덕분에',
  '탓': '탓에',
  '대신': '대신',
  '뿐': '뿐이다',
  '조차': '조차',
  '마저': '마저',
  '밖에': '밖에',
  '제외': '제외하고',
  '빼고': '빼고',
  '말고': '말고'
}

// Known specific fixes for common truncations
const specificFixes: { [key: string]: string } = {
  '지지하다, 옹호하다, (~를 하자고) 주': '지지하다, 옹호하다, (~를 하자고) 주장하다',
  '[군복과 무기 이외의] 장비, 장구, 마': '[군복과 무기 이외의] 장비, 장구, 마구류; 부속품, 액세서리',
  '깊고 차분하게 한 생각 (중요하지 않': '깊고 차분하게 한 생각 (중요하지 않을 수도 있는); 명상, 묵상',
  '~에게 ~을 내세우다, 받아들이게 하': '~에게 ~을 내세우다, 받아들이게 하다; 부과하다, 강요하다',
  '저지르다': '(범죄, 악행 등을) 저지르다, 범하다',
  '끝나다': '끝나다, 종료되다, 마치다',
  '시작하다': '시작하다, 개시하다, 착수하다',
  '만들다': '만들다, 제작하다, 창조하다',
  '생각하다': '생각하다, 사고하다, 숙고하다',
  '보다': '보다, 바라보다, 관찰하다',
  '하다': '하다, 행하다, 실행하다',
  '되다': '되다, 변하다, 이루어지다',
  '주다': '주다, 제공하다, 수여하다',
  '받다': '받다, 수령하다, 획득하다',
  '알다': '알다, 이해하다, 인지하다'
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    let fixedCount = 0
    const fixedWords: any[] = []
    
    // Get all words
    const wordsSnapshot = await db.collection('words').get()
    
    // Process in batches
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        const defText = def.definition || def.text || ''
        
        // Check if we have a specific fix for this exact text
        if (specificFixes[defText]) {
          hasChanges = true
          return {
            ...def,
            definition: specificFixes[defText],
            text: specificFixes[defText]
          }
        }
        
        let fixedText = defText
        
        // Fix incomplete particles at the end
        const particleMatch = defText.match(/\s+(주|받|보|하|되|시|있|없|줄|준|않|적|것|함|알|모|나|가|오|되|이|히|게|로|은|는|을|를|의|에|와|과|도|만|까지|부터|에서|으로|라고|처럼|같이|대로|따라|위해|때문|덕분|탓|대신|뿐|조차|마저|밖에|제외|빼고|말고)$/)
        if (particleMatch) {
          const particle = particleMatch[1]
          const completion = particleCompletions[particle]
          if (completion) {
            fixedText = defText.replace(new RegExp(`\\s+${particle}$`), ` ${completion}`)
            hasChanges = true
          }
        }
        
        // Fix trailing commas
        if (/[,，]\s*$/.test(fixedText)) {
          fixedText = fixedText.replace(/[,，]\s*$/, '')
          hasChanges = true
        }
        
        // Fix trailing tildes
        if (/~\s*$/.test(fixedText)) {
          fixedText = fixedText.replace(/~\s*$/, '')
          hasChanges = true
        }
        
        // Fix unclosed parentheses
        const openCount = (fixedText.match(/\(/g) || []).length
        const closeCount = (fixedText.match(/\)/g) || []).length
        if (openCount > closeCount) {
          // Add closing parenthesis
          if (/[가-힣]$/.test(fixedText)) {
            fixedText = fixedText + ')'
            hasChanges = true
          } else if (/[a-zA-Z,;]$/.test(fixedText)) {
            fixedText = fixedText + '...)'
            hasChanges = true
          } else if (/\s+$/.test(fixedText)) {
            fixedText = fixedText.trim() + ')'
            hasChanges = true
          }
        }
        
        // Fix very short definitions
        if (fixedText.length > 0 && fixedText.length < 10 && !hasChanges) {
          // Only fix if it's a single word that looks incomplete
          if (/^[가-힣]+다?$/.test(fixedText) && !fixedText.endsWith('다')) {
            // Add basic verb ending if missing
            fixedText = fixedText + '다'
            hasChanges = true
          }
        }
        
        if (fixedText !== defText) {
          return {
            ...def,
            definition: fixedText,
            text: fixedText
          }
        }
        
        return def
      })
      
      if (hasChanges) {
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
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit()
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} words with truncated definitions`,
      fixedCount,
      fixedWords: fixedWords.slice(0, 50), // Return first 50 for review
      totalFixed: fixedWords.length
    })
    
  } catch (error) {
    console.error('Error fixing all truncated definitions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}