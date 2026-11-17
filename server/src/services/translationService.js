import { request } from 'https';

const TRANSLATION_CACHE = new Map();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Comprehensive Hindi fallback translations - simple, conversational, daily-life standard
const HINDI_TRANSLATIONS = {
  'When did this start?': 'यह कब से शुरू हुआ?',
  'Today': 'आज',
  'Yesterday': 'कल',
  '2-3 days ago': '2-3 दिन पहले',
  'More than a week': 'एक हफ्ते से ज्यादा',
  'Is it constant, or does it come and go?': 'क्या यह लगातार है या आता-जाता है?',
  'e.g. constant, or comes and goes every few hours': 'जैसे लगातार, या हर कुछ घंटे में आता-जाता है',
  'Not sure': 'पता नहीं',
  'Can you describe what it feels like?': 'आप बता सकते हैं कि यह कैसा महसूस होता है?',
  'e.g. dull ache, sharp, burning, tight': 'जैसे हल्का दर्द, तीखा, जलन, खिंचाव',
  'Hard to describe': 'बताना मुश्किल',
  'On a scale of 1 to 10, how severe is it right now?': '1 से 10 में, अभी यह कितना गंभीर है?',
  'Do you have any known allergies (medicines, food, or other)?': 'क्या आपको कोई एलर्जी है (दवाई, खाना, या अन्य)?',
  'e.g. Penicillin, peanuts': 'जैसे पेनिसिलिन, मूंगफली',
  'No known allergies': 'कोई एलर्जी नहीं',
  'Are you currently taking any medicines?': 'क्या आप कोई दवाई ले रहे हैं?',
  'e.g. Metformin 500mg, Aspirin': 'जैसे मेटफॉर्मिन 500mg, एस्पिरिन',
  'No current medicines': 'कोई दवाई नहीं',
  'Do you have any past medical conditions?': 'क्या आपको कोई पुरानी बीमारी है?',
  'Diabetes': 'डायबिटीज',
  'High blood pressure': 'हाई बीपी',
  'Heart disease': 'हार्ट की बीमारी',
  'Asthma': 'अस्थमा',
  'Thyroid disorder': 'थायराइड की समस्या',
  'None': 'कोई नहीं',
  'Have you had any surgeries in the past?': 'क्या आपको पहले कोई ऑपरेशन हुआ है?',
  'e.g. Appendectomy 2019': 'जैसे अपेंडिसाइटोमी 2019',
  'No surgeries': 'कोई ऑपरेशन नहीं',
  'Any significant medical conditions in your immediate family?': 'क्या आपके परिवार में कोई बड़ी बीमारी है?',
  'e.g. Father - diabetes': 'जैसे पापा - डायबिटीज',
  'None known': 'कोई नहीं पता',
  'Please select your complaint first.': 'कृपया पहले अपनी शिकायत चुनें।',
  'Interview complete.': 'सवाल-जवाब पूरा हो गया।',
  // Complaint options
  'Chest Discomfort': 'सीने में दर्द',
  'Fever': 'बुखार',
  'Cough': 'खांसी',
  'Headache': 'सिरदर्द',
  'Abdominal Pain': 'पेट दर्द',
  'General Weakness': 'कमजोरी',
  'Other': 'अन्य',
  // Chest pain specific
  'Where exactly do you feel the discomfort?': 'आपको सीने में दर्द कहां हो रहा है?',
  'Center of chest': 'सीने के बीच में',
  'Left side': 'बाईं तरफ',
  'Right side': 'दाईं तरफ',
  'Upper chest': 'सीने के ऊपर',
  'All over chest': 'पूरे सीने में',
  'How did the discomfort start?': 'दर्द कैसे शुरू हुआ?',
  'Suddenly': 'अचानक',
  'Gradually': 'धीरे-धीरे',
  'How long have you had this discomfort?': 'आपको यह दर्द कितने समय से है?',
  'A few minutes': 'कुछ मिनट',
  'A few hours': 'कुछ घंटे',
  'Days': 'दिन',
  'Weeks or more': 'हफ्ते या ज्यादा',
  'How would you describe the feeling?': 'आप इसे कैसा महसूस करते हैं?',
  'Pressure or squeezing': 'दबाव या खिंचाव',
  'Sharp or stabbing': 'तीखा या भोंक',
  'Burning': 'जलन',
  'Dull ache': 'हल्का दर्द',
  'Does the discomfort spread anywhere?': 'क्या दर्द कहीं और फैल रहा है?',
  'No, stays in chest': 'नहीं, सीने में ही है',
  'Arm or jaw': 'हाथ या जबड़ा',
  'Back': 'पीठ',
  'Shoulder': 'कंधा',
  'Are you having any difficulty breathing?': 'क्या आपको सांस लेने में दिक्कत हो रही है?',
  'No difficulty': 'कोई दिक्कत नहीं',
  'Mild difficulty': 'थोड़ी दिक्कत',
  'Moderate difficulty': 'मध्यम दिक्कत',
  'Severe difficulty': 'बहुत ज्यादा दिक्कत',
  'On a scale of 1 to 10, how severe is the discomfort? (1 = mild, 10 = worst)': '1 से 10 में, दर्द कितना गंभीर है? (1 = कम, 10 = बहुत ज्यादा)',
  // Headache specific
  'Where is the headache located?': 'सिरदर्द कहां हो रहा है?',
  'Forehead': 'माथे पर',
  'Temples': 'टेम्पल पर',
  'Back of head': 'सिर के पीछे',
  'One side': 'एक तरफ',
  'Whole head': 'पूरे सिर में',
  'How did the headache start?': 'सिरदर्द कैसे शुरू हुआ?',
  'Suddenly (worst headache of life)': 'अचानक (जीवन का सबसे बुरा सिरदर्द)',
  'How severe is the headache?': 'सिरदर्द कितना गंभीर है?',
  'Mild': 'हल्का',
  'Moderate': 'मध्यम',
  'Severe': 'गंभीर',
  // Fever specific
  'Have you felt confused or had any change in awareness?': 'क्या आपको भ्रम हुआ है या जागरूकता में कोई बदलाव आया है?',
  'Yes': 'हां',
  'No': 'नहीं',
  // Suggested options
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
  'Worse at night': 'रात में खराब',
  'Penicillin': 'पेनिसिलिन',
  'Sulfa drugs': 'सल्फा की दवाई',
  'Aspirin': 'एस्पिरिन',
  'Peanuts': 'मूंगफली',
  'Dust': 'धूल',
  'Pollen': 'पराग',
  'Metformin': 'मेटफॉर्मिन',
  'Blood pressure medication': 'बीपी की दवाई',
  'Pain relievers': 'दर्द की दवाई',
  'Vitamins': 'विटामिन',
  'Appendectomy': 'अपेंडिसाइटोमी',
  'C-section': 'सी-सेक्शन',
  'Gallbladder removal': 'पित्त की थैली',
  'Knee surgery': 'घुटने की सर्जरी',
  'Dental surgery': 'दांत की सर्जरी',
  'Diabetes': 'डायबिटीज',
  'High blood pressure': 'हाई बीपी',
  'Heart disease': 'हार्ट की बीमारी',
  'Cancer': 'कैंसर',
  'Thyroid problems': 'थायराइड की समस्या'
};

/**
 * Free translation using MyMemory API
 * For Hindi, use hardcoded translations for reliability
 * For Marathi, use API since it's working well
 */
export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en') {
    return text;
  }

  // For Hindi, always use hardcoded translations (API produces poor results)
  if (targetLang === 'hi') {
    return HINDI_TRANSLATIONS[text] || text;
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
