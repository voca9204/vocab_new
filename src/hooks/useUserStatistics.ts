import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface UserStatistics {
  // Home page stats
  totalWords: number
  todayWords: number
  streak: number

  // Profile page stats
  masteredWords: number
  studyDays: number
  currentStreak: number
  totalStudyTime: number
  averageAccuracy: number

  loading: boolean
  error: string | null
}

interface StudySession {
  date: Date
  wordsStudied: number
}

export function useUserStatistics() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStatistics>({
    totalWords: 0,
    todayWords: 0,
    streak: 0,
    masteredWords: 0,
    studyDays: 0,
    currentStreak: 0,
    totalStudyTime: 0,
    averageAccuracy: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!user) {
      setStats(prev => ({ ...prev, loading: false }))
      return
    }

    const fetchStatistics = async () => {
      try {
        // Fetch user_words collection for this user
        const userWordsRef = collection(db, 'user_words')
        const q = query(userWordsRef, where('userId', '==', user.uid))
        const querySnapshot = await getDocs(q)

        let totalWords = 0
        let masteredWords = 0
        let totalCorrect = 0
        let totalAttempts = 0
        const studySessions: StudySession[] = []

        // Process each word record
        querySnapshot.forEach((doc) => {
          const data = doc.data()

          // Count total learned words
          if (data.studyStatus?.studied) {
            totalWords++
          }

          // Count mastered words (80%+ mastery)
          if (data.studyStatus?.masteryLevel >= 80) {
            masteredWords++
          }

          // Calculate accuracy
          if (data.studyStatus?.correctCount && data.studyStatus?.totalReviews) {
            totalCorrect += data.studyStatus.correctCount
            totalAttempts += data.studyStatus.totalReviews
          }

          // Track study sessions by date
          if (data.lastStudiedAt) {
            const studyDate = data.lastStudiedAt.toDate ? data.lastStudiedAt.toDate() : new Date(data.lastStudiedAt)
            const dateKey = studyDate.toDateString()

            const existingSession = studySessions.find(s => s.date.toDateString() === dateKey)
            if (existingSession) {
              existingSession.wordsStudied++
            } else {
              studySessions.push({
                date: studyDate,
                wordsStudied: 1
              })
            }
          }
        })

        // Calculate today's words
        const today = new Date().toDateString()
        const todaySession = studySessions.find(s => s.date.toDateString() === today)
        const todayWords = todaySession?.wordsStudied || 0

        // Calculate streak
        const streak = calculateStreak(studySessions)

        // Calculate unique study days
        const uniqueStudyDays = studySessions.length

        // Calculate average accuracy
        const averageAccuracy = totalAttempts > 0
          ? Math.round((totalCorrect / totalAttempts) * 100)
          : 0

        // Calculate total study time (estimate based on words studied)
        // Assuming average 30 seconds per word review
        const totalStudyTimeMinutes = Math.round(totalWords * 0.5)
        const totalStudyTimeHours = Math.round(totalStudyTimeMinutes / 60)

        setStats({
          totalWords,
          todayWords,
          streak,
          masteredWords,
          studyDays: uniqueStudyDays,
          currentStreak: streak,
          totalStudyTime: totalStudyTimeHours,
          averageAccuracy,
          loading: false,
          error: null
        })

      } catch (error) {
        console.error('Error fetching user statistics:', error)
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load statistics'
        }))
      }
    }

    fetchStatistics()
  }, [user])

  return stats
}

// Helper function to calculate learning streak
function calculateStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime())

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentDate = new Date(today)

  // Check if studied today
  const studiedToday = sortedSessions.some(s => {
    const sessionDate = new Date(s.date)
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate.getTime() === today.getTime()
  })

  // If not studied today, start checking from yesterday
  if (!studiedToday) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Count consecutive days
  while (currentDate >= new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)) { // Check up to 1 year back
    const dateStr = currentDate.toDateString()
    const hasSession = sortedSessions.some(s => s.date.toDateString() === dateStr)

    if (hasSession) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}