import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../..', 'content', 'questions');

const COMPLAINT_GRAPH_MAP = {
  chest_discomfort: 'chest-pain',
  fever: 'fever',
  headache: 'headache',
  cough: 'general',
  abdominal_pain: 'general',
  general_weakness: 'general',
  other: 'general'
};

// Translation dictionary for interview questions
const TRANSLATIONS = {
  hi: {
    'When did this start?': 'यह कब से शुरू हुआ?',
    'Today': 'आज',
    'Yesterday': 'कल',
    '2-3 days ago': '2-3 दिन पहले',
    'More than a week': 'एक सप्ताह से ज्यादा',
    'Is it constant, or does it come and go?': 'क्या यह लगातार है या आता-जाता है?',
    'e.g. constant, or comes and goes every few hours': 'उदा. लगातार, या हर कुछ घंटे में आता-जाता है',
    'Not sure': 'पता नहीं',
    'Can you describe what it feels like?': 'क्या आप बता सकते हैं कि यह कैसा महसूस होता है?',
    'e.g. dull ache, sharp, burning, tight': 'उदा. हल्का दर्द, तीखा, जलन, खिंचाव',
    'Hard to describe': 'बताना मुश्किल',
    'On a scale of 1 to 10, how severe is it right now?': '1 से 10 के पैमाने पर, अभी यह कितना गंभीर है?',
    'Do you have any known allergies (medicines, food, or other)?': 'क्या आपको कोई एलर्जी है (दवाई, खाना, या अन्य)?',
    'e.g. Penicillin, peanuts': 'उदा. पेनिसिलिन, मूंगफली',
    'No known allergies': 'कोई एलर्जी नहीं',
    'Are you currently taking any medicines?': 'क्या आप कोई दवाई ले रहे हैं?',
    'e.g. Metformin 500mg, Aspirin': 'उदा. मेटफॉर्मिन 500mg, एस्पिरिन',
    'No current medicines': 'कोई दवाई नहीं',
    'Do you have any past medical conditions?': 'क्या आपको कोई पुरानी बीमारी है?',
    'Diabetes': 'डायबिटीज',
    'High blood pressure': 'हाई ब्लड प्रेशर',
    'Heart disease': 'हार्ट डिजीज',
    'Asthma': 'अस्थमा',
    'Thyroid disorder': 'थायराइड की समस्या',
    'None': 'कोई नहीं',
    'Have you had any surgeries in the past?': 'क्या आपको पहले कोई सर्जरी हुई है?',
    'e.g. Appendectomy 2019': 'उदा. अपेंडिसाइटोमी 2019',
    'No surgeries': 'कोई सर्जरी नहीं',
    'Any significant medical conditions in your immediate family?': 'क्या आपके परिवार में कोई बड़ी बीमारी है?',
    'e.g. Father - diabetes': 'उदा. पापा - डायबिटीज',
    'None known': 'कोई नहीं पता',
    'Please select your complaint first.': 'कृपया पहले अपनी शिकायत चुनें।',
    'Interview complete.': 'साक्षात्कार पूरा हो गया।',
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
    'On a scale of 1 to 10, how severe is the discomfort? (1 = mild, 10 = worst)': '1 से 10 के पैमाने पर, दर्द कितना गंभीर है? (1 = कम, 10 = बहुत ज्यादा)'
  },
  mr: {
    'When did this start?': 'हे कधीपासून सुरू झाले?',
    'Today': 'आज',
    'Yesterday': 'काल',
    '2-3 days ago': '२-३ दिवस आधी',
    'More than a week': 'एका आठवड्यापेक्षा जास्त',
    'Is it constant, or does it come and go?': 'हे सतत आहे का की ये येऊन जाते?',
    'e.g. constant, or comes and goes every few hours': 'उदा. सतत, किंवा काही तासांनंतर येऊन जाते',
    'Not sure': 'कळक पता नाही',
    'Can you describe what it feels like?': 'तुम्ही सांगू शकता का हे कसे वाटते?',
    'e.g. dull ache, sharp, burning, tight': 'उदा. दुखद, तीक्ष्ण, जळणे, दटणे',
    'Hard to describe': 'सांगणे कठीण',
    'On a scale of 1 to 10, how severe is it right now?': '१ ते १० पर्यंत, आता हे कितनी गंभीर आहे?',
    'Do you have any known allergies (medicines, food, or other)?': 'तुम्हाला कोणतीही अॅलर्जी आहे का (औषधे, अन्न, किंवा इतर)?',
    'e.g. Penicillin, peanuts': 'उदा. पेनिसिलिन, मूंगफली',
    'No known allergies': 'कोणतीही अॅलर्जी नाही',
    'Are you currently taking any medicines?': 'तुम्ही सध्या कोणतीही औषधे घेत आहात का?',
    'e.g. Metformin 500mg, Aspirin': 'उदा. मेटफॉर्मिन ५००mg, अॅस्पिरिन',
    'No current medicines': 'सध्या कोणतीही औषधे नाही',
    'Do you have any past medical conditions?': 'तुमच्या आरोग्याशी संबंधित काही आहे का?',
    'Diabetes': 'मधुमेह',
    'High blood pressure': 'उच्च रक्तदाब',
    'Heart disease': 'हृदयाचे आजार',
    'Asthma': 'दमा',
    'Thyroid disorder': 'थायराइडचा त्रुटी',
    'None': 'काहीही नाही',
    'Have you had any surgeries in the past?': 'तुमची आधी काही शस्त्रक्रिया झाली आहे का?',
    'e.g. Appendectomy 2019': 'उदा. अॅपेंडेक्टोमी २०१९',
    'No surgeries': 'कोणतीही शस्त्रक्रिया नाही',
    'Any significant medical conditions in your immediate family?': 'तुमच्या कुटुंबात कोणतीही मोठी आरोग्याची समस्या आहे का?',
    'e.g. Father - diabetes': 'उदा. वडील - मधुमेह',
    'None known': 'काहीही माहित नाही',
    'Please select your complaint first.': 'कृपया आधी तुमची तक्रार निवडा.',
    'Interview complete.': 'मुलाखत पूर्ण झाली.',
    // Complaint options
    'Chest Discomfort': 'छातीत दुखणे',
    'Fever': 'ताव',
    'Cough': 'खोकला',
    'Headache': 'डोकेदुखी',
    'Abdominal Pain': 'पोटदुखी',
    'General Weakness': 'सामान्य दुर्बलता',
    'Other': 'इतर',
    // Chest pain specific
    'Where exactly do you feel the discomfort?': 'तुम्हाला छातीत नेमके कुठे दुखते आहे?',
    'Center of chest': 'छातीच्या मध्यभागी',
    'Left side': 'डावी बाजू',
    'Right side': 'उजवी बाजू',
    'Upper chest': 'छातीच्या वरच्या भागात',
    'All over chest': 'संपूर्ण छातीत',
    'How did the discomfort start?': 'हे दुखणे कसे सुरू झाले?',
    'Suddenly': 'एकदम',
    'Gradually': 'टप्प्याटप्प्या',
    'How long have you had this discomfort?': 'तुम्हाला हे दुखणे किती वेळापासून आहे?',
    'A few minutes': 'काही मिनिटे',
    'A few hours': 'काही तास',
    'Days': 'दिवस',
    'Weeks or more': 'आठवडे किंवा त्यापेक्षा जास्त',
    'How would you describe the feeling?': 'तुम्ही हे कसे वाटते असते ते सांगू शकता का?',
    'Pressure or squeezing': 'दाब किंवा चिरक',
    'Sharp or stabbing': 'तीक्ष्ण किंवा भोक',
    'Burning': 'जळणे',
    'Dull ache': 'दुखद',
    'Does the discomfort spread anywhere?': 'हे दुखणे कुठे फैलते का?',
    'No, stays in chest': 'नाही, फक्त छातीत आहे',
    'Arm or jaw': 'हात किंवा जबडा',
    'Back': 'पाठ',
    'Shoulder': 'खांधा',
    'Are you having any difficulty breathing?': 'तुम्हाला श्वास घेण्यात त्रुटी होत आहे का?',
    'No difficulty': 'काही त्रुटी नाही',
    'Mild difficulty': 'थोडी त्रुटी',
    'Moderate difficulty': 'मध्यम त्रुटी',
    'Severe difficulty': 'गंभीर त्रुटी',
    'On a scale of 1 to 10, how severe is the discomfort? (1 = mild, 10 = worst)': '१ ते १० पर्यंत, हे दुखणे कितनी गंभीर आहे? (१ = कमी, १० = सर्वात जास्त)'
  }
};

