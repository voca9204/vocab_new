'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Upload, 
  Brain, 
  Target,
  Camera,
  Clock,
  ChevronRight,
  Star,
  Sparkles,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Globe,
  PenTool,
  Rocket,
  Shield,
  TrendingUp,
  BarChart,
  MessageSquare,
  Award
} from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  const mainFeatures = [
    {
      icon: Camera,
      title: '📸 사진으로 단어 추출',
      description: '교재나 문서를 찍으면 AI가 즉시 단어를 추출하여 학습 준비',
      detail: 'Google Vision & OpenAI 기술 적용',
      href: '/study/photo-vocab',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      icon: Brain,
      title: '🧠 AI 맞춤 학습',
      description: '망각 곡선 기반 복습 주기와 개인 맞춤형 난이도 조절',
      detail: '학습 패턴 분석 & 최적화',
      href: '/study',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      icon: Trophy,
      title: '🎯 시험별 특화 학습',
      description: 'SAT, TOEIC, TOEFL, 수능 등 시험별 맞춤 단어장',
      detail: '2000+ 핵심 단어 수록',
      href: '/study',
      gradient: 'from-amber-500 to-orange-600'
    }
  ]

  const examTypes = [
    { name: 'SAT', icon: GraduationCap, count: '2000+', level: '고급' },
    { name: 'TOEIC', icon: Globe, count: '1500+', level: '중급' },
    { name: 'TOEFL', icon: PenTool, count: '1800+', level: '고급' },
    { name: '수능', icon: Award, count: '1200+', level: '중급' }
  ]

  const benefits = [
    { icon: Zap, title: '빠른 학습', description: 'AI 최적화로 3배 빠른 암기' },
    { icon: Target, title: '목표 달성', description: '체계적인 학습 관리' },
    { icon: TrendingUp, title: '실력 향상', description: '데이터 기반 성장 추적' },
    { icon: Shield, title: '검증된 방법', description: '과학적 학습 알고리즘' }
  ]

  const testimonials = [
    { name: '김OO', exam: 'SAT', score: '1520', text: '사진 찍어서 바로 학습할 수 있어 정말 편해요!' },
    { name: '이OO', exam: 'TOEIC', score: '950', text: 'AI 복습 주기 덕분에 효율적으로 암기했어요' },
    { name: '박OO', exam: '수능', score: '1등급', text: '맞춤형 난이도 조절이 큰 도움이 됐습니다' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Gradient Background */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400 opacity-10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI 기반 스마트 학습 플랫폼</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              사진 찍고, AI로 학습하는
              <span className="block mt-2 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                혁신적인 단어 학습
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-10 text-white/90 max-w-3xl mx-auto">
              교재를 📸 찍으면 AI가 단어를 추출하고, 
              <br className="hidden sm:block" />
              망각 곡선 기반으로 최적의 복습 시기를 제안합니다
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Button 
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg"
                    onClick={() => router.push('/unified-dashboard')}
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    대시보드로 이동
                  </Button>
                  <Button 
                    size="lg"
                    className="bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold px-8 py-6 text-lg transition-all"
                    onClick={() => router.push('/study/photo-vocab')}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    사진 단어 학습
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
                    onClick={() => router.push('/login')}
                  >
                    무료로 시작하기
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 font-semibold px-8 py-6 text-lg"
                    onClick={() => router.push('/login')}
                  >
                    로그인
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Exam Types Bar */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-8">
            {examTypes.map((exam, idx) => {
              const Icon = exam.icon
              return (
                <div key={idx} className="flex items-center gap-3 group cursor-pointer">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-6 w-6 text-gray-700 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{exam.name}</p>
                    <p className="text-xs text-gray-500">{exam.count} 단어 · {exam.level}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main Features with Cards */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              왜 우리 플랫폼인가요?
            </h2>
            <p className="text-xl text-gray-600">
              기존 학습법과는 차원이 다른 효율성을 경험하세요
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {mainFeatures.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative"
                  onMouseEnter={() => setHoveredFeature(idx)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={() => router.push(user ? feature.href : '/login')}
                  >
                    <div className={`h-2 bg-gradient-to-r ${feature.gradient}`}></div>
                    <CardContent className="p-8">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-6`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {feature.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-600">
                          {feature.detail}
                        </span>
                        <ArrowRight className={`h-5 w-5 text-gray-400 transition-transform ${
                          hoveredFeature === idx ? 'translate-x-1' : ''
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                학습 효율을 극대화하는
                <span className="text-blue-600"> 스마트 기능</span>
              </h2>
              <div className="space-y-6">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 mb-1">
                          {benefit.title}
                        </h4>
                        <p className="text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
                      <BarChart className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-gray-900">학습 통계</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">오늘 학습</span>
                      <span className="font-bold text-blue-600">45 단어</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">주간 목표</span>
                      <span className="font-bold text-green-600">210/280</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              실제 사용자들의 후기
            </h2>
            <p className="text-xl text-gray-600">
              이미 수천 명이 목표를 달성했습니다
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.exam} {testimonial.score}점</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl mb-8 text-white/90">
            5분이면 충분합니다. 복잡한 가입 절차 없이 바로 시작할 수 있어요.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg"
              onClick={() => router.push(user ? '/dashboard' : '/login')}
            >
              {user ? '대시보드로 이동' : '무료로 시작하기'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>10,000+ 사용자</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>평균 200점 상승</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>4.8/5 평점</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Vocabulary Master</h3>
              <p className="text-sm">
                AI 기반 스마트 영어 단어 학습 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">기능 소개</a></li>
                <li><a href="#" className="hover:text-white transition-colors">가격 정책</a></li>
                <li><a href="#" className="hover:text-white transition-colors">사용 가이드</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">도움말</a></li>
                <li><a href="#" className="hover:text-white transition-colors">문의하기</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-white transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-white transition-colors">채용</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 Vocabulary Master. All rights reserved.</p>
            <p className="mt-2">Built with Next.js 15 + Firebase + TypeScript</p>
          </div>
        </div>
      </footer>
    </div>
  )
}