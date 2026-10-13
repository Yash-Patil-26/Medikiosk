import { extract as mockExtract } from './mock.js';

const provider = process.env.OCR_PROVIDER || 'mock';

export async function extractDocument(buffer, mimeType, filename) {
  if (provider === 'mock') return mockExtract(buffer, mimeType, filename);
  // Future: gemini provider
  return mockExtract(buffer, mimeType, filename);
}
