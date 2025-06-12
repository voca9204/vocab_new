import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VocabularyCard } from '../vocabulary/vocabulary-card'
import { Layout } from '../layout/layout'
import type { VocabularyWord } from '@/types'

// Mock vocabulary word for testing
const mockWord: VocabularyWord = {
  id: 'test-word-1',
  word: 'sophisticated',
  definition: 'Having a refined knowledge of the ways of the world cultivated especially through wide experience.',
  partOfSpeech: 'adjective',
  example: 'The sophisticated restaurant attracted discerning diners.',
  pronunciation: '/səˈfɪstɪˌkeɪtɪd/',
  difficulty: 8,
  frequency: 7,
  satLevel: true,
  synonyms: ['refined', 'cultured', 'worldly'],
  antonyms: ['naive', 'simple'],
  audioUrl: 'https://example.com/audio.mp3',
  createdAt: '2025-06-12T00:00:00Z',
  updatedAt: '2025-06-12T00:00:00Z',
  tags: ['advanced', 'adjective', 'has-examples'],
  masteryLevel: 65,
  studyCount: 5,
  correctCount: 3,
  lastStudied: '2025-06-11T00:00:00Z',
  metadata: {
    apiSource: 'FreeDictionary',
    sourceUrls: ['https://api.dictionaryapi.dev'],
    processingTime: 1250,
    fetchedAt: '2025-06-12T00:00:00Z'
  }
}
describe('Component Integration Tests', () => {
  describe('VocabularyCard Component', () => {
    it('should render vocabulary card with all information', () => {
      const onStudy = jest.fn()
      const onBookmark = jest.fn()

      render(
        <VocabularyCard 
          word={mockWord} 
          onStudy={onStudy}
          onBookmark={onBookmark}
          showProgress={true}
        />
      )

      // Check word content
      expect(screen.getByText('sophisticated')).toBeInTheDocument()
      expect(screen.getByText('adjective')).toBeInTheDocument()
      expect(screen.getByText('Level 8')).toBeInTheDocument()
      expect(screen.getByText(/Having a refined knowledge/)).toBeInTheDocument()
      expect(screen.getByText(/sophisticated restaurant/)).toBeInTheDocument()
      expect(screen.getByText('/səˈfɪstɪˌkeɪtɪd/')).toBeInTheDocument()

      // Check interactive elements
      expect(screen.getByText('Study Word')).toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('★')).toBeInTheDocument() // Bookmark button
    })

    it('should call onStudy when Study Word button is clicked', () => {
      const onStudy = jest.fn()
      const onBookmark = jest.fn()

      render(
        <VocabularyCard 
          word={mockWord} 
          onStudy={onStudy}
          onBookmark={onBookmark}
        />
      )

      fireEvent.click(screen.getByText('Study Word'))
      expect(onStudy).toHaveBeenCalledWith('test-word-1')
    })

    it('should call onBookmark when bookmark button is clicked', () => {
      const onStudy = jest.fn()
      const onBookmark = jest.fn()

      render(
        <VocabularyCard 
          word={mockWord} 
          onStudy={onStudy}
          onBookmark={onBookmark}
        />
      )

      fireEvent.click(screen.getByText('★'))
      expect(onBookmark).toHaveBeenCalledWith('test-word-1')
    })

    it('should show progress bar when showProgress is true', () => {
      render(
        <VocabularyCard 
          word={mockWord} 
          showProgress={true}
        />
      )

      expect(screen.getByText('Mastery Progress:')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('should hide progress bar when showProgress is false', () => {
      render(
        <VocabularyCard 
          word={mockWord} 
          showProgress={false}
        />
      )

      expect(screen.queryByText('Mastery Progress:')).not.toBeInTheDocument()
      expect(screen.queryByText('65%')).not.toBeInTheDocument()
    })
  })

  describe('Layout Component', () => {
    it('should render layout with header and footer', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      // Header should be present
      expect(screen.getByText('SAT Vocabulary')).toBeInTheDocument()
      expect(screen.getByText('Learn')).toBeInTheDocument()
      expect(screen.getByText('Vocabulary')).toBeInTheDocument()
      expect(screen.getByText('Quiz')).toBeInTheDocument()
      expect(screen.getByText('Progress')).toBeInTheDocument()

      // Content should be present
      expect(screen.getByText('Test Content')).toBeInTheDocument()

      // Footer should be present
      expect(screen.getByText(/Built for SAT vocabulary mastery/)).toBeInTheDocument()
      expect(screen.getByText(/© 2025 SAT Vocabulary Platform/)).toBeInTheDocument()
    })

    it('should render custom header title', () => {
      render(
        <Layout headerTitle="Custom Title">
          <div>Test Content</div>
        </Layout>
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.queryByText('SAT Vocabulary')).not.toBeInTheDocument()
    })

    it('should hide navigation when showNavigation is false', () => {
      render(
        <Layout showNavigation={false}>
          <div>Test Content</div>
        </Layout>
      )

      expect(screen.queryByText('Learn')).not.toBeInTheDocument()
      expect(screen.queryByText('Vocabulary')).not.toBeInTheDocument()
    })

    it('should hide footer when showFooter is false', () => {
      render(
        <Layout showFooter={false}>
          <div>Test Content</div>
        </Layout>
      )

      expect(screen.queryByText(/Built for SAT vocabulary mastery/)).not.toBeInTheDocument()
    })
  })
})
