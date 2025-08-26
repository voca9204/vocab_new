'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2, Database } from 'lucide-react'

export default function MigratePage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Debug logging
  console.log('Admin page - User:', user?.email, 'isAdmin:', isAdmin)

  // Check migration status
  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/migrate-etymology')
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError('Failed to check migration status')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Run migration
  const runMigration = async () => {
    if (!user) return
    
    setMigrating(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/migrate-etymology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        // Refresh status
        await checkStatus()
      } else {
        setError(data.message || 'Migration failed')
      }
    } catch (err) {
      setError('Failed to run migration')
      console.error(err)
    } finally {
      setMigrating(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-red-600">Admin access required</p>
        <Button onClick={() => router.push('/unified-dashboard')} className="mt-4">
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Etymology Field Migration</h1>
        <p className="text-gray-600">
          Migrate etymology/realEtymology fields to englishDefinition/etymology structure
        </p>
      </div>

      {/* Status Check */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migration Status
          </CardTitle>
          <CardDescription>
            Check current database field structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={checkStatus} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Status'
            )}
          </Button>

          {status && (
            <div className="space-y-4">
              {status.summary?.allMigrated ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All collections migrated successfully!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Migration needed</span>
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(status.status || {}).map(([collection, info]: [string, any]) => (
                  <div key={collection} className="border rounded-lg p-3">
                    <div className="font-medium mb-2">{collection}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total documents: {info.total}</div>
                      <div>With old field: {info.withOldField}</div>
                      <div>With new field: {info.withNewField}</div>
                      <div className={info.needsMigration ? 'text-orange-600' : 'text-green-600'}>
                        {info.needsMigration ? 'Needs migration' : 'Migrated'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration */}
      <Card>
        <CardHeader>
          <CardTitle>Run Migration</CardTitle>
          <CardDescription>
            This will update all documents with old field structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runMigration} 
            disabled={migrating || (status?.summary?.allMigrated)}
            variant="default"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              'Run Migration'
            )}
          </Button>

          {result && (
            <div className="mt-4 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Migration Completed!</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <div>Total documents: {result.results?.total}</div>
                  <div>Successfully migrated: {result.results?.migrated}</div>
                  <div>Already correct: {result.results?.skipped}</div>
                  <div>Failed: {result.results?.errors}</div>
                  <div>Migration rate: {result.summary?.migrationRate}</div>
                </div>
              </div>

              {result.results?.collections && (
                <div className="space-y-3">
                  <h4 className="font-medium">Collection Details:</h4>
                  {Object.entries(result.results.collections).map(([collection, info]: [string, any]) => (
                    <div key={collection} className="border rounded-lg p-3">
                      <div className="font-medium mb-2">{collection}</div>
                      <div className="text-sm space-y-1">
                        <div>Migrated: {info.migrated}</div>
                        <div>Skipped: {info.skipped}</div>
                        {info.samples?.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium">Sample migrations:</div>
                            <ul className="list-disc list-inside text-gray-600">
                              {info.samples.map((sample: string, idx: number) => (
                                <li key={idx}>{sample}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}