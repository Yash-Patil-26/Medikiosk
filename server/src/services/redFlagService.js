import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(path.resolve(__dirname, '../../..', 'content', 'redflags.json'), 'utf-8'));

export function evaluateRedFlags(slotMap) {
  const triggered = [];
  for (const rule of rules) {
    if (matchesCondition(rule.conditions, slotMap)) {
      triggered.push({ ruleId: rule.ruleId, level: rule.level, reason: rule.reason });
    }
  }
  return triggered;
}

function matchesCondition(conditions, slotMap) {
  const { operator, slots } = conditions;
  const results = slots.map(s => {
    const actual = slotMap[s.slotId]?.value ?? slotMap[s.slotId];
    if (s.operator === 'gte') return actual !== undefined && Number(actual) >= Number(s.value);
    return actual === s.value;
  });
  return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}
