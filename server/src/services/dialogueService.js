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

export async function getNextNode(session, slotMap) {
  const complaint = slotMap['complaint'];
  if (!complaint) {
    return { type: 'complaint_selection', message: 'Please select your complaint first.' };
  }

  const graphId = COMPLAINT_GRAPH_MAP[complaint] || 'general';

  let complaintNodes = [];
  let generalNodes = [];

  try {
    const graph = await loadGraph(graphId);
    complaintNodes = graph.nodes || [];
  } catch {
    // graph not found, fall through to general only
  }

  // Only load general separately if complaint graph is not already general
  if (graphId !== 'general') {
    try {
      const generalGraph = await loadGraph('general');
      generalNodes = generalGraph.nodes || [];
    } catch { /* ignore */ }
  }

  // Deduplicate by slotId — complaint-specific nodes take priority
  const seen = new Set();
  const allNodes = [];
  for (const node of [...complaintNodes, ...generalNodes]) {
    if (node.slotId && !seen.has(node.slotId)) {
      seen.add(node.slotId);
      allNodes.push(node);
    }
  }

  // Find first unanswered node
  for (const node of allNodes) {
    if (node.slotId && !slotMap[node.slotId]) {
      return { ...node, graphId };
    }
  }

  return { type: 'END', message: 'Interview complete.' };
}