function translateText(text, language) {
  if (!language || language === 'en') return text;
  const langTranslations = TRANSLATIONS[language];
  if (!langTranslations) return text;
  return langTranslations[text] || text;
}

function translateNode(node, language) {
  if (!node || !language || language === 'en') return node;
  
  const translatedNode = { ...node };
  
  // Translate main question text
  if (node.text) {
    translatedNode.text = translateText(node.text, language);
  }
  
  // Translate placeholder
  if (node.placeholder) {
    translatedNode.placeholder = translateText(node.placeholder, language);
  }
  
  // Translate noneLabel
  if (node.noneLabel) {
    translatedNode.noneLabel = translateText(node.noneLabel, language);
  }
  
  // Translate options
  if (node.options && Array.isArray(node.options)) {
    translatedNode.options = node.options.map(option => ({
      ...option,
      label: translateText(option.label, language)
    }));
  }
  
  // Translate error message
  if (node.message) {
    translatedNode.message = translateText(node.message, language);
  }
  
  return translatedNode;
}

async function loadGraph(graphId) {
  const file = path.join(CONTENT_DIR, `${graphId}.json`);
  const data = await readFile(file, 'utf-8');
  return JSON.parse(data);
}

export function validateAnswerForNode(node, value, source = 'touch') {
  const invalid = error => ({ valid: false, error });
  const valid = normalizedValue => ({ valid: true, normalizedValue });

  if (!node) {
    return invalid('Question was not found');
  }

  if (node.type === 'complaint_selection') {
    if (
      typeof value !== 'string' ||
      !Object.hasOwn(COMPLAINT_GRAPH_MAP, value)
    ) {
      return invalid('Choose a valid complaint');
    }

    return valid(value);
  }

  // Speech recognition produces a transcript, not a coded option value.
  // The client displays it for read-back confirmation before submission.
  if (source === 'voice') {
    if (typeof value !== 'string' || !value.trim()) {
      return invalid('A non-empty confirmed voice answer is required');
    }

    return valid(value.trim());
  }

  switch (node.inputType) {
    case 'choice': {
      const allowed = (node.options || []).map(option => option.value);

      if (typeof value !== 'string' || !allowed.includes(value)) {
        return invalid('Answer must match one of the available options');
      }

      return valid(value);
    }

    case 'scale': {
      const number = Number(value);

      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !Number.isInteger(number) ||
        number < node.min ||
        number > node.max
      ) {
        return invalid(`Answer must be an integer from ${node.min} to ${node.max}`);
      }

      return valid(String(number));
    }

    case 'text_or_none': {
      if (typeof value !== 'string' || !value.trim()) {
        return invalid('A text answer or explicit none option is required');
      }

      return valid(value.trim());
    }

    case 'multiselect': {
      if (!Array.isArray(value) || value.length === 0) {
        return invalid('Select at least one option');
      }

      if (
        value.some(item => typeof item !== 'string') ||
        new Set(value).size !== value.length
      ) {
        return invalid('Selections must be unique valid options');
      }

      const allowed = new Set(
        (node.options || []).map(option => option.value)
      );

      if (value.some(item => !allowed.has(item))) {
        return invalid('Selection contains an unavailable option');
      }

      if (value.includes('none') && value.length > 1) {
        return invalid('The none option cannot be combined with other selections');
      }

      // session_slots.value is TEXT, so persist arrays as valid JSON.
      return valid(JSON.stringify(value));
    }

    default:
      return invalid('Unsupported question input type');
  }
}

