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
  'When did the fever start?': 'बुखार कब से शुरू हुआ?',
  'Do you know your temperature reading?': 'क्या आपको अपना तापमान पता है?',
  'Low grade (99-100°F)': 'कम तापमान (99-100°F)',
  'Moderate (100-102°F)': 'सामान्य (100-102°F)',
  'High (above 102°F)': 'ज्यादा (102°F से ऊपर)',
  'I don\'t know': 'मुझे पता नहीं',
  'Do you have chills or shivering?': 'क्या आपको ठंड लग रही है या कांप आ रही है?',
  'Have you felt confused or had any change in awareness?': 'क्या आपको भ्रम हुआ है या जागरूकता में कोई बदलाव आया है?',
  'Yes': 'हां',
  'No': 'नहीं',
  // AYUSH specific
  'Which best describes your natural body constitution (Prakriti), if you know it?': 'अगर आपको पता है तो आपकी प्राकृति कैसी है?',
  'Vata': 'वात',
  'Pitta': 'पित्त',
  'Kapha': 'कफ',
  'A mix of more than one': 'एक से ज्यादा का मिश्रण',
  'I\'m not sure': 'मुझे पता नहीं',
  'How would you describe your digestion (Agni) in general?': 'आप अपना पाचन (अग्नि) कैसा बताएंगे?',
  'Regular and comfortable': 'नियमित और आरामदायक',
  'Irregular': 'अनियमित',
  'Slow / feels heavy after eating': 'धीमा / खाने के बाद भारी महसूस होता है',
  'Excessive hunger / acidity': 'ज्यादा भूख / एसिडिटी',
  'Not sure': 'पता नहीं',
  'What best describes your diet (Ahara)?': 'आपका आहार (खान-पान) कैसा है?',
  'Vegetarian': 'शाकाहारी',
  'Non-vegetarian': 'मांसाहारी',
  'Vegan': 'वेगन',
  'Mixed / varies': 'मिश्रित / बदलता रहता है',
  'On average, how many hours do you sleep per night?': 'औसतन, आप रात में कितने घंटे सोते हैं?',
  'How often do you exercise or do physical activity (Vihara)?': 'आप किती बार व्यायाम करते हैं (विहार)?',
  'Daily': 'रोज़',
  'A few times a week': 'हफ्ते में कुछ बार',
  'Rarely': 'कभी-कभी',
  'Never': 'कभी नहीं',
  'Do you feel your body is currently out of balance in any way? For example, excess heat, heaviness, dryness, or restlessness.': 'क्या आपको लगता है कि आपका शरीर असंतुलित है? जैसे ज्यादा गर्मी, भारीपन, सूखापन, या बेचैनी?',
  'e.g. feeling unusually heavy and sluggish': 'जैसे असामान्य रूप से भारी और सुस्त महसूस होना',
  'Nothing specific': 'कुछ खास नहीं',
  // Suggested options
};

// Marathi fallback translations for common terms that API may fail to translate
const MARATHI_TRANSLATIONS = {
  'Today': 'आज',
  'Yesterday': 'काल',
  '2-3 days ago': '२-३ दिवस आधी',
  'More than a week': 'एका आठवड्यापेक्षा जास्त',
  'Yes': 'होय',
  'No': 'नाही',
  'Mild': 'सौम्य',
  'Moderate': 'मध्यम',
  'Severe': 'गंभीर',
  'Suddenly': 'एकदम',
  'Gradually': 'टप्प्याटप्प्या',
  'A few minutes': 'काही मिनिटे',
  'A few hours': 'काही तास',
  'Days': 'दिवस',
  'Weeks or more': 'आठवडे किंवा जास्त',
  'Pressure or squeezing': 'दाब किंवा चिरक',
  'Sharp or stabbing': 'तीक्ष्ण किंवा भोक',
  'Burning': 'जळणे',
  'Dull ache': 'मंद वेदना',
  'Vata': 'वात',
  'Pitta': 'पित्त',
  'Kapha': 'कफ',
  'Daily': 'दररोज',
  'Never': 'कधीच नाही',
  'None': 'काहीही नाही',
  'Vegetarian': 'शाकाहारी',
  'Non-vegetarian': 'मांसाहारी',
  'Vegan': 'व्हेगन',
  'Mixed / varies': 'मिश्रित / बदलते',
  'Not sure': 'कळक पता नाही',
  'I don\'t know': 'मला माहित नाही',
  'Regular and comfortable': 'नियमित आणि आरामदायक',
  'Irregular': 'अनियमित',
  'Slow / feels heavy after eating': 'संथे / खाल्यानंतर भारी वाटते',
  'Excessive hunger / acidity': 'जास्त भूक / ऍसिडिटी',
  'One side': 'एक बाजू',
  'Whole head': 'संपूर्ण डोके',
  'Forehead': 'माथ्यावर',
  'Temples': 'टेम्पल',
  'Back of head': 'डोक्यामागे',
  'Low grade (99-100°F)': 'कम तापमान (९९-१००°F)',
  'Moderate (100-102°F)': 'मध्यम (१००-१०२°F)',
  'High (above 102°F)': 'जास्त (१०२°F पेक्षा)',
  'A few times a week': 'आठवड्यात काही वेळा',
  'Rarely': 'क्वचितच कधीच',
  'Nothing specific': 'काहीही विशिष्ट नाही'
};

/**
 * Free translation using MyMemory API
 * For Hindi, use hardcoded translations for reliability
 * For Marathi, use API with fallback for common terms
 */
export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en') {
    return text;
  }

  // For Hindi, always use hardcoded translations (API produces poor results)
  if (targetLang === 'hi') {
    return HINDI_TRANSLATIONS[text] || text;
  }

  // For Marathi, check fallback first for common terms
  if (targetLang === 'mr') {
    const marathiFallback = MARATHI_TRANSLATIONS[text];
    if (marathiFallback) {
      return marathiFallback;
    }
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
    // Use Marathi fallback if available
    if (targetLang === 'mr') {
      const marathiFallback = MARATHI_TRANSLATIONS[text];
      if (marathiFallback) {
        return marathiFallback;
      }
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
