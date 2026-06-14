/**
 * Safely get collection name, handling both string and object formats
 * Some legacy collections have name as {korean: string, english: string}
 */
export function getCollectionName(name: string | { korean?: string; english?: string } | any): string {
  // Handle undefined, null, or empty values
  if (!name) {
    return 'Unknown'
  }

  if (typeof name === 'string') {
    return name
  }

  if (typeof name === 'object' && name !== null) {
    return name.korean || name.english || 'Unknown'
  }

  return 'Unknown'
}