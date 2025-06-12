import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '../button'
import { Input } from '../input'
import { LoadingSpinner } from '../loading-spinner'
import { ProgressBar } from '../progress-bar'

describe('UI Components', () => {
  describe('Button', () => {
    it('renders with default variant', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button')).toHaveTextContent('Click me')
    })

    it('renders with different variants', () => {
      render(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-destructive')
    })
  })

  describe('Input', () => {
    it('renders input field', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })
  })

  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      render(<LoadingSpinner />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders with different sizes', () => {
      const { container } = render(<LoadingSpinner size="lg" />)
      expect(container.firstChild).toHaveClass('h-12', 'w-12')
    })
  })

  describe('ProgressBar', () => {
    it('renders with correct progress value', () => {
      render(<ProgressBar value={75} showLabel />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('clamps values between 0 and 100', () => {
      const { container } = render(<ProgressBar value={150} />)
      const progressFill = container.querySelector('.h-full')
      expect(progressFill).toHaveStyle('width: 100%')
    })
  })
})
