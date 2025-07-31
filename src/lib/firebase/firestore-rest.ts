// Firestore REST API client for server-side operations
// This is an alternative to Firebase Admin SDK for Vercel Edge Functions

interface FirestoreDocument {
  name: string
  fields: Record<string, any>
  createTime?: string
  updateTime?: string
}

interface FirestoreValue {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  timestampValue?: string
  arrayValue?: { values: FirestoreValue[] }
  mapValue?: { fields: Record<string, FirestoreValue> }
  nullValue?: null
}

export class FirestoreREST {
  private baseUrl: string
  private projectId: string

  constructor(projectId: string = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vocabulary-app-new') {
    this.projectId = projectId
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  }

  // Convert JavaScript value to Firestore value format
  private toFirestoreValue(value: any): FirestoreValue {
    if (value === null || value === undefined) {
      return { nullValue: null }
    }
    if (typeof value === 'string') {
      return { stringValue: value }
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return { integerValue: value.toString() }
      }
      return { doubleValue: value }
    }
    if (typeof value === 'boolean') {
      return { booleanValue: value }
    }
    if (value instanceof Date) {
      return { timestampValue: value.toISOString() }
    }
    if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map(v => this.toFirestoreValue(v))
        }
      }
    }
    if (typeof value === 'object') {
      const fields: Record<string, FirestoreValue> = {}
      for (const [key, val] of Object.entries(value)) {
        fields[key] = this.toFirestoreValue(val)
      }
      return { mapValue: { fields } }
    }
    return { stringValue: String(value) }
  }

  // Convert Firestore value format to JavaScript value
  private fromFirestoreValue(value: FirestoreValue): any {
    if ('nullValue' in value) return null
    if ('stringValue' in value) return value.stringValue
    if ('integerValue' in value) return parseInt(value.integerValue!)
    if ('doubleValue' in value) return value.doubleValue
    if ('booleanValue' in value) return value.booleanValue
    if ('timestampValue' in value) return new Date(value.timestampValue!)
    if ('arrayValue' in value) {
      return value.arrayValue!.values.map(v => this.fromFirestoreValue(v))
    }
    if ('mapValue' in value) {
      const obj: Record<string, any> = {}
      for (const [key, val] of Object.entries(value.mapValue!.fields)) {
        obj[key] = this.fromFirestoreValue(val)
      }
      return obj
    }
    return null
  }

  // Convert document to JavaScript object
  private documentToObject(doc: FirestoreDocument): any {
    const obj: Record<string, any> = {}
    for (const [key, value] of Object.entries(doc.fields)) {
      obj[key] = this.fromFirestoreValue(value)
    }
    return {
      id: doc.name.split('/').pop(),
      ...obj
    }
  }

  // Query documents
  async query(
    collection: string,
    options: {
      where?: { field: string; op: string; value: any }[]
      orderBy?: { field: string; direction?: 'ASCENDING' | 'DESCENDING' }[]
      limit?: number
    } = {}
  ): Promise<any[]> {
    try {
      const structuredQuery: any = {
        from: [{ collectionId: collection }]
      }

      if (options.where && options.where.length > 0) {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: options.where.map(w => ({
              fieldFilter: {
                field: { fieldPath: w.field },
                op: w.op,
                value: this.toFirestoreValue(w.value)
              }
            }))
          }
        }
      }

      if (options.orderBy && options.orderBy.length > 0) {
        structuredQuery.orderBy = options.orderBy.map(o => ({
          field: { fieldPath: o.field },
          direction: o.direction || 'ASCENDING'
        }))
      }

      if (options.limit) {
        structuredQuery.limit = options.limit
      }

      const response = await fetch(`${this.baseUrl}:runQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ structuredQuery })
      })

      if (!response.ok) {
        throw new Error(`Firestore query failed: ${response.statusText}`)
      }

      const data = await response.text()
      const lines = data.trim().split('\n').filter(line => line)
      const documents = lines.map(line => {
        const result = JSON.parse(line)
        if (result.document) {
          return this.documentToObject(result.document)
        }
        return null
      }).filter(Boolean)

      return documents
    } catch (error) {
      console.error('Firestore REST query error:', error)
      throw error
    }
  }

  // Update document
  async updateDocument(
    collection: string,
    documentId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const fields: Record<string, FirestoreValue> = {}
      for (const [key, value] of Object.entries(updates)) {
        fields[key] = this.toFirestoreValue(value)
      }

      // Add updatedAt timestamp
      fields.updatedAt = this.toFirestoreValue(new Date())

      const updateMask = Object.keys(fields).join(',')

      const response = await fetch(
        `${this.baseUrl}/${collection}/${documentId}?updateMask.fieldPaths=${updateMask}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields })
        }
      )

      if (!response.ok) {
        throw new Error(`Firestore update failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Firestore REST update error:', error)
      throw error
    }
  }
}