export async function getNextNode(session, slotMap) {
  const complaint = slotMap.complaint;
  const language = session.language || 'en';

  if (!complaint) {
    return {
      type: 'complaint_selection',
      message: translateText('Please select your complaint first.', language)
    };
  }

  const graphId = COMPLAINT_GRAPH_MAP[complaint] || 'general';

  let complaintNodes = [];
  let ayushNodes = [];
  let generalNodes = [];

  try {
    const graph = await loadGraph(graphId);
    complaintNodes = graph.nodes || [];
  } catch {
    // Fall through to general questions if the complaint graph is unavailable.
  }

  if (Number(session.ayush_mode) === 1) {
    try {
      const ayushGraph = await loadGraph('ayush');
      ayushNodes = ayushGraph.nodes || [];
    } catch {
      // AYUSH content is optional; continue without it if unavailable.
    }
  }

  if (graphId !== 'general') {
    try {
      const generalGraph = await loadGraph('general');
      generalNodes = generalGraph.nodes || [];
    } catch {
      // Keep any complaint-specific questions that were loaded.
    }
  }

  const seen = new Set();
  const allNodes = [];

  for (const node of [...complaintNodes, ...ayushNodes, ...generalNodes]) {
    if (node.slotId && !seen.has(node.slotId)) {
      seen.add(node.slotId);
      allNodes.push(node);
    }
  }

  // Preserve the existing graph-array question order.
  for (const node of allNodes) {
    if (node.slotId && !slotMap[node.slotId]) {
      // Translate the node based on session language
      const translatedNode = translateNode(node, language);
      return { ...translatedNode, graphId };
    }
  }

  return { 
    type: 'END', 
    message: translateText('Interview complete.', language)
  };
}
