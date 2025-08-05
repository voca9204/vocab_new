import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    const issues: any[] = []
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      for (const def of definitions) {
        const defText = def.definition || def.text || ''
        
        // Check for various truncation patterns
        if (
          // Ends with incomplete Korean particles
          /\s+(주|받|보|하|되|시|있|없|줄|준|않|적|것|함|알|모|나|가|오|되|이|히|게|로|은|는|을|를|의|에|와|과|도|만|까지|부터|에서|으로|라고|처럼|같이|대로|따라|위해|때문|덕분|탓|대신|뿐|조차|마저|밖에|제외|빼고|말고)$/.test(defText) ||
          // Ends with comma
          /[,，]\s*$/.test(defText) ||
          // Ends with opening parenthesis
          /\(\s*$/.test(defText) ||
          // Ends with tilde
          /~\s*$/.test(defText) ||
          // Has unclosed parenthesis
          (/\(/.test(defText) && !defText.includes(')')) ||
          // Very short definition (less than 10 chars)
          (defText.length > 0 && defText.length < 10)
        ) {
          issues.push({
            word: word,
            definition: defText,
            issue: determineIssue(defText)
          })
        }
      }
    }
    
    // Group by issue type
    const byIssue: { [key: string]: any[] } = {}
    for (const item of issues) {
      if (!byIssue[item.issue]) {
        byIssue[item.issue] = []
      }
      byIssue[item.issue].push({
        word: item.word,
        definition: item.definition
      })
    }
    
    return NextResponse.json({
      total: issues.length,
      byIssue: byIssue,
      summary: Object.entries(byIssue).map(([issue, items]) => ({
        issue,
        count: items.length,
        examples: items.slice(0, 5)
      }))
    })
    
  } catch (error) {
    console.error('Error checking remaining truncated definitions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function determineIssue(text: string): string {
  if (/\s+(주|받|보|하|되|시|있|없|줄|준|않|적|것|함|알|모|나|가|오|되|이|히|게|로|은|는|을|를|의|에|와|과|도|만|까지|부터|에서|으로|라고|처럼|같이|대로|따라|위해|때문|덕분|탓|대신|뿐|조차|마저|밖에|제외|빼고|말고)$/.test(text)) {
    return 'incomplete_particle'
  }
  if (/[,，]\s*$/.test(text)) {
    return 'ends_with_comma'
  }
  if (/\(\s*$/.test(text)) {
    return 'ends_with_opening_paren'
  }
  if (/~\s*$/.test(text)) {
    return 'ends_with_tilde'
  }
  if (/\(/.test(text) && !text.includes(')')) {
    return 'unclosed_parenthesis'
  }
  if (text.length > 0 && text.length < 10) {
    return 'too_short'
  }
  return 'unknown'
}