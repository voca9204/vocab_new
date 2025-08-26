/**
 * 업로드 프로세스 디버그 테스트
 * 단어장이 보이지 않는 문제 디버깅
 */

const fs = require('fs')
const FormData = require('form-data')

async function testUploadFlow() {
  console.log('🧪 단어장 업로드 플로우 테스트 시작...')
  
  // 1. 테스트용 간단한 PDF 텍스트 파일 생성 (PDF 대신 TXT로 테스트)
  const testContent = `
abandon - to give up completely
abundant - existing in large quantities
accurate - correct in all details
adequate - satisfactory or acceptable
advocate - to support or recommend publicly
analyze - to examine in detail
approach - a way of dealing with something
assess - to evaluate or estimate
assume - to suppose to be true
benefit - an advantage or profit
concept - an abstract idea
consequence - a result or effect
constitute - to form or compose
context - the circumstances that form the setting
contrast - to compare in order to show differences
  `
  
  fs.writeFileSync('/tmp/test-vocabulary.txt', testContent.trim())
  
  try {
    console.log('📤 1. PDF 추출 API 테스트...')
    
    // FormData로 파일 업로드 시뮬레이션
    const form = new FormData()
    form.append('file', fs.createReadStream('/tmp/test-vocabulary.txt'))
    
    const extractResponse = await fetch('http://localhost:3100/api/extract-words-working', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    console.log(`추출 API 응답 상태: ${extractResponse.status}`)
    
    const extractData = await extractResponse.json()
    console.log('추출 결과:', JSON.stringify(extractData, null, 2))
    
    if (!extractData.success) {
      console.error('❌ 추출 실패:', extractData.error)
      return
    }
    
    console.log(`✅ ${extractData.words?.length || 0}개 단어 추출 성공`)
    
    // 2. 개인 컬렉션 생성 API 테스트 (임시로 빈 토큰으로 테스트 - 실제로는 실패할 것)
    console.log('📤 2. 개인 컬렉션 생성 API 테스트...')
    
    const collectionData = {
      name: '테스트 단어장',
      description: '디버그용 테스트 단어장',
      isPrivate: true,
      tags: ['테스트'],
      words: extractData.words || []
    }
    
    console.log('생성할 컬렉션 데이터:', JSON.stringify({
      ...collectionData,
      words: `[${collectionData.words.length}개 단어]`
    }, null, 2))
    
    // 실제 API 호출은 인증 토큰이 필요하므로 여기서는 구조만 확인
    console.log('⚠️ 실제 컬렉션 생성은 인증이 필요하므로 구조만 확인됨')
    
    console.log('✅ 업로드 플로우 구조 검증 완료')
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
  } finally {
    // 임시 파일 정리
    if (fs.existsSync('/tmp/test-vocabulary.txt')) {
      fs.unlinkSync('/tmp/test-vocabulary.txt')
    }
  }
}

// node-fetch 폴리필 (Node.js 18 미만인 경우)
if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testUploadFlow().catch(console.error)