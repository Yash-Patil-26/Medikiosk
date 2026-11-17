import { request } from 'https';

const TRANSLATION_CACHE = new Map();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback translations for common terms
const FALLBACK_TRANSLATIONS = {
  hi: {
    'Today': 'आज',
    'Yesterday': 'कल',
    '2-3 days ago': '2-3 दिन पहले',
    'More than a week': 'एक सप्ताह से ज्यादा',
    'Dull ache': 'हल्का दर्द',
    'Sharp pain': 'तीखा दर्द',
    'Burning sensation': 'जलन',
    'Tightness': 'खिंचाव',
    'Pressure': 'दबाव',
    'Throbbing': 'धड़कना',
    'Constant': 'लगातार',
    'Comes and goes': 'आता-जाता',
    'Intermittent': 'बीच-बीच',
    'Worse in morning': 'सुबह खराब',
    'Worse at night': 'रात खराब',
    'Penicillin': 'पेनिसिलिन',
    'Sulfa drugs': 'सल्फा दवाई',
    'Aspirin': 'एस्पिरिन',
    'Peanuts': 'मूंगफली',
    'Dust': 'धूल',
    'Pollen': 'पराग',
    'Metformin': 'मेटफॉर्मिन',
    'Blood pressure medication': 'ब्लड प्रेशर की दवाई',
    'Pain relievers': 'दर्द की दवाई',
    'Vitamins': 'विटामिन',
    'Appendectomy': 'अपेंडिसाइटोमी',
    'C-section': 'सी-सेक्शन',
    'Gallbladder removal': 'पित्त की थैली',
    'Knee surgery': 'घुटने की सर्जरी',
    'Dental surgery': 'दांत की सर्जरी',
    'Diabetes': 'डायबिटीज',
    'High blood pressure': 'हाई ब्लड प्रेशर',
    'Heart disease': 'हार्ट डिजीज',
    'Cancer': 'कैंसर',
    'Thyroid problems': 'थायराइड की समस्या'
  },
  mr: {
    'Today': 'आज',
    'Yesterday': 'काल',
    '2-3 days ago': '२-३ दिवस आधी',
    'More than a week': 'एका आठवड्यापेक्षा जास्त',
    'Dull ache': 'मंद वेदना',
    'Sharp pain': 'तीक्ष्ण वेदना',
    'Burning sensation': 'जळजळ',
    'Tightness': 'दटणे',
    'Pressure': 'दाब',
    'Throbbing': 'धडकने',
    'Constant': 'सतत',
    'Comes and goes': 'येऊन येते',
    'Intermittent': 'थोडेथोडे',
    'Worse in morning': 'सकाळी वाईट',
    'Worse at night': 'रात्री वाईट',
    'Penicillin': 'पेनिसिलिन',
    'Sulfa drugs': 'सल्फा औषधे',
    'Aspirin': 'अॅस्पिरिन',
    'Peanuts': 'मूंगफली',
    'Dust': 'धूळ',
    'Pollen': 'पराग',
    'Metformin': 'मेटफॉर्मिन',
    'Blood pressure medication': 'रक्तदाबाची औषधे',
    'Pain relievers': 'वेदनाशामक',
    'Vitamins': 'व्हिटामिन्स',
    'Appendectomy': 'अॅपेंडेक्टोमी',
    'C-section': 'सी-सेक्शन',
    'Gallbladder removal': 'पित्ताची थेली',
    'Knee surgery': 'गुटाऱ्याची शस्त्रक्रिया',
    'Dental surgery': 'दंताची शस्त्रक्रिया',
    'Diabetes': 'मधुमेह',
    'High blood pressure': 'उच्च रक्तदाब',
    'Heart disease': 'हृदयाचे आजार',
    'Cancer': 'कर्करोग',
    'Thyroid problems': 'थायराइडचा त्रुटी'
  }
};

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
              const translated = json.responseData.translatedText;
              // Validate that translation is not malformed (no template placeholders)
              if (translated && !translated.includes('@') && !translated.includes('%') && !translated.includes('title:')) {
                resolve(translated);
              } else {
                console.warn('Malformed translation received, using fallback');
                reject(new Error('Malformed translation'));
              }
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
    // Use fallback translations if available
    const fallback = FALLBACK_TRANSLATIONS[targetLang]?.[text];
    if (fallback) {
      return fallback;
    }
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
