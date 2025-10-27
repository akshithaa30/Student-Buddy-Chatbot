import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { similarity } from '../utils/levenshtein.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const intentsPath = path.join(__dirname, '..', 'data', 'intents.json');

let INTENTS = { intents: [] };

export function loadIntents() {
  try {
    const raw = fs.readFileSync(intentsPath, 'utf-8');
    INTENTS = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load intents.json', e);
  }
}

export function listIntents() {
  return INTENTS.intents;
}

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens), b = new Set(bTokens);
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export function bestMatch(utterance) {
  const tokens = tokenize(utterance);
  let best = null;
  for (const intent of INTENTS.intents) {
    let score = 0;
    for (const p of intent.patterns) {
      const t2 = tokenize(p);
      // mix of fuzzy and token overlap
      const jac = jaccard(tokens, t2);
      const sim = similarity(utterance, p);
      score = Math.max(score, 0.6 * jac + 0.4 * sim);
    }
    if (!best || score > best.score) best = { intent, score };
  }
  return best && best.score > 0.42 ? best : null; // tuned threshold
}
