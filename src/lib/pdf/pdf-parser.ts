/**
 * Safe wrapper for pdf-parse that handles debug mode issues
 */

// Prevent pdf-parse from loading test file
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_ENV = 'production'
}

export async function parsePDF(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    // Dynamic import to avoid build-time issues
    const pdfParse = (await import('pdf-parse')).default
    
    // Parse the PDF
    const data = await pdfParse(buffer)
    
    return {
      text: data.text || '',
      numpages: data.numpages || 0
    }
    
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${(error as Error).message}`)
  }
}