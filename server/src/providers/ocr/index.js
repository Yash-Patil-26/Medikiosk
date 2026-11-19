const provider = process.env.OCR_PROVIDER || 'local';

export async function extractDocument(buffer, mimeType, filename) {
  // OCR provider placeholder - returns empty results
  // In production, integrate with a real OCR service (Google Vision, AWS Textract, etc.)
  return {
    docType: 'unknown',
    date: null,
    provider: 'OCR provider not configured',
    diagnoses: [],
    medications: [],
    labs: [],
    confidence: 0
  };
}
