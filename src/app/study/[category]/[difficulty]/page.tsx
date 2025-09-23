import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OfficialCategory, DifficultyLevel } from '@/types/collections-simplified'
import StudyPageClient from './client'

// 정적 생성을 위한 params 생성
export async function generateStaticParams() {
  const categories: OfficialCategory[] = ['SAT', 'TOEFL', 'TOEIC', '수능', 'GRE', 'IELTS', '기본', '학원']
  const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced']

  const params = []
  for (const category of categories) {
    for (const difficulty of difficulties) {
      params.push({
        category: category.toLowerCase(),
        difficulty: difficulty
      })
    }
  }

  return params
}

// 메타데이터 생성
export async function generateMetadata({
  params
}: {
  params: { category: string; difficulty: string }
}): Promise<Metadata> {
  const category = params.category.toUpperCase() as OfficialCategory
  const difficulty = params.difficulty as DifficultyLevel

  const titles: Record<DifficultyLevel, string> = {
    beginner: '초급',
    intermediate: '중급',
    advanced: '고급'
  }

  return {
    title: `${category} ${titles[difficulty]} 단어 학습 | Vocabulary Master`,
    description: `${category} 시험 대비 ${titles[difficulty]} 레벨 영어 단어 학습. AI 기반 맞춤 복습 시스템.`,
  }
}

// 유효한 카테고리와 난이도 확인
function isValidParams(category: string, difficulty: string): boolean {
  const validCategories = ['sat', 'toefl', 'toeic', '수능', 'gre', 'ielts', '기본', '학원']
  const validDifficulties = ['beginner', 'intermediate', 'advanced']

  return validCategories.includes(category.toLowerCase()) &&
         validDifficulties.includes(difficulty.toLowerCase())
}

export default function StudyPage({
  params
}: {
  params: { category: string; difficulty: string }
}) {
  // 유효성 검사
  if (!isValidParams(params.category, params.difficulty)) {
    notFound()
  }

  const category = params.category.toUpperCase() as OfficialCategory
  const difficulty = params.difficulty as DifficultyLevel

  return <StudyPageClient category={category} difficulty={difficulty} />
}