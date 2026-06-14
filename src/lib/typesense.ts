import Typesense from 'typesense'
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

// Studio PC 공유 Typesense 서버 (search.jinbubooks.com). 설정은 env로 주입.
//   TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY
export const TYPESENSE_COLLECTION = process.env.TYPESENSE_COLLECTION || 'vocabulary_words'

export function isTypesenseConfigured(): boolean {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY)
}

export function getTypesenseClient() {
  const host = process.env.TYPESENSE_HOST
  const apiKey = process.env.TYPESENSE_API_KEY
  if (!host || !apiKey) {
    throw new Error('Typesense not configured: set TYPESENSE_HOST and TYPESENSE_API_KEY')
  }
  return new Typesense.Client({
    nodes: [
      {
        host,
        port: Number(process.env.TYPESENSE_PORT || 443),
        protocol: process.env.TYPESENSE_PROTOCOL || 'https',
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 5,
  })
}

// vocabulary_words 스키마: 영어 단어 + 한/영 정의 검색, 컬렉션 범위 필터(collections[])
export const VOCABULARY_WORDS_SCHEMA: CollectionCreateSchema = {
  name: TYPESENSE_COLLECTION,
  fields: [
    { name: 'word', type: 'string' },
    { name: 'koreanDefinition', type: 'string', optional: true },
    { name: 'englishDefinition', type: 'string', optional: true },
    { name: 'definition', type: 'string', optional: true },
    { name: 'partOfSpeech', type: 'string[]', optional: true, facet: true },
    { name: 'difficulty', type: 'int32', optional: true, facet: true },
    // 공식 단어장 멤버십 — 컬렉션 범위 검색 필터용
    { name: 'collections', type: 'string[]', facet: true },
  ],
}

// 검색 시 가중치 순서: 단어 > 한글정의 > 영어정의 > 통합정의
export const SEARCH_QUERY_BY = 'word,koreanDefinition,englishDefinition,definition'
