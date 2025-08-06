'use client'

import { useEffect } from 'react'
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
  ChevronRight
} from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const features = [
    {
      icon: Upload,
      title: 'PDF 단어장 업로드',
      description: 'PDF 형식의 단어장을 업로드하여 학습할 수 있습니다',
      href: '/pdf-extract',
      color: 'bg-blue-500'
    },
    {
      icon: BookOpen,
      title: '단어 학습',
      description: '플래시카드, 리스트 등 다양한 방식으로 학습',
      href: '/study',
      color: 'bg-green-500'
    },
    {
      icon: Brain,
      title: '퀴즈 모드',
      description: '학습한 단어들을 퀴즈로 복습',
      href: '/study/quiz',
      color: 'bg-purple-500'
    },
    {
      icon: Camera,
      title: '사진 단어 학습',
      description: '사진에서 단어를 추출하여 학습',
      href: '/study/photo-vocab',
      color: 'bg-orange-500'
    }
  ]

  const stats = [
    { label: '전체 단어', value: '1800+', icon: BookOpen },
    { label: '일일 목표', value: '30개', icon: Target },
    { label: '평균 학습 시간', value: '15분', icon: Clock },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            SAT Vocabulary Master
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            효율적인 단어 학습으로 SAT 고득점을 달성하세요.
            PDF 단어장을 업로드하고 체계적으로 학습할 수 있습니다.
          </p>
          
          {user ? (
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => router.push('/study')}
              >
                학습 시작하기
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => router.push('/pdf-extract')}
              >
                단어장 업로드
              </Button>
            </div>
          ) : (
            <Button 
              size="lg"
              onClick={() => router.push('/login')}
            >
              로그인하여 시작하기
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white border-y">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="text-center">
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            주요 기능
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={idx}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    feature.disabled ? 'opacity-60' : ''
                  }`}
                  onClick={() => !feature.disabled && router.push(feature.href)}
                >
                  <CardHeader>
                    <div className={`p-3 rounded-lg ${feature.color} text-white w-fit mb-2`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">
                      {feature.title}
                      {feature.disabled && (
                        <span className="text-xs ml-2 text-gray-500">(준비중)</span>
                      )}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 px-4 bg-blue-600 text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              지금 시작하세요
            </h2>
            <p className="text-xl mb-8 opacity-90">
              무료로 가입하고 효율적인 SAT 단어 학습을 경험해보세요
            </p>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => router.push('/login')}
            >
              무료 가입하기
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-800 text-gray-400">
        <div className="container mx-auto text-center">
          <p>© 2025 SAT Vocabulary Master. All rights reserved.</p>
          <p className="text-sm mt-2">Built with Next.js + Firebase + TypeScript</p>
        </div>
      </footer>
    </div>
  )
}