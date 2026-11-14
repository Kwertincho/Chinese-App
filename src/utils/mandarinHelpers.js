import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UNIT_1_WORDS,
  KNOWN_CHARACTER_INFO,
  TONE_VOWEL_MAP,
  ADVANCED_MODE_UNLOCK_THRESHOLDS,
  MODALITY_META,
  WRITING_MASTERY_STAGES,
  HANZI_WRITER_CDN
} from '../data/curriculumData.js';

// ============================================================================
// PINYIN NORMALIZATION, ANDROID KEYBOARD ('v' -> 'ü'), TONE & DICTATION HELPERS
// ============================================================================
export function stripToneMarks(input = '') {
  return String(input || '')
    .toLowerCase()
    .replace(/u:/g, 'ü')
    .replace(/v/g, 'ü')
    .split('')
    .map((ch) => (TONE_VOWEL_MAP[ch] ? TONE_VOWEL_MAP[ch].base : ch))
    .join('')
    .replace(/[1-50]/g, '')
    .replace(/['’\s\p{P}]/gu, '');
}

const MANDARIN_SYLLABLE_REGEX =
  /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:(?:iang|iong|uang|ueng|ang|eng|ing|ong)(?![aoeiuü])|(?:üan|uan|ian|ün|un|an|en|in)(?![aoeiuü])|er(?![aoeiuü])|iao|uai|uei|iou|üe|ue|uo|ui|iu|ia|ie|ua|ai|ei|ao|ou|a|o|e|i|u|ü)([0-5])?/i;

const MANDARIN_FINAL_REGEX =
  /^(?:(?:iang|iong|uang|ueng|ang|eng|ing|ong)(?![aoeiuü])|(?:üan|uan|ian|ün|un|an|en|in)(?![aoeiuü])|er(?![aoeiuü])|iao|uai|uei|iou|üe|ue|uo|ui|iu|ia|ie|ua|ai|ei|ao|ou|a|o|e|i|u|ü)/i;

const MANDARIN_INITIAL_REGEX = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/i;

export function segmentMandarinPinyin(pinyin = '') {
  const rawChunks = String(pinyin || '')
    .trim()
    .replace(/u:/gi, 'ü')
    .split(/[\s'’]+/)
    .filter(Boolean);

  const syllables = [];

  for (const chunk of rawChunks) {
    // Build a 1-to-1 base character string (same length as chunk) so regex matches map cleanly back to original characters
    const baseChunk = Array.from(chunk)
      .map((ch) => {
        const lower = ch.toLowerCase();
        if (TONE_VOWEL_MAP[lower]) return TONE_VOWEL_MAP[lower].base;
        if (lower === 'v') return 'ü';
        return lower;
      })
      .join('');

    let pos = 0;
    while (pos < chunk.length) {
      const remainingBase = baseChunk.slice(pos);
      const remainingOrig = chunk.slice(pos);

      let initialLen = 0;
      const initMatch = remainingBase.match(MANDARIN_INITIAL_REGEX);
      if (initMatch) {
        const afterInit = remainingBase.slice(initMatch[0].length);
        if (MANDARIN_FINAL_REGEX.test(afterInit)) {
          initialLen = initMatch[0].length;
        }
      }

      const afterInitialBase = remainingBase.slice(initialLen);
      const finalMatch = afterInitialBase.match(MANDARIN_FINAL_REGEX);

      if (finalMatch) {
        let sylLen = initialLen + finalMatch[0].length;
        // Ensure a single syllable never spans across two distinct tone-marked vowels
        let toneMarkCount = 0;
        for (let i = 0; i < sylLen; i++) {
          const origCh = remainingOrig[i]?.toLowerCase();
          if (TONE_VOWEL_MAP[origCh] && TONE_VOWEL_MAP[origCh].tone !== 5) {
            toneMarkCount++;
            if (toneMarkCount > 1) {
              sylLen = i;
              break;
            }
          }
        }

        // Consume optional trailing tone number [0-5]
        if (sylLen < remainingBase.length && /[0-5]/.test(remainingBase[sylLen])) {
          sylLen += 1;
        }

        syllables.push(remainingOrig.slice(0, sylLen));
        pos += sylLen;
      } else {
        // Fallback if non-standard character sequence is encountered
        const fallbackMatch = remainingBase.match(MANDARIN_SYLLABLE_REGEX);
        if (fallbackMatch && fallbackMatch[0].length > 0) {
          syllables.push(remainingOrig.slice(0, fallbackMatch[0].length));
          pos += fallbackMatch[0].length;
        } else {
          syllables.push(remainingOrig);
          break;
        }
      }
    }
  }

  return syllables.filter(Boolean);
}

export function convertPinyinToNumeric(pinyin = '') {
  const tokens = segmentMandarinPinyin(pinyin);

  return tokens
    .map((rawTok) => {
      const tok = rawTok.toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
      const trailingDigit = tok.match(/([0-5])$/);
      if (trailingDigit) {
        const toneNum = trailingDigit[1] === '0' ? '5' : trailingDigit[1];
        const basePart = tok
          .slice(0, -1)
          .split('')
          .map((ch) => (TONE_VOWEL_MAP[ch] ? TONE_VOWEL_MAP[ch].base : ch))
          .join('');
        return `${basePart}${toneNum}`;
      }
      let detectedTone = 5;
      const baseChars = tok.split('').map((ch) => {
        if (TONE_VOWEL_MAP[ch]) {
          if (TONE_VOWEL_MAP[ch].tone !== 5) {
            detectedTone = TONE_VOWEL_MAP[ch].tone;
          }
          return TONE_VOWEL_MAP[ch].base;
        }
        return ch;
      });
      return `${baseChars.join('')}${detectedTone}`;
    })
    .join(' ');
}

export function parsePinyinSyllablesWithTones(pinyin = '', hanzi = '') {
  const tokens = segmentMandarinPinyin(pinyin);

  return tokens.map((syl, idx) => {
    let tone = 5;
    for (const ch of syl) {
      const lower = ch.toLowerCase();
      if (TONE_VOWEL_MAP[lower] && TONE_VOWEL_MAP[lower].tone !== 5) {
        tone = TONE_VOWEL_MAP[lower].tone;
        break;
      }
    }
    const numMatch = syl.match(/([0-5])/);
    if (numMatch) {
      const parsedNum = Number(numMatch[1]);
      tone = parsedNum === 0 ? 5 : parsedNum;
    }
    return {
      syllable: syl,
      tone,
      char: hanzi[idx] || ''
    };
  });
}

// ============================================================================
// WORD ENTRY NORMALIZER, DICTATION CHECKER, SPEECH SIMILARITY & SENTENCE PUZZLE
// ============================================================================
export function normalizeWordEntry(raw = {}, idx = 0) {
  const hanzi = String(raw.hanzi || raw.simplified || '你好').trim();
  const builtInMatch = UNIT_1_WORDS.find((u) => u.hanzi === hanzi);
  if (builtInMatch && !raw.example && !raw.meaning) {
    return builtInMatch;
  }

  const chars = Array.from(hanzi).filter((ch) => /[\u4e00-\u9fff]/.test(ch));
  const pinyin = String(raw.pinyin || builtInMatch?.pinyin || hanzi).trim();
  const pinyinNum = String(
    raw.pinyinNum || builtInMatch?.pinyinNum || convertPinyinToNumeric(pinyin)
  ).trim();
  const meaning = String(
    raw.meaning || raw.english || builtInMatch?.meaning || 'Mandarin vocabulary'
  ).trim();

  const rawExample = String(raw.example || builtInMatch?.example || '').trim();
  let exampleHanzi = raw.exampleHanzi || builtInMatch?.exampleHanzi || '';
  let exampleEnglish = raw.exampleEnglish || builtInMatch?.exampleEnglish || '';

  if (rawExample.includes('—')) {
    const parts = rawExample.split('—');
    exampleHanzi = exampleHanzi || parts[0].trim();
    exampleEnglish = exampleEnglish || parts.slice(1).join(' — ').trim();
  } else if (rawExample) {
    exampleHanzi = exampleHanzi || rawExample;
    exampleEnglish = exampleEnglish || meaning;
  } else {
    exampleHanzi = exampleHanzi || `${hanzi}！`;
    exampleEnglish = exampleEnglish || meaning;
  }

  const finalExample = `${exampleHanzi} — ${exampleEnglish}`;

  return {
    id: raw.id || builtInMatch?.id || `word_${hanzi}_${idx}`,
    hanzi,
    chars: chars.length > 0 ? chars : Array.from(hanzi),
    pinyin,
    pinyinNum,
    pinyinNumeric: raw.pinyinNumeric || builtInMatch?.pinyinNumeric || [pinyinNum],
    pinyinToneless: stripToneMarks(pinyin),
    homophones: raw.homophones || builtInMatch?.homophones || chars,
    toneNote: raw.toneNote || builtInMatch?.toneNote || `Pinyin: ${pinyin}`,
    meaning,
    english: meaning,
    literal: raw.literal || builtInMatch?.literal || `Characters: ${chars.join(' + ')}`,
    example: finalExample,
    exampleHanzi,
    examplePinyin: raw.examplePinyin || builtInMatch?.examplePinyin || pinyin,
    exampleEnglish,
    usageTip:
      raw.usageTip ||
      builtInMatch?.usageTip ||
      `Practice writing and pronouncing "${hanzi}" (${pinyin}).`
  };
}

const CITATION_TONE_BY_CHAR = {
  谢: 4,
  妈: 1,
  爸: 4,
  哥: 1,
  姐: 3,
  弟: 4,
  妹: 4,
  友: 3,
  欢: 1,
  道: 4,
  生: 1,
  上: 4,
  子: 3,
  们: 2,
  候: 4,
  服: 2,
  亮: 4,
  气: 4,
  思: 1,
  西: 1,
  系: 4,
  识: 2,
  字: 4,
  什: 2,
  么: 5
};

function parsePinyinToBaseAndToneList(input = '') {
  const segs = segmentMandarinPinyin(input);
  return segs
    .map((rawSyl) => {
      const lower = rawSyl.toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
      let tone = 5;
      for (const ch of lower) {
        if (TONE_VOWEL_MAP[ch] && TONE_VOWEL_MAP[ch].tone !== 5) {
          tone = TONE_VOWEL_MAP[ch].tone;
          break;
        }
      }
      const digitMatch = lower.match(/([0-5])/);
      if (digitMatch) {
        const d = Number(digitMatch[1]);
        tone = d === 0 ? 5 : d;
      }
      const base = lower
        .split('')
        .map((ch) => (TONE_VOWEL_MAP[ch] ? TONE_VOWEL_MAP[ch].base : ch))
        .join('')
        .replace(/[0-5'’\s\p{P}]/gu, '');
      return { base, tone };
    })
    .filter((item) => item.base.length > 0);
}

function isPhonologicallyEquivalentPinyin(userSyls, targetSyls, hanziChars = []) {
  if (!userSyls.length || userSyls.length !== targetSyls.length) return false;
  for (let i = 0; i < userSyls.length; i++) {
    if (userSyls[i].base !== targetSyls[i].base) return false;
  }

  const n = targetSyls.length;
  // Build allowed tones per syllable position first, plus sandhi sequence combinations
  const allowedTonesAtPos = targetSyls.map((s, idx) => {
    const set = new Set([s.tone]);
    const ch = hanziChars[idx];

    // Neutral-tone / final-syllable / reduplication flexibility
    if (idx === n - 1 && n >= 2) {
      set.add(5); // Always allow neutral tone (5 / 0 / unmarked) on the final syllable of multi-syllable words
      if (targetSyls[idx].base === targetSyls[idx - 1].base) {
        // Reduplicated word (e.g. 谢谢 xie4xie4 / xie4xie5, 妈妈 ma1ma1 / ma1ma5)
        set.add(targetSyls[idx - 1].tone);
      }
      if (ch && CITATION_TONE_BY_CHAR[ch]) {
        set.add(CITATION_TONE_BY_CHAR[ch]);
      }
    }

    // 不 (bù) sandhi flexibility: accept citation tone 4 and sandhi tone 2
    if (s.base === 'bu' || ch === '不') {
      set.add(4);
      set.add(2);
    }

    // 一 (yī) sandhi flexibility: accept citation tone 1 and sandhi tones 2 and 4
    if (s.base === 'yi' || ch === '一') {
      set.add(1);
      set.add(2);
      set.add(4);
    }

    return set;
  });

  // Also allow 3rd-tone sandhi (3 + 3 -> 2 + 3) on any adjacent 3rd-tone syllables
  for (let i = 0; i < n - 1; i++) {
    const nextAllows3 = allowedTonesAtPos[i + 1].has(3);
    if (allowedTonesAtPos[i].has(3) && nextAllows3) {
      allowedTonesAtPos[i].add(2);
    }
  }

  for (let i = 0; i < n; i++) {
    if (!allowedTonesAtPos[i].has(userSyls[i].tone)) {
      return false;
    }
  }

  return true;
}

export function validateDictationInput(
  userInput = '',
  targetWord = UNIT_1_WORDS[0],
  subMode = 'pinyin',
  _masteryLevel = 0
) {
  const raw = String(userInput || '').trim();
  if (!raw) {
    return {
      isValid: false,
      matchType: 'Empty',
      feedback: 'Type your answer above and press Check.'
    };
  }

  const cleanUserHanzi = raw.replace(/[\s\p{P}]/gu, '');
  const cleanTargetHanzi = String(targetWord.hanzi || '').replace(/[\s\p{P}]/gu, '');
  if (cleanUserHanzi && cleanTargetHanzi && cleanUserHanzi === cleanTargetHanzi) {
    return {
      isValid: true,
      matchType: 'Exact Hanzi',
      feedback: `${targetWord.hanzi} (${targetWord.pinyin}) — ${targetWord.meaning}`
    };
  }

  if (subMode === 'hanzi') {
    return {
      isValid: false,
      matchType: 'Mismatch',
      feedback: `Expected "${targetWord.hanzi}" (${targetWord.pinyin}).`
    };
  }

  // Mandatory Tones Check in Pinyin mode: require either diacritic tone marks or numeric tone digits
  const hasToneMark = Array.from(raw).some((ch) => {
    const entry = TONE_VOWEL_MAP[ch.toLowerCase()];
    return Boolean(entry && entry.tone !== 5);
  });
  const hasToneNumber = /[0-5]/.test(raw);

  if (!hasToneMark && !hasToneNumber) {
    return {
      isValid: false,
      matchType: 'Tones Required',
      feedback:
        'Tones are required! Include tone marks (e.g. nǐ hǎo) or tone numbers (e.g. ni3 hao3).'
    };
  }

  const normalizeKeepTones = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/u:/g, 'ü')
      .replace(/v/g, 'ü')
      .replace(/['’\s\p{P}]/gu, '');

  const userToneMarked = normalizeKeepTones(raw);
  const targetToneMarked = normalizeKeepTones(targetWord.pinyin);

  if (userToneMarked === targetToneMarked) {
    return {
      isValid: true,
      matchType: 'Tone-Marked Pinyin',
      feedback: `Spot on! ${targetWord.hanzi} (${targetWord.pinyin}) — ${targetWord.meaning}`
    };
  }

  const userSyls = parsePinyinToBaseAndToneList(raw);
  const hanziChars = Array.from(cleanTargetHanzi);
  const candidateStrings = [
    targetWord.pinyin,
    targetWord.pinyinNum,
    ...(targetWord.pinyinNumeric || [])
  ].filter(Boolean);

  for (const cand of candidateStrings) {
    const targetSyls = parsePinyinToBaseAndToneList(cand);
    if (isPhonologicallyEquivalentPinyin(userSyls, targetSyls, hanziChars)) {
      return {
        isValid: true,
        matchType: hasToneMark ? 'Tone-Marked Pinyin' : 'Numbered Pinyin',
        feedback: `Correct tones! ${targetWord.hanzi} (${targetWord.pinyin}) — ${targetWord.meaning}`
      };
    }
  }

  const userToneless = stripToneMarks(raw);
  const targetToneless = stripToneMarks(targetWord.pinyin);

  if (userToneless && userToneless === targetToneless) {
    return {
      isValid: false,
      matchType: 'Tone Mismatch',
      feedback: `Check your tones! Expected "${targetWord.pinyin}" (${targetWord.pinyinNum}) for ${targetWord.hanzi}.`
    };
  }

  return {
    isValid: false,
    matchType: 'Incorrect',
    feedback: `Expected "${targetWord.pinyin}" (${targetWord.pinyinNum}) for ${targetWord.hanzi}.`
  };
}

export function computeSpeechSimilarity(transcript = '', targetWord = UNIT_1_WORDS[0]) {
  const cleanTranscript = String(transcript || '').replace(/[\s\p{P}]/gu, '');
  const cleanTarget = String(targetWord.hanzi || '').replace(/[\s\p{P}]/gu, '');

  if (!cleanTranscript) {
    return {
      score: 0,
      matchedText: '',
      feedback: 'No speech detected. Try speaking closer to the microphone.'
    };
  }

  if (cleanTranscript.includes(cleanTarget)) {
    return {
      score: 100,
      matchedText: cleanTranscript,
      feedback: `Native-level match! Recognized "${targetWord.hanzi}" (${targetWord.pinyin}).`
    };
  }

  const targetChars = Array.from(cleanTarget);
  const homophonePool = new Set([...targetChars, ...(targetWord.homophones || [])]);
  let exactHits = 0;
  let homophoneHits = 0;

  targetChars.forEach((ch) => {
    if (cleanTranscript.includes(ch)) {
      exactHits += 1;
    }
  });

  Array.from(cleanTranscript).forEach((spokenCh) => {
    if (homophonePool.has(spokenCh)) {
      homophoneHits += 1;
    }
  });

  if (exactHits > 0) {
    const ratio = Math.min(95, Math.round((exactHits / targetChars.length) * 90) + 10);
    return {
      score: ratio,
      matchedText: cleanTranscript,
      feedback: `Good pronunciation! Matched ${exactHits}/${targetChars.length} character(s) of ${targetWord.hanzi}.`
    };
  }

  if (homophoneHits > 0) {
    return {
      score: 75,
      matchedText: cleanTranscript,
      feedback: `Close syllable match ("${cleanTranscript}")! Watch the tone contour on ${targetWord.pinyin}.`
    };
  }

  return {
    score: 25,
    matchedText: cleanTranscript,
    feedback: `Heard "${cleanTranscript}". Listen to ${targetWord.hanzi} (${targetWord.pinyin}) and try again!`
  };
}

export function buildSentenceBuilderPuzzle(word = UNIT_1_WORDS[0]) {
  const norm = normalizeWordEntry(word);
  const rawHanzi = String(
    norm.example?.includes('—')
      ? norm.example.split('—')[0].trim()
      : norm.exampleHanzi || `${norm.hanzi}！`
  ).trim();

  const cleanSentence = rawHanzi.replace(/[，。！？、；：“”‘’!?,.\s]/g, '');

  const tokens = [];
  let cursor = 0;
  while (cursor < cleanSentence.length) {
    if (cleanSentence.slice(cursor).startsWith(norm.hanzi)) {
      tokens.push(norm.hanzi);
      cursor += norm.hanzi.length;
    } else {
      const remaining = cleanSentence.length - cursor;
      const nextTargetIdx = cleanSentence.indexOf(norm.hanzi, cursor);
      const maxStep =
        nextTargetIdx > cursor ? Math.min(2, nextTargetIdx - cursor) : Math.min(2, remaining);
      const step = remaining === 3 && nextTargetIdx === -1 ? 1 : maxStep;
      tokens.push(cleanSentence.slice(cursor, cursor + step));
      cursor += step;
    }
  }

  const deriveTilePinyin = (tileText) => {
    if (tileText === norm.hanzi) return norm.pinyin;
    const matchWord = UNIT_1_WORDS.find((u) => u.hanzi === tileText);
    if (matchWord?.pinyin) return matchWord.pinyin;
    const charPinyins = Array.from(tileText)
      .map((ch) => KNOWN_CHARACTER_INFO[ch]?.pinyin || '')
      .filter(Boolean);
    if (charPinyins.length === Array.from(tileText).length) {
      return charPinyins.join(' ');
    }
    return '';
  };

  const baseTiles = tokens.map((text, idx) => ({
    tileId: `tile_${idx}_${text}`,
    text,
    pinyin: deriveTilePinyin(text),
    correctIndex: idx
  }));

  const shuffledTiles = [...baseTiles];
  if (shuffledTiles.length > 1) {
    shuffledTiles.reverse();
    if (shuffledTiles.length >= 3) {
      const first = shuffledTiles.shift();
      shuffledTiles.push(first);
    }
  }

  return {
    targetHanziSentence: rawHanzi,
    cleanSentence,
    englishTranslation: norm.exampleEnglish || norm.meaning,
    pinyinHint: norm.examplePinyin || norm.pinyin,
    correctTokens: tokens,
    shuffledTiles
  };
}

// ============================================================================
// FILL-IN-THE-BLANK (选词填空 CLOZE) & TONE SANDHI EAR DRILL (声调辨析) HELPERS
// ============================================================================
export const FALLBACK_CLOZE_DISTRACTORS = [
  ...UNIT_1_WORDS,
  normalizeWordEntry({
    id: 'cloze_pengyou',
    hanzi: '朋友',
    pinyin: 'péngyou',
    pinyinNum: 'peng2 you5',
    meaning: 'friend / companion',
    example: '他是我的好朋友。 — He is my good friend.'
  }),
  normalizeWordEntry({
    id: 'cloze_xuexi',
    hanzi: '学习',
    pinyin: 'xuéxí',
    pinyinNum: 'xue2 xi2',
    meaning: 'to study / to learn',
    example: '我每天学习中文。 — I study Chinese every day.'
  })
];

export const SUPPLEMENTAL_BLITZ_WORDS = [
  ...UNIT_1_WORDS,
  normalizeWordEntry({
    id: 'blitz_pengyou',
    hanzi: '朋友',
    pinyin: 'péngyou',
    meaning: 'Friend / Companion'
  })
];

export function buildClozeExerciseData(targetWord = UNIT_1_WORDS[0], lessonPool = UNIT_1_WORDS, seed = 0) {
  const normTarget = normalizeWordEntry(targetWord, seed);

  const rawExample = String(normTarget.example || '').trim();
  const mandarinPart = rawExample.includes('—')
    ? rawExample.split('—')[0].trim()
    : normTarget.exampleHanzi || `${normTarget.hanzi}！`;

  const englishPart = rawExample.includes('—')
    ? rawExample.split('—').slice(1).join(' — ').trim()
    : normTarget.exampleEnglish || normTarget.meaning;

  const blankSentence = mandarinPart.includes(normTarget.hanzi)
    ? mandarinPart.replace(normTarget.hanzi, '[ ___ ]')
    : `[ ___ ]，${mandarinPart}`;

  const combinedPool = [...(Array.isArray(lessonPool) ? lessonPool : []), ...FALLBACK_CLOZE_DISTRACTORS];
  const distractors = [];
  for (let i = 0; i < combinedPool.length && distractors.length < 3; i++) {
    const candidate = normalizeWordEntry(combinedPool[(i + seed) % combinedPool.length], i);
    if (
      candidate.hanzi !== normTarget.hanzi &&
      !distractors.some((d) => d.hanzi === candidate.hanzi)
    ) {
      distractors.push(candidate);
    }
  }

  const rawOptions = [
    {
      id: `cloze_opt_correct_${normTarget.hanzi}`,
      hanzi: normTarget.hanzi,
      pinyin: normTarget.pinyin,
      meaning: (normTarget.meaning || normTarget.english || '').split(/[;/]/)[0].trim(),
      isCorrect: true
    },
    ...distractors.slice(0, 3).map((d, idx) => ({
      id: `cloze_opt_d_${idx}_${d.hanzi}`,
      hanzi: d.hanzi,
      pinyin: d.pinyin,
      meaning: (d.meaning || d.english || '').split(/[;/]/)[0].trim(),
      isCorrect: false
    }))
  ];

  const shift = (seed + normTarget.hanzi.charCodeAt(0)) % rawOptions.length;
  const options = rawOptions.map((_, idx) => rawOptions[(idx + shift) % rawOptions.length]);

  return {
    mandarinSentence: mandarinPart,
    blankSentence,
    englishSentence: englishPart,
    pinyinSentence: normTarget.examplePinyin || normTarget.pinyin,
    targetWord: normTarget,
    options
  };
}

export function formatToneName(t) {
  if (t === 1) return '1st';
  if (t === 2) return '2nd';
  if (t === 3) return '3rd';
  if (t === 4) return '4th';
  return 'Neutral';
}

export function deriveWordTonePattern(word = UNIT_1_WORDS[0]) {
  const norm = normalizeWordEntry(word);
  const numSource = String(norm.pinyinNum || convertPinyinToNumeric(norm.pinyin)).trim();
  const tokens = segmentMandarinPinyin(numSource);

  let tones = tokens.map((tok) => {
    const m = tok.match(/[1-5]/);
    return m ? Number(m[0]) : 5;
  });

  if (tones.length === 0) {
    const parsed = parsePinyinSyllablesWithTones(norm.pinyin, norm.hanzi);
    tones = parsed.map((s) => s.tone || 5);
  }

  let has33Sandhi = false;
  for (let i = 0; i < tones.length - 1; i++) {
    if (tones[i] === 3 && tones[i + 1] === 3) {
      has33Sandhi = true;
      break;
    }
  }

  let hasBuSandhi = false;
  let hasYiSandhi = false;
  const syllables = parsePinyinSyllablesWithTones(norm.pinyin, norm.hanzi);
  for (let i = 0; i < syllables.length - 1; i++) {
    const cleanSyl = stripToneMarks(syllables[i].syllable);
    if ((norm.hanzi.includes('不') || cleanSyl === 'bu') && tones[i + 1] === 4) {
      hasBuSandhi = true;
    }
    if ((norm.hanzi.includes('一') || cleanSyl === 'yi') && tones[i + 1] === 4) {
      hasYiSandhi = true;
    }
  }

  let label = '';
  let detailNote = '';

  if (has33Sandhi && tones.length === 2) {
    label = '2nd + 3rd (Sandhi from 3+3)';
    detailNote = '3rd + 3rd tone sandhi: first syllable rises like a 2nd tone (3+3 → 2+3).';
  } else if (has33Sandhi) {
    const spokenTones = tones.map((t, idx) => (t === 3 && tones[idx + 1] === 3 ? 2 : t));
    label = `${spokenTones.map(formatToneName).join(' + ')} (Sandhi from ${tones.join('+')})`;
    detailNote = 'Consecutive 3rd tones trigger 3+3 → 2+3 tone sandhi.';
  } else if (hasBuSandhi) {
    label = '2nd + 4th (不 Sandhi: 4+4 → 2+4)';
    detailNote = '不 (bù) shifts to 2nd tone (bú) before a 4th-tone syllable.';
  } else if (hasYiSandhi) {
    label = '2nd + 4th (一 Sandhi: 1+4 → 2+4)';
    detailNote = '一 (yī) shifts to 2nd tone (yí) before a 4th-tone syllable.';
  } else {
    label = tones.map(formatToneName).join(' + ');
    detailNote = `Standard citation tones (${norm.pinyinNum || norm.pinyin}) with no sandhi shift.`;
  }

  return {
    tones,
    label,
    detailNote,
    isSandhi: has33Sandhi || hasBuSandhi || hasYiSandhi
  };
}

export function buildToneSandhiOptions(word = UNIT_1_WORDS[0], seed = 0) {
  const correctPattern = deriveWordTonePattern(word);
  const distractorLabels = [
    '2nd + 3rd (Sandhi from 3+3)',
    '4th + Neutral',
    '4th + 4th',
    '1st + 4th',
    '2nd + 1st',
    '3rd + 4th',
    '1st + 2nd',
    '2nd + 4th (不 Sandhi: 4+4 → 2+4)',
    '1st + Neutral'
  ].filter((lbl) => lbl !== correctPattern.label);

  const chosenDistractors = [];
  for (let i = 0; i < distractorLabels.length && chosenDistractors.length < 3; i++) {
    const pick = distractorLabels[(i + seed) % distractorLabels.length];
    if (!chosenDistractors.includes(pick)) {
      chosenDistractors.push(pick);
    }
  }

  const rawChoices = [
    { id: 'tone_correct', label: correctPattern.label, isCorrect: true },
    ...chosenDistractors.map((lbl, idx) => ({
      id: `tone_dist_${idx}`,
      label: lbl,
      isCorrect: false
    }))
  ];

  const shift = (seed + (word.hanzi?.charCodeAt(0) || 0)) % rawChoices.length;
  return {
    correctPattern,
    choices: rawChoices.map((_, i) => rawChoices[(i + shift) % rawChoices.length])
  };
}

export function buildHskMockExamQuestions(unlockedWords = UNIT_1_WORDS) {
  const basePool =
    Array.isArray(unlockedWords) && unlockedWords.length > 0
      ? unlockedWords.map((w, idx) => normalizeWordEntry(w, idx))
      : UNIT_1_WORDS;

  const distractorPool = [...basePool, ...FALLBACK_CLOZE_DISTRACTORS];
  const shuffledSource = [...basePool].sort(() => Math.random() - 0.5);

  const pickDistractors = (targetWord, count = 3, seed = 0) => {
    const picked = [];
    for (let i = 0; i < distractorPool.length && picked.length < count; i++) {
      const cand = normalizeWordEntry(
        distractorPool[(i + seed) % distractorPool.length],
        i
      );
      if (
        cand.hanzi !== targetWord.hanzi &&
        !picked.some((p) => p.hanzi === cand.hanzi)
      ) {
        picked.push(cand);
      }
    }
    return picked;
  };

  const questions = [];

  // Part I: 10 Listening Questions (1–10)
  for (let i = 0; i < 10; i++) {
    const word = normalizeWordEntry(
      shuffledSource[i % shuffledSource.length],
      i
    );
    const distractors = pickDistractors(word, 3, i * 3 + 1);
    const isSentenceListening = i % 2 === 1;

    const rawOptions = isSentenceListening
      ? [
          {
            id: `listen_${i}_correct`,
            label: `${word.hanzi} (${word.pinyin}) — ${
              (word.meaning || word.english).split(/[;/]/)[0]
            }`,
            isCorrect: true
          },
          ...distractors.map((d, dIdx) => ({
            id: `listen_${i}_d_${dIdx}`,
            label: `${d.hanzi} (${d.pinyin}) — ${
              (d.meaning || d.english).split(/[;/]/)[0]
            }`,
            isCorrect: false
          }))
        ]
      : [
          {
            id: `listen_${i}_correct`,
            label: `${word.meaning || word.english} (${word.pinyin})`,
            isCorrect: true
          },
          ...distractors.map((d, dIdx) => ({
            id: `listen_${i}_d_${dIdx}`,
            label: `${d.meaning || d.english} (${d.pinyin})`,
            isCorrect: false
          }))
        ];

    const shift = (i + word.hanzi.charCodeAt(0)) % rawOptions.length;
    const options = rawOptions.map(
      (_, idx) => rawOptions[(idx + shift) % rawOptions.length]
    );
    const correctOption = options.find((o) => o.isCorrect) || options[0];

    questions.push({
      qNumber: i + 1,
      section: 'Listening',
      subType: isSentenceListening ? 'Sentence Audio Match' : 'Word Audio Comprehension',
      word,
      audioText: isSentenceListening
        ? word.exampleHanzi || word.hanzi
        : word.hanzi,
      prompt: isSentenceListening
        ? 'Listen to the spoken Mandarin sentence and select the matching vocabulary item:'
        : 'Listen to the spoken Mandarin word and choose the correct meaning & Pinyin:',
      displayPromptHanzi: null,
      displayPromptSub: isSentenceListening
        ? 'Audio Prompt: Spoken Mandarin Sentence'
        : 'Audio Prompt: Spoken Mandarin Vocabulary',
      options,
      correctOptionId: correctOption.id,
      correctAnswerText: `${word.hanzi} (${word.pinyin}) — ${word.meaning || word.english}`
    });
  }

  // Part II: 10 Reading / Cloze Questions (11–20)
  for (let j = 0; j < 10; j++) {
    const qNum = j + 11;
    const word = normalizeWordEntry(
      shuffledSource[(j + 2) % shuffledSource.length],
      j + 10
    );
    const isCloze = j % 2 === 0;

    if (isCloze) {
      const cloze = buildClozeExerciseData(word, basePool, j + 5);
      const options = cloze.options.map((opt) => ({
        id: `read_${qNum}_${opt.id}`,
        label: `${opt.hanzi} (${opt.pinyin})`,
        isCorrect: opt.isCorrect
      }));
      const correctOption = options.find((o) => o.isCorrect) || options[0];

      questions.push({
        qNumber: qNum,
        section: 'Reading',
        subType: 'Cloze Sentence (选词填空)',
        word,
        audioText: cloze.mandarinSentence,
        prompt: 'Choose the best Mandarin word to complete the sentence blank [ ___ ]:',
        displayPromptHanzi: cloze.blankSentence,
        displayPromptSub: `"${cloze.englishSentence}"`,
        options,
        correctOptionId: correctOption.id,
        correctAnswerText: `${word.hanzi} (${word.pinyin}) in "${cloze.mandarinSentence}"`
      });
    } else {
      const distractors = pickDistractors(word, 3, j * 5 + 2);
      const rawOptions = [
        {
          id: `read_${qNum}_correct`,
          label: `${word.pinyin} — ${word.meaning || word.english}`,
          isCorrect: true
        },
        ...distractors.map((d, dIdx) => ({
          id: `read_${qNum}_d_${dIdx}`,
          label: `${d.pinyin} — ${d.meaning || d.english}`,
          isCorrect: false
        }))
      ];
      const shift = (j + word.hanzi.charCodeAt(0)) % rawOptions.length;
      const options = rawOptions.map(
        (_, idx) => rawOptions[(idx + shift) % rawOptions.length]
      );
      const correctOption = options.find((o) => o.isCorrect) || options[0];

      questions.push({
        qNumber: qNum,
        section: 'Reading',
        subType: 'Hanzi Reading Comprehension',
        word,
        audioText: word.hanzi,
        prompt: 'Select the correct Pinyin and English meaning for this character/word:',
        displayPromptHanzi: word.hanzi,
        displayPromptSub: `Context: ${word.exampleHanzi || word.hanzi}`,
        options,
        correctOptionId: correctOption.id,
        correctAnswerText: `${word.hanzi} (${word.pinyin}) — ${word.meaning || word.english}`
      });
    }
  }

  return questions;
}

export const MAX_WORD_MASTERY = 10;

export function getWordMasteryLevel(masteryMap = {}, word = {}) {
  if (!word) return 0;
  const byId = masteryMap[word.id];
  const byHanzi = masteryMap[word.hanzi];
  const val = typeof byId === 'number' ? byId : typeof byHanzi === 'number' ? byHanzi : 0;
  return Math.max(0, Math.min(MAX_WORD_MASTERY, val));
}

export function getMasteryTierMeta(level = 0) {
  const lv = Math.max(0, Math.min(MAX_WORD_MASTERY, Number(level) || 0));
  if (lv >= 9) {
    return {
      level: lv,
      tier: 'Grandmaster',
      shortTier: 'Grandmaster',
      isMastered: true,
      isGrandmaster: true,
      textClass: 'text-amber-300',
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
      barClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400',
      segmentFilledClass: 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.55)]',
      tileClass:
        'bg-gradient-to-br from-amber-400/30 via-yellow-500/25 to-emerald-600/30 border-yellow-300 text-amber-100 shadow-lg shadow-amber-500/15'
    };
  }
  if (lv >= 7) {
    return {
      level: lv,
      tier: 'Scholar',
      shortTier: 'Scholar',
      isMastered: lv >= 8,
      isGrandmaster: false,
      textClass: 'text-emerald-300',
      badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
      barClass: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      segmentFilledClass: 'bg-emerald-400',
      tileClass:
        'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 shadow-md shadow-emerald-950/50'
    };
  }
  if (lv >= 5) {
    return {
      level: lv,
      tier: 'Adept',
      shortTier: 'Adept',
      isMastered: false,
      isGrandmaster: false,
      textClass: 'text-sky-300',
      badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/60',
      barClass: 'bg-gradient-to-r from-sky-500 to-cyan-400',
      segmentFilledClass: 'bg-sky-400',
      tileClass:
        'bg-sky-500/20 border-sky-400/60 text-sky-100 shadow-md shadow-sky-950/50'
    };
  }
  if (lv >= 3) {
    return {
      level: lv,
      tier: 'Apprentice',
      shortTier: 'Apprentice',
      isMastered: false,
      isGrandmaster: false,
      textClass: 'text-indigo-300',
      badgeClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/60',
      barClass: 'bg-gradient-to-r from-indigo-500 to-sky-400',
      segmentFilledClass: 'bg-indigo-400',
      tileClass:
        'bg-indigo-500/20 border-indigo-400/60 text-indigo-100 shadow-md shadow-indigo-950/50'
    };
  }
  if (lv >= 1) {
    return {
      level: lv,
      tier: 'Novice',
      shortTier: 'Novice',
      isMastered: false,
      isGrandmaster: false,
      textClass: 'text-amber-300',
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
      barClass: 'bg-gradient-to-r from-amber-500 to-orange-400',
      segmentFilledClass: 'bg-amber-400',
      tileClass:
        'bg-amber-500/20 border-amber-400/60 text-amber-100 shadow-md shadow-amber-950/50'
    };
  }
  return {
    level: 0,
    tier: 'Unseen',
    shortTier: 'Unseen',
    isMastered: false,
    isGrandmaster: false,
    textClass: 'text-slate-400',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    barClass: 'bg-slate-700',
    segmentFilledClass: 'bg-slate-600',
    tileClass: 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
  };
}

export function getAdaptiveWritingConfig(masteryLv = 0) {
  const lv = Math.max(0, Math.min(10, Math.round(Number(masteryLv) || 0)));
  if (lv >= 7) {
    return {
      initialStage: 3,
      minStage: 3,
      stagesCount: 1,
      isBlindRecall: true,
      hidePinyin: true,
      hideHanzi: true,
      badgeLabel: 'Lv.7+ Blind Recall'
    };
  }
  if (lv >= 4) {
    return {
      initialStage: 2,
      minStage: 2,
      stagesCount: 2,
      isBlindRecall: false,
      hidePinyin: true,
      hideHanzi: false,
      badgeLabel: 'Lv.4–6 Skip Guided (2-Stage)'
    };
  }
  return {
    initialStage: 1,
    minStage: 1,
    stagesCount: 3,
    isBlindRecall: false,
    hidePinyin: false,
    hideHanzi: false,
    badgeLabel: null
  };
}

export function getPreferredModalitiesForMastery(masteryLv = 0) {
  const lv = Math.max(0, Math.min(10, Math.round(Number(masteryLv) || 0)));
  if (lv >= 7) {
    return ['sentence_builder', 'cloze', 'writing'];
  }
  if (lv >= 4) {
    return ['writing', 'speaking'];
  }
  return ['recognition', 'listening'];
}

export function formatSessionClock(seconds = 0) {
  const safeSecs = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSecs / 60);
  const secs = safeSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTotalStudyTime(totalSeconds = 0) {
  const safeSecs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (safeSecs === 0) return '0 min';
  const totalMins = Math.max(1, Math.round(safeSecs / 60));
  if (totalMins >= 60) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  }
  return `${totalMins} min`;
}

export function formatTodayStudyTime(dailySeconds = 0) {
  const safeSecs = Math.max(0, Math.floor(Number(dailySeconds) || 0));
  if (safeSecs === 0) return '0 min today';
  const mins = Math.max(1, Math.round(safeSecs / 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m today`;
  }
  return `${mins} min today`;
}

export function useSessionTimer(isActive = true, onFlush = undefined) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const unflushedSecondsRef = useRef(0);
  const onFlushRef = useRef(onFlush);

  useEffect(() => {
    onFlushRef.current = onFlush;
  }, [onFlush]);

  useEffect(() => {
    if (!isActive) return;
    const intervalId = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      unflushedSecondsRef.current += 1;
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isActive]);

  const flushSessionTime = useCallback(() => {
    const delta = unflushedSecondsRef.current;
    unflushedSecondsRef.current = 0;
    if (delta > 0 && typeof onFlushRef.current === 'function') {
      onFlushRef.current(delta);
    }
    return delta;
  }, []);

  useEffect(() => {
    return () => {
      const delta = unflushedSecondsRef.current;
      unflushedSecondsRef.current = 0;
      if (delta > 0 && typeof onFlushRef.current === 'function') {
        onFlushRef.current(delta);
      }
    };
  }, []);

  return {
    elapsedSeconds,
    formattedClock: formatSessionClock(elapsedSeconds),
    flushSessionTime
  };
}

export function getWordSkillTelemetry(telemetryMap = {}, word = {}) {
  const key = word?.hanzi || word?.id || 'default';
  const entry = telemetryMap[key] || telemetryMap[word?.id] || {};
  return {
    recognition: {
      mistakes: entry.recognition?.mistakes || 0,
      completions: entry.recognition?.completions || 0
    },
    writing: {
      mistakes: entry.writing?.mistakes || 0,
      completions: entry.writing?.completions || 0
    },
    listening: {
      mistakes: entry.listening?.mistakes || 0,
      completions: entry.listening?.completions || 0
    },
    speaking: {
      mistakes: entry.speaking?.mistakes || 0,
      completions: entry.speaking?.completions || 0
    },
    sentence_builder: {
      mistakes: entry.sentence_builder?.mistakes || 0,
      completions: entry.sentence_builder?.completions || 0
    },
    cloze: {
      mistakes: entry.cloze?.mistakes || 0,
      completions: entry.cloze?.completions || 0
    }
  };
}

export function computeUnlockedWordsPool(courses = [], activeCourse = null, activeLesson = null, progress = {}) {
  const wordMap = new window.Map();

  courses.forEach((course) => {
    const lessons = course.lessons || [];
    lessons.forEach((lesson, lIdx) => {
      const lessonKey = `${course.id}__${lesson.id}`;
      const lp = progress.lessonProgress?.[lessonKey];

      const prevLesson = lIdx > 0 ? lessons[lIdx - 1] : null;
      const prevLessonKey = prevLesson ? `${course.id}__${prevLesson.id}` : null;
      const prevLessonCompleted =
        prevLessonKey &&
        progress.lessonProgress?.[prevLessonKey]?.completedStages?.includes(4);

      const isDefaultUnit1 =
        course.id === 'course_default_unit1' && lesson.id === 'lesson_unit_1';
      const hasDefaultProgress =
        isDefaultUnit1 &&
        ((progress.unlockedStage || 1) > 1 || (progress.completedStages?.length || 0) > 0);

      const isUnlockedOrStarted =
        (course.id === activeCourse?.id && lIdx === 0) ||
        lesson.id === activeLesson?.id ||
        hasDefaultProgress ||
        prevLessonCompleted ||
        Boolean(
          lp &&
            ((lp.unlockedStage || 1) > 1 ||
              (Array.isArray(lp.completedStages) && lp.completedStages.length > 0))
        );

      if (isUnlockedOrStarted) {
        (lesson.words || []).forEach((w, wIdx) => {
          const norm = normalizeWordEntry(w, wIdx);
          if (norm.hanzi && !wordMap.has(norm.hanzi)) {
            wordMap.set(norm.hanzi, norm);
          }
        });
      }
    });
  });

  courses.forEach((course) => {
    (course.lessons || []).forEach((lesson) => {
      (lesson.words || []).forEach((w, wIdx) => {
        const norm = normalizeWordEntry(w, wIdx);
        if (norm.hanzi && getWordMasteryLevel(progress.mastery, norm) >= 1) {
          wordMap.set(norm.hanzi, norm);
        }
      });
    });
  });

  const defaultUnitKey = 'course_default_unit1__lesson_unit_1';
  const defaultUnitDone =
    (progress.completedStages || []).includes(4) ||
    (progress.lessonProgress?.[defaultUnitKey]?.completedStages || []).includes(4);

  const wordsArray = Array.from(wordMap.values());
  const effectiveCount = defaultUnitDone
    ? Math.max(12, wordsArray.length)
    : wordsArray.length;

  return {
    unlockedWords: wordsArray,
    unlockedWordsCount: effectiveCount
  };
}

export function hashDateSeed(dateStr = '') {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function generateDeterministicDailyQuests(dateStr = '', unlockedWordsCount = 3) {
  const candidatePool = [
    {
      id: 'quest_smart_review',
      modeKey: 'smart_review',
      title: 'Finish a Smart Review session',
      xpReward: 25,
      badge: 'Smart Review',
      minWords: 0
    },
    {
      id: 'quest_flashcards',
      modeKey: 'flashcards',
      title: 'Complete 1 Flashcards Discovery run',
      xpReward: 20,
      badge: 'Discovery',
      minWords: 0
    },
    {
      id: 'quest_writing',
      modeKey: 'writing',
      title: 'Complete 1 Stroke Writing session',
      xpReward: 25,
      badge: 'Calligraphy',
      minWords: 0
    },
    {
      id: 'quest_dictation',
      modeKey: 'dictation',
      title: 'Finish 1 Listening Dictation drill',
      xpReward: 25,
      badge: 'Ear Training',
      minWords: 0
    },
    {
      id: 'quest_sentence_builder',
      modeKey: 'sentence_builder',
      title: 'Complete 1 Sentence Builder puzzle',
      xpReward: 30,
      badge: '12+ Words Mode',
      minWords: ADVANCED_MODE_UNLOCK_THRESHOLDS.sentence_builder
    },
    {
      id: 'quest_tone_drill',
      modeKey: 'tone_sandhi_drill',
      title: 'Complete 1 Tone & Sandhi Drill',
      xpReward: 30,
      badge: '12+ Words Mode',
      minWords: ADVANCED_MODE_UNLOCK_THRESHOLDS.tone_sandhi_drill
    },
    {
      id: 'quest_cloze',
      modeKey: 'cloze',
      title: 'Finish 1 Fill-in-the-Blank (Cloze) drill',
      xpReward: 30,
      badge: '25+ Words Mode',
      minWords: ADVANCED_MODE_UNLOCK_THRESHOLDS.cloze
    },
    {
      id: 'quest_blitz',
      modeKey: 'blitz_match',
      title: 'Win a 60s Blitz round',
      xpReward: 35,
      badge: '25+ Words Mode',
      minWords: ADVANCED_MODE_UNLOCK_THRESHOLDS.blitz_match
    },
    {
      id: 'quest_hsk_mock',
      modeKey: 'hsk_mock_exam',
      title: 'Complete an HSK Mock Exam',
      xpReward: 35,
      badge: '40+ Words Mode',
      minWords: ADVANCED_MODE_UNLOCK_THRESHOLDS.hsk_mock_exam
    }
  ];

  const eligible = candidatePool.filter((q) => unlockedWordsCount >= q.minWords);
  const seed = hashDateSeed(dateStr || '2026-11-13');

  const poolCopy = [...eligible];
  for (let i = poolCopy.length - 1; i > 0; i--) {
    const j = (seed + i * 31) % (i + 1);
    const temp = poolCopy[i];
    poolCopy[i] = poolCopy[j];
    poolCopy[j] = temp;
  }

  return poolCopy.slice(0, 3);
}

export function partitionLessonWordsIntoChunks(lessonWords = UNIT_1_WORDS) {
  const normalized = (Array.isArray(lessonWords) && lessonWords.length > 0
    ? lessonWords
    : UNIT_1_WORDS
  ).map((w, idx) => normalizeWordEntry(w, idx));

  if (normalized.length <= 4) {
    return [normalized];
  }

  const chunks = [];
  let i = 0;
  while (i < normalized.length) {
    const remaining = normalized.length - i;
    if (remaining <= 4) {
      chunks.push(normalized.slice(i));
      break;
    } else if (remaining === 5 || remaining === 6 || remaining === 9) {
      chunks.push(normalized.slice(i, i + 3));
      i += 3;
    } else {
      chunks.push(normalized.slice(i, i + 4));
      i += 4;
    }
  }
  return chunks;
}

export function buildProportionalUnitNodes(lessonWords = UNIT_1_WORDS) {
  const allNormalized = (Array.isArray(lessonWords) && lessonWords.length > 0
    ? lessonWords
    : UNIT_1_WORDS
  ).map((w, idx) => normalizeWordEntry(w, idx));

  const chunks = partitionLessonWordsIntoChunks(allNormalized);
  const totalChunks = chunks.length;
  const hasMultipleChunks = totalChunks > 1;
  const nodes = [];
  let nextNodeId = 1;

  chunks.forEach((chunkWords, chunkIdx) => {
    const partLabel = hasMultipleChunks ? ` (Part ${chunkIdx + 1}/${totalChunks})` : '';
    const shortPartBadge = hasMultipleChunks ? `Part ${chunkIdx + 1} • ` : 'Single-Skill • ';
    const chunkHanziPreview = chunkWords.map((w) => w.hanzi).join(' · ');

    // 1. Discovery (3D Flashcards for this chunk)
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Discovery${partLabel}`,
      shortTitle: `${nextNodeId}. Discovery`,
      subtitle: `3D Flashcards (${chunkHanziPreview})`,
      description: `Explore Hanzi, Pinyin pitch contours, and context sentences for ${chunkHanziPreview}.`,
      iconName: 'Layers',
      accentColor: 'from-rose-500 to-red-600',
      nodeCategory: 'single',
      badgeText: `${shortPartBadge}Cards`,
      xpReward: 15,
      launchType: 'flashcards',
      allowedModalities: ['recognition'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // 2. Calligraphy (3-Stage Stroke Writing for this chunk)
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Calligraphy${partLabel}`,
      shortTitle: `${nextNodeId}. Calligraphy`,
      subtitle: `3-Stage Stroke Writing (${chunkHanziPreview})`,
      description: `Master stroke order through Guided, Ghost Trace, and Memory stages for ${chunkHanziPreview}.`,
      iconName: 'PenTool',
      accentColor: 'from-amber-500 to-orange-600',
      nodeCategory: 'single',
      badgeText: `${shortPartBadge}3-Stage Write`,
      xpReward: 25,
      launchType: 'writing',
      allowedModalities: ['writing'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // 3. Audio & Oral Mix (Listening Dictation + Speaking for this chunk)
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Audio & Oral Mix${partLabel}`,
      shortTitle: `${nextNodeId}. Audio & Oral Mix`,
      subtitle: `Listening Dictation + Speaking (${chunkHanziPreview})`,
      description: `Interleaves native listening dictation and pronunciation for ${chunkHanziPreview}.`,
      iconName: 'Headphones',
      accentColor: 'from-emerald-500 to-teal-600',
      nodeCategory: 'mix',
      badgeText: hasMultipleChunks ? `Part ${chunkIdx + 1} • Audio Mix` : 'Multi-Skill Mix',
      xpReward: 25,
      launchType: 'mixed',
      allowedModalities: ['listening', 'speaking'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // 4. If lesson has 6+ words, add a Context Gauntlet node after every second chunk
    if (allNormalized.length >= 6 && (chunkIdx + 1) % 2 === 0) {
      const prevChunkWords = chunks[chunkIdx - 1] || [];
      const gauntletWords = [...prevChunkWords, ...chunkWords];
      const gauntletPreview = gauntletWords
        .slice(0, 5)
        .map((w) => w.hanzi)
        .join(' · ');

      nodes.push({
        id: nextNodeId,
        title: `Stage ${nextNodeId} • Context Gauntlet`,
        shortTitle: `${nextNodeId}. Context Gauntlet`,
        subtitle: `Sentence Builder + Cloze (${gauntletPreview}${gauntletWords.length > 5 ? '...' : ''})`,
        description: `Synthesize grammar and sentence context across ${gauntletWords.length} unit words.`,
        iconName: 'Flame',
        accentColor: 'from-fuchsia-600 to-rose-600',
        nodeCategory: 'gauntlet',
        badgeText: 'Context Gauntlet • Cloze & Order',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: ['sentence_builder', 'cloze'],
        words: gauntletWords,
        chunkIndex: chunkIdx
      });
      nextNodeId += 1;
    }
  });

  // Final Node: Unit Boss Battle covering the entire lesson
  nodes.push({
    id: nextNodeId,
    title: `Stage ${nextNodeId} • Unit Boss Battle`,
    shortTitle: `${nextNodeId}. Unit Boss`,
    subtitle: `Jade Dragon Guardian Battle (${allNormalized.length} Words • 15s Timer)`,
    description: 'Deplete the Boss HP bar before your 3 hearts or 15-second turn clock run out!',
    iconName: 'Trophy',
    accentColor: 'from-purple-600 to-indigo-700',
    nodeCategory: 'boss',
    badgeText: 'Boss Battle',
    xpReward: 45,
    launchType: 'boss',
    allowedModalities: ['recognition', 'listening'],
    words: allNormalized,
    chunkIndex: totalChunks
  });

  return nodes;
}

export function buildDynamicModalityQueue(
  words = UNIT_1_WORDS,
  allowedModalities = ['recognition'],
  badgeText = 'Dynamic Mix',
  lessonIndex = 0
) {
  const baseModes =
    Array.isArray(allowedModalities) && allowedModalities.length > 0
      ? [...allowedModalities]
      : ['recognition'];

  if (lessonIndex >= 2 && baseModes.length > 1 && !baseModes.includes('cloze')) {
    baseModes.push('cloze');
  }
  const modes = baseModes;

  const targetSteps = Math.max(words.length, Math.min(6, words.length * 2));
  const queue = [];

  for (let i = 0; i < targetSteps; i++) {
    const word = normalizeWordEntry(words[i % words.length], i);
    const prev1 = queue.length >= 1 ? queue[queue.length - 1].modality : null;
    const prev2 = queue.length >= 2 ? queue[queue.length - 2].modality : null;

    const candidates = modes.filter((m) => !(m === prev1 && m === prev2));
    const poolToPick = candidates.length > 0 ? candidates : modes;
    const chosenModality = poolToPick[(i + Math.floor(Math.random() * poolToPick.length)) % poolToPick.length];

    queue.push({
      stepId: `mix_${word.id}_${chosenModality}_${i}`,
      word,
      modality: chosenModality,
      reason: `${badgeText} • ${MODALITY_META[chosenModality]?.label || chosenModality}`
    });
  }

  return queue;
}

export function buildBossQuestionsForWords(words = UNIT_1_WORDS) {
  const normalizedPool = (words.length > 0 ? words : UNIT_1_WORDS).map((w, idx) =>
    normalizeWordEntry(w, idx)
  );
  const fallbackPool = [
    ...normalizedPool,
    ...UNIT_1_WORDS.filter((u) => !normalizedPool.some((p) => p.hanzi === u.hanzi))
  ];

  const questions = [];

  normalizedPool.forEach((word, idx) => {
    const distractors = fallbackPool.filter((w) => w.hanzi !== word.hanzi);
    const d1 = distractors[idx % distractors.length] || UNIT_1_WORDS[1];
    const d2 = distractors[(idx + 1) % distractors.length] || UNIT_1_WORDS[2];

    const meaningOpts = [
      { id: `${word.id}_m_correct`, text: word.meaning || word.english, isCorrect: true },
      { id: `${word.id}_m_d1`, text: d1.meaning || d1.english, isCorrect: false },
      { id: `${word.id}_m_d2`, text: d2.meaning || d2.english, isCorrect: false }
    ];
    const rotatedMeaningOpts = meaningOpts.map(
      (_, oIdx) => meaningOpts[(oIdx + idx) % meaningOpts.length]
    );

    questions.push({
      id: `boss_q_meaning_${word.id}_${idx}`,
      wordId: word.id,
      prompt: 'Select the correct English meaning for this Mandarin word:',
      focusHanzi: word.hanzi,
      focusPinyin: word.pinyin,
      speechText: word.hanzi,
      explanation: `${word.hanzi} (${word.pinyin}) means "${word.meaning || word.english}".`,
      options: rotatedMeaningOpts
    });

    const pinyinOpts = [
      {
        id: `${word.id}_p_correct`,
        text: `${word.pinyin} — "${(word.meaning || word.english).split(/[;/]/)[0]}"`,
        isCorrect: true
      },
      {
        id: `${word.id}_p_d1`,
        text: `${d1.pinyin} — "${(d1.meaning || d1.english).split(/[;/]/)[0]}"`,
        isCorrect: false
      },
      {
        id: `${word.id}_p_d2`,
        text: `${d2.pinyin} — "${(d2.meaning || d2.english).split(/[;/]/)[0]}"`,
        isCorrect: false
      }
    ];
    const rotatedPinyinOpts = pinyinOpts.map(
      (_, oIdx) => pinyinOpts[(oIdx + idx + 1) % pinyinOpts.length]
    );

    questions.push({
      id: `boss_q_pinyin_${word.id}_${idx}`,
      wordId: word.id,
      prompt: `Which Pinyin & meaning matches "${word.hanzi}" in "${word.exampleHanzi}"?`,
      focusHanzi: word.hanzi,
      focusPinyin: 'Listen & Identify Pinyin',
      speechText: word.exampleHanzi || word.hanzi,
      explanation: `${word.exampleHanzi} (${word.examplePinyin}) — "${word.exampleEnglish}"`,
      options: rotatedPinyinOpts
    });
  });

  return questions.slice(0, 6);
}

export function highlightRadicalOutlineStrokes(containerEl, radStrokes = [], shouldHighlight = true) {
  if (!containerEl || !Array.isArray(radStrokes) || radStrokes.length === 0) return;
  try {
    const svgPaths = containerEl.querySelectorAll('svg path');
    radStrokes.forEach((strokeIdx) => {
      const targetPath = svgPaths[strokeIdx];
      if (targetPath) {
        targetPath.style.stroke = shouldHighlight ? '#dc2626' : '';
        targetPath.style.fill = shouldHighlight ? '#dc2626' : '';
        targetPath.style.opacity = shouldHighlight ? '0.68' : '';
      }
    });
  } catch (e) {
    // Ignore DOM query issues
  }
}

export function getWritingStageMeta(stageNum = 1) {
  return (
    WRITING_MASTERY_STAGES.find((s) => s.stage === stageNum) ||
    WRITING_MASTERY_STAGES[0]
  );
}

let hanziWriterLoadPromise = null;

export function loadHanziWriterScript() {
  if (typeof window !== 'undefined' && window['HanziWriter']) {
    return Promise.resolve(window['HanziWriter']);
  }
  if (hanziWriterLoadPromise) {
    return hanziWriterLoadPromise;
  }

  hanziWriterLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${HANZI_WRITER_CDN}"]`);
    if (existingScript) {
      if (window['HanziWriter']) {
        resolve(window['HanziWriter']);
        return;
      }
      existingScript.addEventListener('load', () => resolve(window['HanziWriter']));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = HANZI_WRITER_CDN;
    script.async = true;
    script.onload = () => {
      if (window['HanziWriter']) {
        resolve(window['HanziWriter']);
      } else {
        reject(new Error('HanziWriter loaded but global object was not found.'));
      }
    };
    script.onerror = () => {
      hanziWriterLoadPromise = null;
      reject(new Error('Failed to load hanzi-writer from CDN.'));
    };
    document.head.appendChild(script);
  });

  return hanziWriterLoadPromise;
}
