import { request } from 'https';

const TRANSLATION_CACHE = new Map();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Free translation using MyMemory API
 * No API key required for basic usage
 * Supports many languages including Hindi (hi) and Marathi (mr)
 */
export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en') {
    return text;
  }

  const cacheKey = `${text}-${targetLang}`;
  const cached = TRANSLATION_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.translation;
  }

  try {
    const sourceLang = 'en';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const translation = await new Promise((resolve, reject) => {
      const req = request(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.responseStatus === 200 && json.responseData) {
              resolve(json.responseData.translatedText);
            } else {
              reject(new Error('Translation API error'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Translation timeout'));
      });
      
      req.end();
    });

    TRANSLATION_CACHE.set(cacheKey, {
      translation,
      timestamp: Date.now()
    });

    return translation;
  } catch (error) {
    console.error('Translation error:', error.message);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Translate a node object with all its text fields
 */
export async function translateNode(node, targetLang) {
  if (!node || !targetLang || targetLang === 'en') {
    return node;
  }

  const translatedNode = { ...node };

  // Translate main question text
  if (node.text) {
    translatedNode.text = await translateText(node.text, targetLang);
  }

  // Translate placeholder
  if (node.placeholder) {
    translatedNode.placeholder = await translateText(node.placeholder, targetLang);
  }

  // Translate noneLabel
  if (node.noneLabel) {
    translatedNode.noneLabel = await translateText(node.noneLabel, targetLang);
  }

  // Translate options
  if (node.options && Array.isArray(node.options)) {
    translatedNode.options = await Promise.all(
      node.options.map(async option => ({
        ...option,
        label: await translateText(option.label, targetLang)
      }))
    );
  }

  // Translate error message
  if (node.message) {
    translatedNode.message = await translateText(node.message, targetLang);
  }

  return translatedNode;
}
