/**
 * Robustly convert a value into a Date, regardless of how it was stored/serialized.
 *
 * Handles:
 *  - Firestore Timestamp (has .toDate())
 *  - Firestore Timestamp serialized over JSON ({ _seconds } / { seconds })
 *  - JS Date
 *  - epoch milliseconds (number)
 *  - ISO / date string
 *
 * Returns null for null/undefined/invalid input.
 *
 * Why this exists: `value?.toDate()` only guards null/undefined — it still throws
 * `toDate is not a function` when the field exists but isn't a Timestamp (e.g. a
 * Date, string, or a serialized { _seconds } object). That bug broke word loading
 * on the daily page.
 */
export function toDate(value: any): Date | null {
  if (value == null) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate()
      } catch {
        return null
      }
    }
    const seconds = value._seconds ?? value.seconds
    if (typeof seconds === 'number') return new Date(seconds * 1000)
  }
  return null
}
