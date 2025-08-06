'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function TestDiscoveryPage() {
  const { user } = useAuth()
  const [testWord, setTestWord] = useState('erudite')
  const [discovering, setDiscovering] = useState(false)
  const [saving, setSaving] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<any>(null)
  const [saveResult, setSaveResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testDiscoveryEndpoint = async () => {
    if (!user) {
      setError('Please login first')
      return
    }

    setDiscovering(true)
    setError(null)
    setDiscoveryResult(null)

    try {
      const response = await fetch('/api/vocabulary/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: testWord,
          context: 'The professor was known for his erudite lectures',
          sourceWordId: 'test-source-id',
          userId: user.uid
        })
      })

      const data = await response.json()
      setDiscoveryResult(data)

      if (!response.ok) {
        setError(data.message || 'Discovery failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDiscovering(false)
    }
  }

  const testSaveEndpoint = async () => {
    if (!user) {
      setError('Please login first')
      return
    }

    if (!discoveryResult?.word) {
      setError('Please discover a word first')
      return
    }

    setSaving(true)
    setError(null)
    setSaveResult(null)

    try {
      const response = await fetch('/api/vocabulary/save-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: discoveryResult.word,
          userId: user.uid,
          saveToCollection: true,
          relationshipId: discoveryResult.word.relationshipId
        })
      })

      const data = await response.json()
      setSaveResult(data)

      if (!response.ok) {
        setError(data.message || 'Save failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Test Discovery Endpoints</h1>

      <div className="space-y-6">
        {/* Test Controls */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Word Discovery</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Word</label>
              <input
                type="text"
                value={testWord}
                onChange={(e) => setTestWord(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter a word to discover"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={testDiscoveryEndpoint}
                disabled={discovering || !user}
              >
                {discovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  'Test Discovery Endpoint'
                )}
              </Button>

              <Button
                onClick={testSaveEndpoint}
                disabled={saving || !discoveryResult?.word || !user}
                variant="outline"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Test Save Endpoint'
                )}
              </Button>
            </div>

            {!user && (
              <p className="text-sm text-red-600">Please login to test the endpoints</p>
            )}
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Discovery Result */}
        {discoveryResult && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Discovery Result</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
              {JSON.stringify(discoveryResult, null, 2)}
            </pre>
          </Card>
        )}

        {/* Save Result */}
        {saveResult && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Save Result</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
              {JSON.stringify(saveResult, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  )
}