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
    'More than a week': 'एक सप्ताह से अधिक',
    'Is it constant, or does it come and go?': 'क्या यह लगातार है या आता-जाता है?',
    'e.g. constant, or comes and goes every few hours': 'उदा. लगातार, या हर कुछ घंटे में आता-जाता है',
    'Not sure': 'पक्का नहीं',
    'Can you describe what it feels like?': 'क्या आप बता सकते हैं कि यह कैसा महसूस करता है?',
    'e.g. dull ache, sharp, burning, tight': 'उदा. दर्द, तीखा, जलन, खिंचाव',
    'Hard to describe': 'बताना मुश्किल',
    'On a scale of 1 to 10, how severe is it right now?': '1 से 10 के पैमाने पर, अभी यह कितना गंभीर है?',
    'Do you have any known allergies (medicines, food, or other)?': 'क्या आपको कोई ज्ञात एलर्जी है (दवाई, खाद्य पदार्थ, या अन्य)?',
    'e.g. Penicillin, peanuts': 'उदा. पेनिसिलिन, मूंगफली',
    'No known allergies': 'कोई ज्ञात एलर्जी नहीं',
    'Are you currently taking any medicines?': 'क्या आप वर्तमान में कोई दवाई ले रहे हैं?',
    'e.g. Metformin 500mg, Aspirin': 'उदा. मेटफॉर्मिन 500mg, एस्पिरिन',
    'No current medicines': 'कोई वर्तमान दवाई नहीं',
    'Do you have any past medical conditions?': 'क्या आपको कोई पिछली चिकित्सा है?',
    'Diabetes': 'मधुमेह',
    'High blood pressure': 'उच्च रक्तचाप',
    'Heart disease': 'हृदय रोग',
    'Asthma': 'अस्थमा',
    'Thyroid disorder': 'थायराइड विकार',
    'None': 'कोई नहीं',
    'Have you had any surgeries in the past?': 'क्या आपको पहले कोई सर्जरी हुई है?',
    'e.g. Appendectomy 2019': 'उदा. एपेंडेक्टोमी 2019',
    'No surgeries': 'कोई सर्जरी नहीं',
    'Any significant medical conditions in your immediate family?': 'क्या आपके तत्काल परिवार में कोई महत्वपूर्ण चिकित्सा है?',
    'e.g. Father - diabetes': 'उदा. पिता - मधुमेह',
    'None known': 'कोई ज्ञात नहीं',
    'Please select your complaint first.': 'कृपया पहले अपनी शिकायत चुनें।',
    'Interview complete.': 'साक्षात्कार पूर्ण हो गई।',
    // Complaint options
    'Chest Discomfort': 'सीने में असुविधा',
    'Fever': 'बुखार',
    'Cough': 'खांसी',
    'Headache': 'सिरदर्द',
    'Abdominal Pain': 'पेट में दर्द',
    'General Weakness': 'सामान्य कमजोरी',
    'Other': 'अन्य',
    // Chest pain specific
    'Where exactly do you feel the discomfort?': 'आप वास्तव में बिल्कुल सुस्काय महसूस होती है?',
    'Center of chest': 'छाती के बीच में',
    'Left side': 'बायीं तरफ',
    'Right side': 'दायीं तरफ',
    'Upper chest': 'छाती के ऊपरी हिस्से',
    'All over chest': 'पूरी छाती में',
    'How did the discomfort start?': 'सुस्काय कैसे शुरू हुई?',
    'Suddenly': 'अचानक',
    'Gradually': 'धीरे-धीरे',
    'How long have you had this discomfort?': 'आपको यह सुस्काय कितने समय से है?',
    'A few minutes': 'कुछ मिनट',
    'A few hours': 'कुछ घंटे',
    'Days': 'दिन',
    'Weeks or more': 'हफ्ते या अधिक',
    'How would you describe the feeling?': 'आप उसे कैसे वर्णना करेंगे?',
    'Pressure or squeezing': 'दबाव या दबाव',
    'Sharp or stabbing': 'तीक्ष्ण या भोंक',
    'Burning': 'जलन',
    'Dull ache': 'दर्द',
    'Does the discomfort spread anywhere?': 'क्या सुस्काय कहीं फैलती है?',
    'No, stays in chest': 'नहीं, छाती में रहती है',
    'Arm or jaw': 'हाथ या जबड़ा',
    'Back': 'पीठ',
    'Shoulder': 'कंधा',
    'Are you having any difficulty breathing?': 'क्या आपको सांस लेने में कोई कठिनाई हो रही है?',
    'No difficulty': 'कोई कठिनाई नहीं',
    'Mild difficulty': 'हलकी कठिनाई',
    'Moderate difficulty': 'मध्यम कठिनाई',
    'Severe difficulty': 'गंभीर कठिनाई',
    'On a scale of 1 to 10, how severe is the discomfort? (1 = mild, 10 = worst)': '1 से 10 के पैमाने पर, सुस्काय कितनी गंभीर है? (1 = हलका, 10 = सबसे खराब)'
  },
  mr: {
    'When did this start?': 'हे कधींपासून सुरू झाले?',
    'Today': 'आज',
    'Yesterday': 'काल',
    '2-3 days ago': '२-३ दिवस आधी',
    'More than a week': 'एका आठवड्यापेक्षी जास्त',
    'Is it constant, or does it come and go?': 'हे सतत आहे की ये येवे येते?',
    'e.g. constant, or comes and goes every few hours': 'उदा. सतत, किंवा हर काही तासांमध्ये येते',
    'Not sure': 'कळक पता नाही',
    'Can you describe what it feels like?': 'तुम्ही सांगताच काय वाटते हे सांगू शकता का?',
    'e.g. dull ache, sharp, burning, tight': 'उदा. दुखद, तीक्ष्ण, जळणे, दटणे',
    'Hard to describe': 'सांगतायचे कठीण',
    'On a scale of 1 to 10, how severe is it right now?': '१ ते १० पर्यंत, आता हे कितनी गंभीर आहे?',
    'Do you have any known allergies (medicines, food, or other)?': 'तुमच्याला कोणतेही आज्ञात अॅलर्जी आहे का (औषध, अन्न, किंवा इतर)?',
    'e.g. Penicillin, peanuts': 'उदा. पेनिसिलिन, मूंगफली',
    'No known allergies': 'कोणतीही आज्ञात अॅलर्जी नाही',
    'Are you currently taking any medicines?': 'तुम्ही सध्या कोणतीही औषधे घेत आहात का?',
    'e.g. Metformin 500mg, Aspirin': 'उदा. मेटफॉर्मिन ५००mg, अॅस्पिरिन',
    'No current medicines': 'सध्या कोणतीही औषधे नाही',
    'Do you have any past medical conditions?': 'तुमच्या भूतकाळात कोणतीही वैद्यकीय स्थिती आहे का?',
    'Diabetes': 'मधुमेह',
    'High blood pressure': 'उच्च रक्तदाब',
    'Heart disease': 'हृदय रोग',
    'Asthma': 'दमा',
    'Thyroid disorder': 'थायराइड विकार',
    'None': 'काहीही नाही',
    'Have you had any surgeries in the past?': 'तुमच्या भूतकाळात कोणतीही शस्त्रक्रिया झाली आहे का?',
    'e.g. Appendectomy 2019': 'उदा. अॅपेंडेक्टोमी २०१९',
    'No surgeries': 'कोणतीही शस्त्रक्रिया नाही',
    'Any significant medical conditions in your immediate family?': 'तुमच्या तत्काल कुटुंबात कोणतीही महत्वपूर्ण वैद्यकीय स्थिती आहे का?',
    'e.g. Father - diabetes': 'उदा. वडील - मधुमेह',
    'None known': 'काहीही माहित नाही',
    'Please select your complaint first.': 'कृपया आधी तुमची तक्रार निवडा.',
    'Interview complete.': 'मुलाखात पूर्ण झाले.',
    // Complaint options
    'Chest Discomfort': 'छातीत सुस्काय',
    'Fever': 'ताव',
    'Cough': 'खोकला',
    'Headache': 'डोकेदुखी',
    'Abdominal Pain': 'पोटात दुखी',
    'General Weakness': 'सामान्य कमजोरी',
    'Other': 'इतर',
    // Chest pain specific
    'Where exactly do you feel the discomfort?': 'तुम्ही वास्तव मध्ये असुविधा वाटते का?',
    'Center of chest': 'छातीच्या मध्ये',
    'Left side': 'डावीकडे',
    'Right side': 'उजव्या कडे',
    'Upper chest': 'छातीच्या वर',
    'All over chest': 'संपूर्ण छाती',
    'How did the discomfort start?': 'असुविधा कशी सुरू झाली?',
    'Suddenly': 'एकदम बरोबर',
    'Gradually': 'टपा टपा',
    'How long have you had this discomfort?': 'तुम्ही ही असुविधा किती वेळ आहे?',
    'A few minutes': 'काही मिनिटे',
    'A few hours': 'काही तास',
    'Days': 'दिवस',
    'Weeks or more': 'आठवडे किंवा अधिक',
    'How would you describe the feeling?': 'तुम्ही हे कसे वाटते का सांगू शकता का?',
    'Pressure or squeezing': 'दाब दाब किंवा चिरक वाटणे',
    'Sharp or stabbing': 'तीक्ष्ण किंवा भोक वाटणे',
    'Burning': 'जळणे',
    'Dull ache': 'दुखद',
    'Does the discomfort spread anywhere?': 'असुविधा कुठे फैलते का?',
    'No, stays in chest': 'नाही, छातीत राहते',
    'Arm or jaw': 'हात किंवा जबडा',
    'Back': 'पाठ',
    'Shoulder': 'खांडा',
    'Are you having any difficulty breathing?': 'तुम्ही श्वास घेण्यात काही अडचन आहे का?',
    'No difficulty': 'काही अडचन नाही',
    'Mild difficulty': 'थोडकी अडचन',
    'Moderate difficulty': 'मध्यम अडचन',
    'Severe difficulty': 'गंभीर अडचन',
    'On a scale of 1 to 10, how severe is the discomfort? (1 = mild, 10 = worst)': '१ ते १० पर्यंत, असुविधा कितनी गंभीर आहे? (१ = हलके, १० = सर्वातीती वाईट)'
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
