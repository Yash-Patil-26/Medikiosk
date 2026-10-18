// Resolves a raw speech-recognition transcript to a canonical answer for
// choice / multiselect / scale questions, so a spoken answer ends up as the
// same coded value a tap would have produced (e.g. "center" not "it hurts
// right in the middle of my chest"). For free-text questions (text_or_none)
// no resolution is needed or attempted — the transcript itself is the answer.
//
// This is a small, transparent keyword/number matcher, not an AI model: it
// is meant to be auditable and to fail safely (return null) rather than
// guess, so the UI can fall back to asking the patient to tap instead.

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

const GENERIC_WORDS = ['the', 'and', 'your', 'you', 'have', 'has', 'with'];

// Words that are legitimate option vocabulary (e.g. "right" in "Right side")
// but are also common English intensifiers/fillers in natural speech
// ("it hurts right in the middle"). They are never trusted as a lone scoring
// signal — only a full-label phrase match (e.g. "right side") resolves them.
const AMBIGUOUS_FILLER_WORDS = ['right'];

function hasWord(text, word) {
  return new RegExp(`\\b${word}\\b`).test(text);
}

function significantWords(label) {
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !GENERIC_WORDS.includes(w) && !AMBIGUOUS_FILLER_WORDS.includes(w));
}

// Short option values (e.g. "right", "high", "no") are often also ordinary
// English words patients use as filler ("it hurts right in the middle"), so
// they are NOT trusted as a standalone match on their own. Only a match on
// the option's full label (a multi-word, far more specific phrase, e.g.
// "right side") is trusted outright; single words are scored and compared
// against the other options instead, so a generic word shared by several
// options can't quietly decide the answer.
function bestOptionMatch(transcript, options) {
  const text = ` ${transcript.toLowerCase()} `;
  const real = options.filter(o => o.value !== 'none');

  const directLabelMatch = real.find(o => text.includes(o.label.toLowerCase()));
  if (directLabelMatch) return directLabelMatch;

  // Down-weight words shared by several options in this same question (e.g.
  // "chest" appears in most chest-site options) so they can't create a false
  // or tied match; only words that distinguish one option from its siblings
  // count as real signal.
  const wordsByOption = real.map(option => significantWords(option.label));
  const frequency = {};
  for (const words of wordsByOption) {
    for (const word of new Set(words)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  }

  let best = null;
  let bestScore = 0;
  let tied = false;

  real.forEach((option, i) => {
    const distinguishing = wordsByOption[i].filter(w => frequency[w] === 1);
    const words = distinguishing.length > 0 ? distinguishing : wordsByOption[i];
    const score = words.filter(w => hasWord(text, w)).length;

    if (score > bestScore) {
      bestScore = score;
      best = option;
      tied = false;
    } else if (score > 0 && score === bestScore) {
      tied = true;
    }
  });

  // A genuine tie means the utterance didn't clearly point at one option —
  // fail safe (null) rather than guess, so the patient is asked to tap.
  return bestScore > 0 && !tied ? best : null;
}

function matchesNone(transcript) {
  const text = transcript.toLowerCase();
  return /\bno\b|\bnone\b|\bnothing\b/.test(text);
}

/**
 * @returns {{ value: string, label: string } | null}
 *   value/label are ready to send as the answer (value is a JSON string for
 *   multiselect, matching how a tap answer is normalized server-side).
 *   null means no confident match — caller should ask the patient to tap.
 */
export function resolveVoiceAnswer(node, transcript) {
  if (!transcript || !transcript.trim()) return null;

  if (node.inputType === 'choice') {
    const match = bestOptionMatch(transcript, node.options || []);
    return match ? { value: match.value, label: match.label } : null;
  }

  if (node.inputType === 'multiselect') {
    const noneOption = (node.options || []).find(o => o.value === 'none');

    if (noneOption && matchesNone(transcript)) {
      return { value: JSON.stringify(['none']), label: noneOption.label };
    }

    const text = ` ${transcript.toLowerCase()} `;
    const matched = (node.options || []).filter(option => {
      if (option.value === 'none') return false;
      if (text.includes(option.label.toLowerCase())) return true;
      const words = significantWords(option.label);
      return words.some(w => hasWord(text, w));
    });

    if (matched.length === 0) return null;

    return {
      value: JSON.stringify(matched.map(m => m.value)),
      label: matched.map(m => m.label).join(', ')
    };
  }

  if (node.inputType === 'scale') {
    const lower = transcript.toLowerCase();
    const digitMatch = lower.match(/\d+/);
    let number = digitMatch ? parseInt(digitMatch[0], 10) : null;

    if (number === null) {
      for (const [word, val] of Object.entries(NUMBER_WORDS)) {
        if (new RegExp(`\\b${word}\\b`).test(lower)) { number = val; break; }
      }
    }

    if (number === null || number < node.min || number > node.max) return null;

    return { value: String(number), label: String(number) };
  }

  // text_or_none and anything else: the transcript itself is the answer.
  return { value: transcript.trim(), label: transcript.trim() };
}
