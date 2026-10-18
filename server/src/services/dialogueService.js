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

  if (!complaint) {
    return {
      type: 'complaint_selection',
      message: 'Please select your complaint first.'
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
      return { ...node, graphId };
    }
  }

  return { type: 'END', message: 'Interview complete.' };
}
