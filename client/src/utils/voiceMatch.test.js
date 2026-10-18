import { describe, it, expect } from 'vitest';
import { resolveVoiceAnswer } from './voiceMatch.js';

const chestSiteNode = {
  inputType: 'choice',
  options: [
    { value: 'center', label: 'Center of chest' },
    { value: 'left', label: 'Left side' },
    { value: 'right', label: 'Right side' },
    { value: 'upper', label: 'Upper chest' },
    { value: 'diffuse', label: 'All over chest' }
  ]
};

const pastHistoryNode = {
  inputType: 'multiselect',
  options: [
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'hypertension', label: 'High blood pressure' },
    { value: 'none', label: 'None' }
  ]
};

const severityNode = { inputType: 'scale', min: 1, max: 10 };
const allergyNode = { inputType: 'text_or_none' };

describe('resolveVoiceAnswer', () => {
  it('matches a natural phrase to the right choice option', () => {
    expect(resolveVoiceAnswer(chestSiteNode, "it's in the center of my chest").value).toBe('center');
    expect(resolveVoiceAnswer(chestSiteNode, 'left side').value).toBe('left');
    expect(resolveVoiceAnswer(chestSiteNode, 'all over').value).toBe('diffuse');
  });

  it('returns null for a choice question when nothing matches, instead of guessing', () => {
    // This is the exact failure mode seen in testing: an unrelated spoken
    // answer must never be silently stored as a choice-question's value.
    expect(resolveVoiceAnswer(chestSiteNode, 'I feel it in the center')).not.toBeNull();
    expect(resolveVoiceAnswer(chestSiteNode, 'I feel dizzy and tired today')).toBeNull();
  });

  it('does not let a filler word that overlaps an option value decide the answer', () => {
    // "right" here is an intensifier ("right in the middle"), not the
    // patient naming the right side — this must not resolve to 'right'.
    expect(resolveVoiceAnswer(chestSiteNode, 'it hurts right in the middle of my chest')).toBeNull();
    // But said as an actual answer, "right side" must still resolve.
    expect(resolveVoiceAnswer(chestSiteNode, 'on my right side').value).toBe('right');
  });

  it('matches multiple spoken conditions to a multiselect answer', () => {
    const result = resolveVoiceAnswer(pastHistoryNode, 'I have diabetes and high blood pressure');
    expect(JSON.parse(result.value).sort()).toEqual(['diabetes', 'hypertension']);
  });

  it('treats "no" / "none" as the exclusive none option for multiselect', () => {
    const result = resolveVoiceAnswer(pastHistoryNode, 'no, none of those');
    expect(JSON.parse(result.value)).toEqual(['none']);
  });

  it('parses a spoken number within range for scale questions', () => {
    expect(resolveVoiceAnswer(severityNode, 'it is about a seven').value).toBe('7');
    expect(resolveVoiceAnswer(severityNode, '9 out of 10').value).toBe('9');
  });

  it('rejects an out-of-range scale number rather than clamping it silently', () => {
    expect(resolveVoiceAnswer(severityNode, 'maybe a 15')).toBeNull();
  });

  it('passes free text through unchanged for text_or_none questions', () => {
    expect(resolveVoiceAnswer(allergyNode, 'Penicillin').value).toBe('Penicillin');
  });

  it('returns null for empty or whitespace-only transcripts', () => {
    expect(resolveVoiceAnswer(chestSiteNode, '')).toBeNull();
    expect(resolveVoiceAnswer(chestSiteNode, '   ')).toBeNull();
  });
});
