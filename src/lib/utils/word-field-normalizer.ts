/**
 * Utility to safely extract string values from word fields that might be objects
 * Handles fields that could be strings, objects with language keys, or undefined
 */

/**
 * Safely extracts a string value from a field that might be an object with language keys
 * @param field - The field value (could be string, object, null, or undefined)
 * @param preferKorean - Whether to prefer Korean over English when both exist
 * @returns A string value or empty string
 */
export function getFieldString(field: any, preferKorean: boolean = true): string {
  // Handle null/undefined
  if (!field) {
    return ''
  }

  // If it's already a string, return it
  if (typeof field === 'string') {
    return field
  }

  // If it's an object, try to extract language-specific values
  if (typeof field === 'object' && field !== null) {
    // Check for language keys
    if ('korean' in field || 'english' in field) {
      if (preferKorean && field.korean) {
        return String(field.korean)
      }
      if (field.english) {
        return String(field.english)
      }
      if (field.korean) {
        return String(field.korean)
      }
    }

    // Check for 'ko' and 'en' keys (alternative format)
    if ('ko' in field || 'en' in field) {
      if (preferKorean && field.ko) {
        return String(field.ko)
      }
      if (field.en) {
        return String(field.en)
      }
      if (field.ko) {
        return String(field.ko)
      }
    }

    // If it has a toString method that's not the default Object.toString
    if (field.toString && field.toString !== Object.prototype.toString) {
      return field.toString()
    }
  }

  // Last resort: convert to string
  return String(field)
}

/**
 * Normalizes all potentially object fields in a word
 * @param word - The word object with potentially mixed field types
 * @returns The word with normalized string fields
 */
export function normalizeWordFields(word: any): any {
  if (!word) return word

  return {
    ...word,
    // Normalize fields that might be objects
    definition: getFieldString(word.definition),
    englishDefinition: getFieldString(word.englishDefinition),
    meaning: getFieldString(word.meaning),
    koreanMeaning: getFieldString(word.koreanMeaning),
    englishMeaning: getFieldString(word.englishMeaning),
    example: getFieldString(word.example),
    koreanExample: getFieldString(word.koreanExample),
    englishExample: getFieldString(word.englishExample),
    // Keep other fields as-is
  }
}

/**
 * Type guard to check if a value is an object with language keys
 */
export function isLanguageObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return ('korean' in value || 'english' in value || 'ko' in value || 'en' in value)
}