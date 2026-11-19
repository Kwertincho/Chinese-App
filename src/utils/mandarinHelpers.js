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
    },
    classifier_drill: {
      mistakes: entry.classifier_drill?.mistakes || 0,
      completions: entry.classifier_drill?.completions || 0
    },
    dialogue_qa: {
      mistakes: entry.dialogue_qa?.mistakes || 0,
      completions: entry.dialogue_qa?.completions || 0
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

  const chunkSize = 3;
  const chunks = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }
  return chunks.length > 0 ? chunks : [normalized];
}

export function collectPastLessonWords(activeCourse, activeLessonIndex = 0, currentWords = []) {
  if (!activeCourse || !Array.isArray(activeCourse.lessons) || activeLessonIndex < 1) {
    return [];
  }
  const currentHanziSet = new Set(
    (Array.isArray(currentWords) ? currentWords : []).map((w) => w?.hanzi).filter(Boolean)
  );
  const seenHanzi = new Set();
  const pastPool = [];

  for (let lIdx = 0; lIdx < activeLessonIndex; lIdx++) {
    const lesson = activeCourse.lessons[lIdx];
    if (!lesson || !Array.isArray(lesson.words)) continue;
    lesson.words.forEach((rawWord, wIdx) => {
      const norm = normalizeWordEntry(rawWord, wIdx);
      if (norm.hanzi && !currentHanziSet.has(norm.hanzi) && !seenHanzi.has(norm.hanzi)) {
        seenHanzi.add(norm.hanzi);
        pastPool.push({
          ...norm,
          pastLessonTitle: lesson.title || `Lesson ${lIdx + 1}`
        });
      }
    });
  }
  return pastPool;
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
    const partLabel = hasMultipleChunks ? ` (Group ${chunkIdx + 1}/${totalChunks})` : '';
    const shortPartBadge = hasMultipleChunks ? `Group ${chunkIdx + 1} • ` : 'Micro-Group • ';
    const chunkHanziPreview = chunkWords.map((w) => w.hanzi).join(' · ');

    // Node A — Discovery (flashcards): 2-tap 3D flashcards for this 3-word group
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Discovery${partLabel}`,
      shortTitle: `${nextNodeId}. Discovery`,
      subtitle: `2-Tap 3D Flashcards (${chunkHanziPreview})`,
      description: `Explore Hanzi, Pinyin pitch contours, and context sentences for ${chunkHanziPreview}.`,
      iconName: 'Layers',
      accentColor: 'from-rose-500 to-red-600',
      nodeCategory: 'single',
      badgeText: `${shortPartBadge}3D Cards`,
      xpReward: 15,
      launchType: 'flashcards',
      allowedModalities: ['recognition'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // Node B — Meaning Quiz (meaning_mc): Dedicated 4-option Multiple-Choice quiz
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Meaning Quiz${partLabel}`,
      shortTitle: `${nextNodeId}. Meaning Quiz`,
      subtitle: `4-Option Meaning & Pinyin Quiz (${chunkHanziPreview})`,
      description: `Test Hanzi ↔ English Meaning & Pinyin comprehension for ${chunkHanziPreview} with adaptive Pinyin visibility.`,
      iconName: 'Target',
      accentColor: 'from-indigo-500 to-blue-600',
      nodeCategory: 'single',
      badgeText: `${shortPartBadge}Meaning Quiz`,
      xpReward: 20,
      launchType: 'meaning_mc',
      allowedModalities: ['meaning_mc'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // Node C — Calligraphy (writing): Adaptive stroke-order writing (HanziWriter)
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Calligraphy${partLabel}`,
      shortTitle: `${nextNodeId}. Calligraphy`,
      subtitle: `Adaptive Stroke Writing (${chunkHanziPreview})`,
      description: `Master stroke order through Guided, Ghost Trace, and Memory stages for ${chunkHanziPreview}.`,
      iconName: 'PenTool',
      accentColor: 'from-amber-500 to-orange-600',
      nodeCategory: 'single',
      badgeText: `${shortPartBadge}Stroke Write`,
      xpReward: 25,
      launchType: 'writing',
      allowedModalities: ['writing'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // Node D — Skill Mix (mixed): Interleaved Listening Dictation, Speaking, Cloze (选词填空), and Sentence Builder
    nodes.push({
      id: nextNodeId,
      title: `Stage ${nextNodeId} • Skill Mix${partLabel}`,
      shortTitle: `${nextNodeId}. Skill Mix`,
      subtitle: `Listening, Speaking, Cloze & Sentence (${chunkHanziPreview})`,
      description: `Interleaves Listening Dictation, Speaking, Cloze (选词填空), and Sentence Builder for ${chunkHanziPreview}.`,
      iconName: 'Headphones',
      accentColor: 'from-emerald-500 to-teal-600',
      nodeCategory: 'mix',
      badgeText: `${shortPartBadge}Skill Mix`,
      xpReward: 25,
      launchType: 'mixed',
      allowedModalities: ['listening', 'speaking', 'cloze', 'sentence_builder'],
      words: chunkWords,
      chunkIndex: chunkIdx
    });
    nextNodeId += 1;

    // Every 2 micro-groups (6 words), insert an intermediate Checkpoint Gauntlet node
    if ((chunkIdx + 1) % 2 === 0 && allNormalized.length >= 6) {
      const prevChunkWords = chunks[chunkIdx - 1] || [];
      const gauntletWords = [...prevChunkWords, ...chunkWords];
      const gauntletPreview = gauntletWords
        .slice(0, 6)
        .map((w) => w.hanzi)
        .join(' · ');

      nodes.push({
        id: nextNodeId,
        title: `Stage ${nextNodeId} • Checkpoint Gauntlet`,
        shortTitle: `${nextNodeId}. Checkpoint Gauntlet`,
        subtitle: `6-Word Synthesis Gauntlet (${gauntletPreview})`,
        description: `Synthesize meaning, listening, grammar, and sentence context across ${gauntletWords.length} unit words.`,
        iconName: 'Flame',
        accentColor: 'from-fuchsia-600 to-rose-600',
        nodeCategory: 'gauntlet',
        badgeText: 'Checkpoint Gauntlet • Cloze & Order',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: ['meaning_mc', 'listening', 'cloze', 'sentence_builder'],
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
    allowedModalities: ['meaning_mc', 'recognition', 'listening'],
    words: allNormalized,
    chunkIndex: totalChunks
  });

  return nodes;
}

const NON_WRITING_REVIEW_MODALITIES = [
  'meaning_mc',
  'listening',
  'speaking',
  'cloze',
  'sentence_builder',
  'classifier_drill',
  'dialogue_qa'
];

export function getNodeCompletionLevel(lessonProg, stageId) {
  if (!lessonProg || stageId == null) return 0;
  const raw = lessonProg.nodeLevels?.[String(stageId)];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(3, Math.floor(raw)));
  }
  if (Array.isArray(lessonProg.completedStages) && lessonProg.completedStages.includes(stageId)) {
    return 3;
  }
  return 0;
}

export function migrateLessonProgressNodeLevels(
  lessonProgressMap = {},
  legacyCompletedStages = [],
  defaultLessonKey = 'course_default_unit1__lesson_unit_1'
) {
  const nextMap = {};
  Object.entries(lessonProgressMap || {}).forEach(([lessonKey, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const completed = Array.isArray(entry.completedStages) ? [...entry.completedStages] : [];
    const existingLevels =
      entry.nodeLevels && typeof entry.nodeLevels === 'object' ? { ...entry.nodeLevels } : {};
    completed.forEach((sid) => {
      const keyStr = String(sid);
      if (typeof existingLevels[keyStr] !== 'number') {
        existingLevels[keyStr] = 3;
      }
    });
    nextMap[lessonKey] = {
      unlockedStage: entry.unlockedStage || 1,
      completedStages: completed,
      nodeLevels: existingLevels
    };
  });

  if (Array.isArray(legacyCompletedStages) && legacyCompletedStages.length > 0) {
    const defEntry = nextMap[defaultLessonKey] || {
      unlockedStage: 1,
      completedStages: [],
      nodeLevels: {}
    };
    legacyCompletedStages.forEach((sid) => {
      const keyStr = String(sid);
      if (typeof defEntry.nodeLevels[keyStr] !== 'number') {
        defEntry.nodeLevels[keyStr] = 3;
      }
      if (!defEntry.completedStages.includes(sid)) {
        defEntry.completedStages.push(sid);
      }
    });
    nextMap[defaultLessonKey] = defEntry;
  }

  return nextMap;
}

export function computeNodeLevelXpMultiplier(currentNodeLevel = 0) {
  // Run 1 (0 -> 1): base XP (1.0x)
  // Run 2 (1 -> 2): +25% bonus XP (1.25x)
  // Run 3 (2 -> 3 MAX) & MAX replays: +50% bonus XP (1.5x)
  const lv = Math.max(0, Math.min(3, Math.floor(Number(currentNodeLevel) || 0)));
  if (lv >= 2) return 1.5;
  if (lv === 1) return 1.25;
  return 1.0;
}

export function buildDynamicModalityQueue(
  words = UNIT_1_WORDS,
  allowedModalities = ['recognition'],
  badgeText = 'Dynamic Mix',
  lessonIndex = 0,
  pastLessonWords = [],
  nodeLevel = 0,
  unlockedWordsPool = []
) {
  const safeWords =
    Array.isArray(words) && words.length > 0 ? words : UNIT_1_WORDS;
  const baseModes =
    Array.isArray(allowedModalities) && allowedModalities.length > 0
      ? [...allowedModalities]
      : ['recognition'];

  const effectiveUnlockedPool =
    Array.isArray(unlockedWordsPool) && unlockedWordsPool.length > 0
      ? unlockedWordsPool
      : [...safeWords, ...(Array.isArray(pastLessonWords) ? pastLessonWords : [])];

  const classifierGate = getClassifierDrillUnlockStatus(effectiveUnlockedPool);
  const dialogueGate = getDialogueQaUnlockStatus(effectiveUnlockedPool);

  // Strictly enforce minimum vocabulary gates if classifier_drill / dialogue_qa were requested
  const gatedModes = baseModes.filter((m) => {
    if (m === 'classifier_drill') return classifierGate.unlocked;
    if (m === 'dialogue_qa') return dialogueGate.unlocked;
    return true;
  });

  if (lessonIndex >= 2 && gatedModes.length > 1 && !gatedModes.includes('cloze')) {
    gatedModes.push('cloze');
  }
  const modes = gatedModes.length > 0 ? gatedModes : ['recognition'];
  const isMixedMultiSkillNode =
    modes.length > 1 && !modes.every((m) => m === 'writing');

  // Inject strictly-gated Measure Words (量词) & Conversational Q&A (问答) into mixed nodes
  if (isMixedMultiSkillNode && classifierGate.unlocked && !modes.includes('classifier_drill')) {
    modes.push('classifier_drill');
  }
  if (isMixedMultiSkillNode && dialogueGate.unlocked && !modes.includes('dialogue_qa')) {
    modes.push('dialogue_qa');
  }

  // Guarantee thorough per-word practice: at least 2 passes across a 3-word group (6 items)
  const targetSteps = Math.max(safeWords.length * 2, Math.min(8, safeWords.length * 2));
  const coreQueue = [];
  let classifierCursor = 0;
  let dialogueCursor = 0;

  for (let i = 0; i < targetSteps; i++) {
    const word = normalizeWordEntry(safeWords[i % safeWords.length], i);
    const prev1 = coreQueue.length >= 1 ? coreQueue[coreQueue.length - 1].modality : null;
    const prev2 = coreQueue.length >= 2 ? coreQueue[coreQueue.length - 2].modality : null;

    const candidates = modes.filter((m) => !(m === prev1 && m === prev2));
    const poolToPick = candidates.length > 0 ? candidates : modes;
    let chosenModality = poolToPick[i % poolToPick.length];
    let classifierItem = null;
    let dialoguePair = null;
    let stepWord = word;

    if (chosenModality === 'classifier_drill') {
      if (classifierGate.unlocked && classifierGate.items.length > 0) {
        classifierItem =
          classifierGate.items[classifierCursor % classifierGate.items.length];
        classifierCursor += 1;
        stepWord = classifierItem.sourceWord || word;
      } else {
        chosenModality = 'meaning_mc';
      }
    } else if (chosenModality === 'dialogue_qa') {
      if (dialogueGate.unlocked && dialogueGate.pairs.length > 0) {
        dialoguePair =
          dialogueGate.pairs[dialogueCursor % dialogueGate.pairs.length];
        dialogueCursor += 1;
        stepWord = dialoguePair.sourceWord || word;
      } else {
        chosenModality = 'meaning_mc';
      }
    }

    coreQueue.push({
      stepId: `mix_${stepWord.id}_${chosenModality}_${i}`,
      word: stepWord,
      modality: chosenModality,
      classifierItem,
      dialoguePair,
      isPastLessonReview: false,
      reason: `${badgeText} • ${MODALITY_META[chosenModality]?.label || chosenModality}`
    });
  }

  // Sporadic Spiral Review of Past Lessons (Strictly Excluding Writing)
  // Run 2+ (nodeLevel >= 1) adds +1 past-lesson review item (strictly excluding writing)
  const hasOnlyWriting = modes.every((m) => m === 'writing');
  if (
    lessonIndex >= 1 &&
    !hasOnlyWriting &&
    Array.isArray(pastLessonWords) &&
    pastLessonWords.length > 0
  ) {
    // Strictly exclude 'writing' from allowed review modalities; include dialogue_qa when unlocked
    const validReviewModes = modes
      .map((m) => (m === 'recognition' ? 'meaning_mc' : m))
      .filter((m) => m !== 'writing' && NON_WRITING_REVIEW_MODALITIES.includes(m));
    if (dialogueGate.unlocked && !validReviewModes.includes('dialogue_qa')) {
      validReviewModes.push('dialogue_qa');
    }
    const reviewModePool =
      validReviewModes.length > 0 ? validReviewModes : ['meaning_mc', 'listening', 'cloze'];

    // ~20% of the node's question queue (1 to 2 review items) + 1 extra item on Run 2/3 (nodeLevel >= 1)
    const baseReviewCount = coreQueue.length >= 6 ? 2 : 1;
    const extraNodeLevelReview = nodeLevel >= 1 ? 1 : 0;
    const reviewCount = Math.min(
      pastLessonWords.length,
      baseReviewCount + extraNodeLevelReview
    );

    // Pick distinct past-lesson words
    const shuffledPast = [...pastLessonWords].sort(() => Math.random() - 0.5);
    const selectedReviewWords = shuffledPast.slice(0, reviewCount);
    const insertSlots = [2, 5, 7];

    selectedReviewWords.forEach((revWord, rIdx) => {
      const normalizedRev = normalizeWordEntry(revWord, 100 + rIdx);
      // Strictly never 'writing'
      const chosenReviewModality =
        reviewModePool[(rIdx + Math.floor(Math.random() * reviewModePool.length)) % reviewModePool.length];
      let safeReviewModality =
        chosenReviewModality === 'writing' ? 'meaning_mc' : chosenReviewModality;
      let revClassifierItem = null;
      let revDialoguePair = null;
      let revStepWord = normalizedRev;

      if (safeReviewModality === 'dialogue_qa') {
        if (dialogueGate.unlocked && dialogueGate.pairs.length > 0) {
          revDialoguePair =
            dialogueGate.pairs[(dialogueCursor + rIdx) % dialogueGate.pairs.length];
          revStepWord = revDialoguePair.sourceWord || normalizedRev;
        } else {
          safeReviewModality = 'meaning_mc';
        }
      } else if (safeReviewModality === 'classifier_drill') {
        if (classifierGate.unlocked && classifierGate.items.length > 0) {
          revClassifierItem =
            classifierGate.items[(classifierCursor + rIdx) % classifierGate.items.length];
          revStepWord = revClassifierItem.sourceWord || normalizedRev;
        } else {
          safeReviewModality = 'meaning_mc';
        }
      }

      const reviewItem = {
        stepId: `spiral_review_${revStepWord.id}_${safeReviewModality}_${rIdx}`,
        word: revStepWord,
        modality: safeReviewModality,
        classifierItem: revClassifierItem,
        dialoguePair: revDialoguePair,
        isPastLessonReview: true,
        reviewBadge: 'Past Lesson Review',
        reason: `Past Lesson Review • ${MODALITY_META[safeReviewModality]?.label || safeReviewModality}`
      };

      const insertAt = Math.min(coreQueue.length, insertSlots[rIdx] ?? coreQueue.length);
      coreQueue.splice(insertAt, 0, reviewItem);
    });
  }

  return coreQueue;
}

export function buildBossQuestionsForWords(
  words = UNIT_1_WORDS,
  pastLessonWords = [],
  nodeLevel = 0
) {
  const normalizedPool = (words.length > 0 ? words : UNIT_1_WORDS).map((w, idx) =>
    normalizeWordEntry(w, idx)
  );
  const normalizedPastPool = (Array.isArray(pastLessonWords) ? pastLessonWords : []).map((w, idx) =>
    normalizeWordEntry(w, 200 + idx)
  );
  const fallbackPool = [
    ...normalizedPool,
    ...normalizedPastPool,
    ...UNIT_1_WORDS.filter(
      (u) =>
        !normalizedPool.some((p) => p.hanzi === u.hanzi) &&
        !normalizedPastPool.some((p) => p.hanzi === u.hanzi)
    )
  ];

  const createQuestionForWord = (word, idx, isPastReview = false, questionType = 'meaning') => {
    const distractors = fallbackPool.filter((w) => w.hanzi !== word.hanzi);
    const d1 = distractors[idx % Math.max(1, distractors.length)] || UNIT_1_WORDS[0];
    const d2 = distractors[(idx + 1) % Math.max(1, distractors.length)] || UNIT_1_WORDS[1];
    const d3 = distractors[(idx + 2) % Math.max(1, distractors.length)] || UNIT_1_WORDS[2];

    if (questionType === 'meaning') {
      const meaningOpts = [
        { id: `${word.id}_m_correct_${idx}`, text: word.meaning || word.english, isCorrect: true },
        { id: `${word.id}_m_d1_${idx}`, text: d1.meaning || d1.english, isCorrect: false },
        { id: `${word.id}_m_d2_${idx}`, text: d2.meaning || d2.english, isCorrect: false },
        { id: `${word.id}_m_d3_${idx}`, text: d3.meaning || d3.english, isCorrect: false }
      ];
      const rotatedMeaningOpts = meaningOpts.map(
        (_, oIdx) => meaningOpts[(oIdx + idx) % meaningOpts.length]
      );

      return {
        id: `boss_q_meaning_${word.id}_${idx}`,
        wordId: word.id,
        questionType: 'meaning',
        optionsHavePinyin: false,
        isPastLessonReview: isPastReview,
        reviewBadge: isPastReview ? 'Past Lesson Review' : null,
        prompt: 'Select the correct English meaning for this Mandarin word:',
        focusHanzi: word.hanzi,
        focusPinyin: word.pinyin,
        speechText: word.hanzi,
        explanation: `${word.hanzi} (${word.pinyin}) means "${word.meaning || word.english}".`,
        options: rotatedMeaningOpts
      };
    }

    const pinyinOpts = [
      {
        id: `${word.id}_p_correct_${idx}`,
        text: `${word.pinyin} — "${(word.meaning || word.english).split(/[;/]/)[0]}"`,
        isCorrect: true
      },
      {
        id: `${word.id}_p_d1_${idx}`,
        text: `${d1.pinyin} — "${(d1.meaning || d1.english).split(/[;/]/)[0]}"`,
        isCorrect: false
      },
      {
        id: `${word.id}_p_d2_${idx}`,
        text: `${d2.pinyin} — "${(d2.meaning || d2.english).split(/[;/]/)[0]}"`,
        isCorrect: false
      },
      {
        id: `${word.id}_p_d3_${idx}`,
        text: `${d3.pinyin} — "${(d3.meaning || d3.english).split(/[;/]/)[0]}"`,
        isCorrect: false
      }
    ];
    const rotatedPinyinOpts = pinyinOpts.map(
      (_, oIdx) => pinyinOpts[(oIdx + idx + 1) % pinyinOpts.length]
    );

    return {
      id: `boss_q_pinyin_${word.id}_${idx}`,
      wordId: word.id,
      questionType: 'pinyin',
      optionsHavePinyin: true,
      isPastLessonReview: isPastReview,
      reviewBadge: isPastReview ? 'Past Lesson Review' : null,
      prompt: `Which Pinyin & meaning matches "${word.hanzi}" in "${word.exampleHanzi}"?`,
      focusHanzi: word.hanzi,
      focusPinyin: 'Identify Pinyin & Meaning',
      speechText: word.exampleHanzi || word.hanzi,
      explanation: `${word.exampleHanzi} (${word.examplePinyin}) — "${word.exampleEnglish}"`,
      options: rotatedPinyinOpts
    };
  };

  const questions = [];

  normalizedPool.forEach((word, idx) => {
    questions.push(createQuestionForWord(word, idx, false, 'meaning'));
    questions.push(createQuestionForWord(word, idx, false, 'pinyin'));
  });

  const baseQuestions = questions.slice(0, 6);

  if (normalizedPastPool.length > 0) {
    const extraReview = nodeLevel >= 1 ? 1 : 0;
    const reviewCount = Math.min(normalizedPastPool.length, 2 + extraReview);
    const shuffledPast = [...normalizedPastPool].sort(() => Math.random() - 0.5);
    const insertSlots = [2, 5, 7];
    shuffledPast.slice(0, reviewCount).forEach((revWord, rIdx) => {
      const qType = rIdx % 2 === 0 ? 'meaning' : 'pinyin';
      const revQ = createQuestionForWord(revWord, 50 + rIdx, true, qType);
      const insertPos = Math.min(baseQuestions.length, insertSlots[rIdx] ?? baseQuestions.length);
      baseQuestions.splice(insertPos, 0, revQ);
    });
  }

  return baseQuestions;
}

/**
 * Global Anti-Spoiler Audio Guardrail
 * Returns true ONLY for passive Discovery flashcards ('flashcards') and pure Listening/Speaking
 * exercises ('listening', 'speaking', 'tone_sandhi_drill', 'hsk_mock_listening').
 * Returns false for reading, context, or word-order exercises ('meaning_mc', 'cloze',
 * 'sentence_builder', 'recognition', 'hsk_mock_reading', and any Boss question whose options
 * contain Pinyin or test visual comprehension).
 */
export function canExposeAudioBeforeAnswer(modality, optionsHavePinyin = false) {
  const normalized = String(modality || '').toLowerCase();
  const audioAllowedModalities = [
    'flashcards',
    'listening',
    'speaking',
    'tone_sandhi_drill',
    'hsk_mock_listening'
  ];

  if (!audioAllowedModalities.includes(normalized)) {
    return false;
  }

  if (
    optionsHavePinyin &&
    normalized !== 'listening' &&
    normalized !== 'hsk_mock_listening' &&
    normalized !== 'tone_sandhi_drill'
  ) {
    return false;
  }

  return true;
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

// ============================================================================
// TEMPORAL SPACED REPETITION (SRS) FORGETTING CURVE HELPERS
// ============================================================================
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const SRS_ACTIVATION_MIN_WORDS = 10;

/**
 * Escalating review intervals (in days) mapped to the 0–10 word mastery scale:
 * - Lv. 0–1: 0 days (immediate review)
 * - Lv. 2–3: 1 day
 * - Lv. 4–5: 3 days
 * - Lv. 6–7: 7 days
 * - Lv. 8–9: 15 days
 * - Lv. 10:  30 days
 */
export function getSrsIntervalDays(masteryLevel = 0) {
  const lv = Math.max(0, Math.min(10, Math.round(Number(masteryLevel) || 0)));
  if (lv <= 1) return 0;
  if (lv <= 3) return 1;
  if (lv <= 5) return 3;
  if (lv <= 7) return 7;
  if (lv <= 9) return 15;
  return 30;
}

export function buildUpdatedSrsEntry(masteryLevel = 0, nowMs = Date.now()) {
  const intervalDays = getSrsIntervalDays(masteryLevel);
  const ts = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  return {
    lastReviewedAt: ts,
    nextReviewAt: ts + intervalDays * MS_PER_DAY,
    intervalDays
  };
}

export function getWordSrsEntry(srsData = {}, word = null) {
  if (!srsData || typeof srsData !== 'object' || !word) return null;
  const byHanzi = word.hanzi ? srsData[word.hanzi] : null;
  const byId = word.id ? srsData[word.id] : null;
  if (byHanzi && byId) {
    return (byHanzi.lastReviewedAt || 0) >= (byId.lastReviewedAt || 0) ? byHanzi : byId;
  }
  return byHanzi || byId || null;
}

export function writeWordSrsEntry(srsMap, word, masteryLevel = 0, nowMs = Date.now()) {
  if (!srsMap || !word) return srsMap;
  const entry = buildUpdatedSrsEntry(masteryLevel, nowMs);
  if (word.hanzi) srsMap[word.hanzi] = entry;
  if (word.id) srsMap[word.id] = entry;
  return srsMap;
}

export function isWordSrsDue(srsData = {}, word = null, masteryLevel = 0, nowMs = Date.now()) {
  if (!word) return false;
  const entry = getWordSrsEntry(srsData, word);
  if (entry && typeof entry.nextReviewAt === 'number') {
    return entry.nextReviewAt <= nowMs;
  }
  // If a word already has Lv. 1+ mastery from prior sessions before SRS was tracked, treat it as due.
  return Number(masteryLevel) >= 1;
}

export function getSrsOverdueMs(srsData = {}, word = null, nowMs = Date.now()) {
  const entry = getWordSrsEntry(srsData, word);
  if (entry && typeof entry.nextReviewAt === 'number') {
    return nowMs - entry.nextReviewAt;
  }
  return 0;
}

/**
 * Counts unique words in wordsList (or masteryMap keys when wordsList is empty)
 * that have reached at least `minLevel` mastery.
 */
export function countWordsAtLeastLevel(masteryMap = {}, wordsList = [], minLevel = 1) {
  const seen = new Set();
  let count = 0;

  if (Array.isArray(wordsList) && wordsList.length > 0) {
    wordsList.forEach((word) => {
      if (!word) return;
      const key = word.hanzi || word.id;
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (getWordMasteryLevel(masteryMap, word) >= minLevel) {
        count += 1;
      }
    });
    return count;
  }

  Object.entries(masteryMap || {}).forEach(([k, v]) => {
    if (/[\u4e00-\u9fff]/.test(k) && Number(v) >= minLevel) {
      count += 1;
    }
  });
  return count;
}

// ============================================================================
// POST-ANSWER INTERACTIVE CHARACTER INSPECTOR RESOLVER
// ============================================================================
/**
 * Resolves a single Chinese character's Pinyin, core English meaning, mastery level,
 * and optional loaded-course context from loaded courseWords + built-in HSK 1 dictionary.
 */
export function resolveCharacterInspectorInfo(
  char,
  { courseWords = [], masteryMap = {} } = {}
) {
  const cleanChar = String(char || '').trim();
  const known = KNOWN_CHARACTER_INFO[cleanChar] || null;
  const normalizedWords = Array.isArray(courseWords) ? courseWords : [];

  // 1. Exact single-character match in loaded courses/decks
  const exactWord = normalizedWords.find((w) => w && w.hanzi === cleanChar) || null;

  // 2. Compound word containing this character in loaded courses/decks
  const containingWord =
    !exactWord
      ? normalizedWords.find(
          (w) => w && typeof w.hanzi === 'string' && w.hanzi.includes(cleanChar)
        ) || null
      : null;

  // Resolve syllable pinyin from containingWord if needed
  let derivedPinyin = '';
  if (exactWord?.pinyin) {
    derivedPinyin = exactWord.pinyin;
  } else if (known?.pinyin) {
    derivedPinyin = known.pinyin;
  } else if (containingWord?.pinyin) {
    const chars = Array.from(containingWord.hanzi).filter((c) => /[\u4e00-\u9fff]/.test(c));
    const idx = chars.indexOf(cleanChar);
    const parsedSyllables = parsePinyinSyllablesWithTones(
      containingWord.pinyin,
      containingWord.hanzi
    );
    if (idx >= 0 && parsedSyllables[idx]?.syllable) {
      derivedPinyin = parsedSyllables[idx].syllable;
    } else {
      derivedPinyin = containingWord.pinyin;
    }
  }

  // Resolve core English meaning (prioritize exact course word -> built-in dictionary -> compound context)
  let meaning = '';
  if (exactWord?.meaning || exactWord?.english) {
    meaning = exactWord.meaning || exactWord.english;
  } else if (known?.meaning) {
    meaning = known.meaning;
  } else if (containingWord) {
    const shortCompMeaning = (containingWord.meaning || containingWord.english || '')
      .split(/[;]/)[0]
      .trim();
    meaning = `Part of ${containingWord.hanzi} (${shortCompMeaning})`;
  } else {
    meaning = 'Mandarin character (tap Listen to hear pronunciation)';
  }

  // Resolve mastery level: direct character mastery -> exactWord -> containingWord
  let masteryLevel = 0;
  if (exactWord) {
    masteryLevel = getWordMasteryLevel(masteryMap, exactWord);
  } else if (masteryMap && typeof masteryMap[cleanChar] === 'number') {
    masteryLevel = Math.max(0, Math.min(10, Math.round(masteryMap[cleanChar])));
  } else if (containingWord) {
    masteryLevel = getWordMasteryLevel(masteryMap, containingWord);
  }

  const tierMeta = getMasteryTierMeta(masteryLevel);

  return {
    char: cleanChar,
    pinyin: derivedPinyin || '—',
    meaning,
    radical: known?.radical || null,
    compoundHint:
      containingWord && !exactWord
        ? `${containingWord.hanzi} (${containingWord.pinyin}) — ${
            (containingWord.meaning || containingWord.english || '').split(/[;]/)[0].trim()
          }`
        : null,
    masteryLevel,
    tierTitle: tierMeta.tier,
    badgeClass: tierMeta.badgeClass
  };
}

// ============================================================================
// MEASURE WORDS / CLASSIFIERS TRAINER (量词 — classifier_drill)
// Strictly gated: unlockedWords.length >= 15 AND >= 3 distinct classifiers attested
// ============================================================================
export const CLASSIFIER_MIN_UNLOCKED_WORDS = 15;
export const CLASSIFIER_MIN_DISTINCT_COUNT = 3;

export const HSK1_CLASSIFIER_CATALOG = {
  个: { pinyin: 'gè', usage: 'general measure word for people & everyday objects' },
  口: { pinyin: 'kǒu', usage: 'members of a household / family' },
  本: { pinyin: 'běn', usage: 'bound books, notebooks & magazines' },
  杯: { pinyin: 'bēi', usage: 'cups, glasses & mugs of beverages' },
  只: { pinyin: 'zhī', usage: 'small animals (cats, dogs, birds) & single items' },
  条: { pinyin: 'tiáo', usage: 'long/flexible things, fish, pants & dogs' },
  件: { pinyin: 'jiàn', usage: 'upper-body garments, clothing & matters' },
  家: { pinyin: 'jiā', usage: 'families, restaurants, hospitals & businesses' },
  位: { pinyin: 'wèi', usage: 'polite measure word for respected people & teachers' },
  张: { pinyin: 'zhāng', usage: 'flat surfaces (tables, chairs, beds, photos, tickets)' },
  块: { pinyin: 'kuài', usage: 'pieces, chunks & yuan currency (钱)' }
};

export const ATTESTED_CLASSIFIER_PHRASES = [
  // 杯 (cups of drinks)
  {
    id: 'clf_bei_cha',
    numberHanzi: '一',
    classifier: '杯',
    acceptedClassifiers: ['杯'],
    nounHanzi: '茶',
    matchTriggers: ['茶', '喝茶'],
    fullPhraseHanzi: '一杯茶',
    fullPhrasePinyin: 'yī bēi chá',
    englishMeaning: 'a cup of tea',
    grammarNote: '杯 (bēi) measures cups or glasses of drinks like tea, water, and coffee.'
  },
  {
    id: 'clf_bei_shui',
    numberHanzi: '一',
    classifier: '杯',
    acceptedClassifiers: ['杯'],
    nounHanzi: '水',
    matchTriggers: ['水', '喝水'],
    fullPhraseHanzi: '一杯水',
    fullPhrasePinyin: 'yī bēi shuǐ',
    englishMeaning: 'a glass of water',
    grammarNote: '杯 (bēi) is used for glasses or cups of water and beverages.'
  },
  {
    id: 'clf_bei_kafei',
    numberHanzi: '两',
    classifier: '杯',
    acceptedClassifiers: ['杯'],
    nounHanzi: '咖啡',
    matchTriggers: ['咖啡'],
    fullPhraseHanzi: '两杯咖啡',
    fullPhrasePinyin: 'liǎng bēi kāfēi',
    englishMeaning: 'two cups of coffee',
    grammarNote: 'Use 两 (liǎng) + 杯 (bēi) for two cups of coffee.'
  },
  // 口 (household / family members)
  {
    id: 'clf_kou_ren',
    numberHanzi: '三',
    classifier: '口',
    acceptedClassifiers: ['口'],
    nounHanzi: '人',
    matchTriggers: ['家', '口', '家人'],
    fullPhraseHanzi: '三口人',
    fullPhrasePinyin: 'sān kǒu rén',
    englishMeaning: 'a family of three people (household members)',
    grammarNote: '口 (kǒu) specifically counts members of a family or household.'
  },
  // 本 (books)
  {
    id: 'clf_ben_shu',
    numberHanzi: '一',
    classifier: '本',
    acceptedClassifiers: ['本'],
    nounHanzi: '书',
    matchTriggers: ['书', '看书', '汉语书'],
    fullPhraseHanzi: '一本书',
    fullPhrasePinyin: 'yī běn shū',
    englishMeaning: 'a book',
    grammarNote: '本 (běn) measures bound volumes such as books, notebooks, and dictionaries.'
  },
  // 只 / 条 (animals & long things)
  {
    id: 'clf_zhi_mao',
    numberHanzi: '一',
    classifier: '只',
    acceptedClassifiers: ['只'],
    nounHanzi: '猫',
    matchTriggers: ['猫', '小猫'],
    fullPhraseHanzi: '一只猫',
    fullPhrasePinyin: 'yī zhī māo',
    englishMeaning: 'a cat',
    grammarNote: '只 (zhī) is the standard classifier for cats and most small animals.'
  },
  {
    id: 'clf_zhi_gou',
    numberHanzi: '一',
    classifier: '只',
    acceptedClassifiers: ['只', '条'],
    nounHanzi: '狗',
    matchTriggers: ['狗', '小狗'],
    fullPhraseHanzi: '一只狗',
    fullPhrasePinyin: 'yī zhī gǒu',
    englishMeaning: 'a dog',
    grammarNote: 'Both 只 (zhī) and 条 (tiáo) are commonly used as classifiers for dogs in Mandarin.'
  },
  {
    id: 'clf_tiao_yu',
    numberHanzi: '一',
    classifier: '条',
    acceptedClassifiers: ['条'],
    nounHanzi: '鱼',
    matchTriggers: ['鱼'],
    fullPhraseHanzi: '一条鱼',
    fullPhrasePinyin: 'yī tiáo yú',
    englishMeaning: 'a fish',
    grammarNote: '条 (tiáo) measures long, slender, or sinuous nouns including fish, rivers, and roads.'
  },
  {
    id: 'clf_tiao_gou_alt',
    numberHanzi: '两',
    classifier: '条',
    acceptedClassifiers: ['条', '只'],
    nounHanzi: '狗',
    matchTriggers: ['狗', '小狗'],
    fullPhraseHanzi: '两条狗',
    fullPhrasePinyin: 'liǎng tiáo gǒu',
    englishMeaning: 'two dogs',
    grammarNote: '条 (tiáo) and 只 (zhī) are both attested classifiers for dogs.'
  },
  {
    id: 'clf_tiao_kuzi',
    numberHanzi: '一',
    classifier: '条',
    acceptedClassifiers: ['条'],
    nounHanzi: '裤子',
    matchTriggers: ['裤子', '裙子', '路'],
    fullPhraseHanzi: '一条裤子',
    fullPhrasePinyin: 'yī tiáo kùzi',
    englishMeaning: 'a pair of pants',
    grammarNote: '条 (tiáo) is used for lower-body garments like pants and skirts.'
  },
  // 件 (clothing & matters)
  {
    id: 'clf_jian_yifu',
    numberHanzi: '一',
    classifier: '件',
    acceptedClassifiers: ['件'],
    nounHanzi: '衣服',
    matchTriggers: ['衣服'],
    fullPhraseHanzi: '一件衣服',
    fullPhrasePinyin: 'yī jiàn yīfu',
    englishMeaning: 'a piece of clothing',
    grammarNote: '件 (jiàn) measures garments/clothes (衣服) as well as matters/events (事情).'
  },
  {
    id: 'clf_jian_shi',
    numberHanzi: '一',
    classifier: '件',
    acceptedClassifiers: ['件'],
    nounHanzi: '事情',
    matchTriggers: ['事情', '事'],
    fullPhraseHanzi: '一件事情',
    fullPhrasePinyin: 'yī jiàn shìqing',
    englishMeaning: 'a matter / affair',
    grammarNote: '件 (jiàn) counts individual matters, tasks, or affairs.'
  },
  // 家 (establishments & businesses)
  {
    id: 'clf_jia_fanguan',
    numberHanzi: '一',
    classifier: '家',
    acceptedClassifiers: ['家'],
    nounHanzi: '饭馆',
    matchTriggers: ['饭馆', '饭店', '餐厅'],
    fullPhraseHanzi: '一家饭馆',
    fullPhrasePinyin: 'yī jiā fànguǎn',
    englishMeaning: 'a restaurant',
    grammarNote: '家 (jiā) measures businesses, shops, restaurants, and hospitals.'
  },
  {
    id: 'clf_jia_yiyuan',
    numberHanzi: '一',
    classifier: '家',
    acceptedClassifiers: ['家'],
    nounHanzi: '医院',
    matchTriggers: ['医院'],
    fullPhraseHanzi: '一家医院',
    fullPhrasePinyin: 'yī jiā yīyuàn',
    englishMeaning: 'a hospital',
    grammarNote: '家 (jiā) is used for institutions and service establishments like hospitals.'
  },
  {
    id: 'clf_jia_shangdian',
    numberHanzi: '一',
    classifier: '家',
    acceptedClassifiers: ['家'],
    nounHanzi: '商店',
    matchTriggers: ['商店'],
    fullPhraseHanzi: '一家商店',
    fullPhrasePinyin: 'yī jiā shāngdiàn',
    englishMeaning: 'a shop / store',
    grammarNote: '家 (jiā) measures shops, stores, and companies.'
  },
  // 位 (polite classifier for people)
  {
    id: 'clf_wei_laoshi',
    numberHanzi: '一',
    classifier: '位',
    acceptedClassifiers: ['位'],
    nounHanzi: '老师',
    matchTriggers: ['老师'],
    fullPhraseHanzi: '一位老师',
    fullPhrasePinyin: 'yī wèi lǎoshī',
    englishMeaning: 'a teacher (polite)',
    grammarNote: '位 (wèi) is the polite, respectful measure word for teachers, guests, and professionals.'
  },
  {
    id: 'clf_wei_yisheng',
    numberHanzi: '一',
    classifier: '位',
    acceptedClassifiers: ['位'],
    nounHanzi: '医生',
    matchTriggers: ['医生'],
    fullPhraseHanzi: '一位医生',
    fullPhrasePinyin: 'yī wèi yīshēng',
    englishMeaning: 'a doctor (polite)',
    grammarNote: '位 (wèi) politely counts respected roles such as doctors and professors.'
  },
  {
    id: 'clf_wei_xiansheng',
    numberHanzi: '一',
    classifier: '位',
    acceptedClassifiers: ['位'],
    nounHanzi: '先生',
    matchTriggers: ['先生', '小姐'],
    fullPhraseHanzi: '一位先生',
    fullPhrasePinyin: 'yī wèi xiānsheng',
    englishMeaning: 'a gentleman / Mr. (polite)',
    grammarNote: '位 (wèi) is the polite measure word when referring to people.'
  },
  // 张 (flat surfaces)
  {
    id: 'clf_zhang_zhuozi',
    numberHanzi: '一',
    classifier: '张',
    acceptedClassifiers: ['张'],
    nounHanzi: '桌子',
    matchTriggers: ['桌子'],
    fullPhraseHanzi: '一张桌子',
    fullPhrasePinyin: 'yī zhāng zhuōzi',
    englishMeaning: 'a table / desk',
    grammarNote: '张 (zhāng) measures flat-surfaced objects like tables, beds, paper, and photos.'
  },
  {
    id: 'clf_zhang_yizi',
    numberHanzi: '两',
    classifier: '张',
    acceptedClassifiers: ['张'],
    nounHanzi: '椅子',
    matchTriggers: ['椅子'],
    fullPhraseHanzi: '两张椅子',
    fullPhrasePinyin: 'liǎng zhāng yǐzi',
    englishMeaning: 'two chairs',
    grammarNote: '张 (zhāng) can be used for chairs, tables, and flat furniture.'
  },
  {
    id: 'clf_zhang_zhaopian',
    numberHanzi: '一',
    classifier: '张',
    acceptedClassifiers: ['张'],
    nounHanzi: '照片',
    matchTriggers: ['照片', '票', '床'],
    fullPhraseHanzi: '一张照片',
    fullPhrasePinyin: 'yī zhāng zhàopiàn',
    englishMeaning: 'a photograph',
    grammarNote: '张 (zhāng) is used for flat sheets such as photographs, paper, and tickets.'
  },
  // 块 (currency / pieces)
  {
    id: 'clf_kuai_qian',
    numberHanzi: '十',
    classifier: '块',
    acceptedClassifiers: ['块'],
    nounHanzi: '钱',
    matchTriggers: ['钱', '块'],
    fullPhraseHanzi: '十块钱',
    fullPhrasePinyin: 'shí kuài qián',
    englishMeaning: 'ten yuan (money)',
    grammarNote: '块 (kuài) is the everyday spoken classifier for Chinese yuan currency (钱).'
  },
  // 个 (general classifier)
  {
    id: 'clf_ge_pengyou',
    numberHanzi: '一',
    classifier: '个',
    acceptedClassifiers: ['个'],
    nounHanzi: '朋友',
    matchTriggers: ['朋友'],
    fullPhraseHanzi: '一个朋友',
    fullPhrasePinyin: 'yī gè péngyou',
    englishMeaning: 'a friend',
    grammarNote: '个 (gè) is the general measure word for friends, students, and everyday nouns.'
  },
  {
    id: 'clf_ge_pingguo',
    numberHanzi: '两',
    classifier: '个',
    acceptedClassifiers: ['个'],
    nounHanzi: '苹果',
    matchTriggers: ['苹果', '水果'],
    fullPhraseHanzi: '两个苹果',
    fullPhrasePinyin: 'liǎng gè píngguǒ',
    englishMeaning: 'two apples',
    grammarNote: '个 (gè) is used for round fruits like apples and general countable nouns.'
  },
  {
    id: 'clf_ge_xuesheng',
    numberHanzi: '三',
    classifier: '个',
    acceptedClassifiers: ['个'],
    nounHanzi: '学生',
    matchTriggers: ['学生', '同学'],
    fullPhraseHanzi: '三个学生',
    fullPhrasePinyin: 'sān gè xuésheng',
    englishMeaning: 'three students',
    grammarNote: '个 (gè) is the standard everyday classifier for students and classmates.'
  },
  {
    id: 'clf_ge_xingqi',
    numberHanzi: '一',
    classifier: '个',
    acceptedClassifiers: ['个'],
    nounHanzi: '星期',
    matchTriggers: ['星期', '月'],
    fullPhraseHanzi: '一个星期',
    fullPhrasePinyin: 'yī gè xīngqī',
    englishMeaning: 'one week',
    grammarNote: '个 (gè) is used with time units like 星期 (week) and 月 (month).'
  },
  {
    id: 'clf_ge_beizi',
    numberHanzi: '一',
    classifier: '个',
    acceptedClassifiers: ['个'],
    nounHanzi: '杯子',
    matchTriggers: ['杯子', '东西', '电脑', '名字', '人'],
    fullPhraseHanzi: '一个杯子',
    fullPhrasePinyin: 'yī gè bēizi',
    englishMeaning: 'a cup / mug (the object itself)',
    grammarNote: '个 (gè) counts the cup/mug object itself (杯子), whereas 杯 measures its liquid contents.'
  }
];

/**
 * Matches attested [Number + Classifier + Noun] phrases from the learner's unlocked vocabulary.
 */
export function getUnlockedClassifierItems(unlockedWords = []) {
  const safePool = Array.isArray(unlockedWords) ? unlockedWords : [];
  if (safePool.length === 0) return [];

  const findMatchingWord = (triggers = []) => {
    for (const trig of triggers) {
      const exact = safePool.find((w) => w && w.hanzi === trig);
      if (exact) return exact;
    }
    for (const trig of triggers) {
      if (trig.length >= 2) {
        const contained = safePool.find(
          (w) => w && typeof w.hanzi === 'string' && w.hanzi.includes(trig)
        );
        if (contained) return contained;
      }
    }
    return null;
  };

  const matched = [];
  const seenIds = new Set();

  ATTESTED_CLASSIFIER_PHRASES.forEach((phrase) => {
    const matchedWord = findMatchingWord(phrase.matchTriggers);
    if (matchedWord && !seenIds.has(phrase.id)) {
      seenIds.add(phrase.id);
      matched.push({
        ...phrase,
        blankPhraseHanzi: `${phrase.numberHanzi} [ ___ ] ${phrase.nounHanzi}`,
        sourceWord: normalizeWordEntry(matchedWord)
      });
    }
  });

  return matched;
}

export function getClassifierDrillUnlockStatus(unlockedWords = []) {
  const safePool = Array.isArray(unlockedWords) ? unlockedWords : [];
  const items = getUnlockedClassifierItems(safePool);
  const distinctClassifiers = Array.from(new Set(items.map((it) => it.classifier)));
  const unlocked =
    safePool.length >= CLASSIFIER_MIN_UNLOCKED_WORDS &&
    distinctClassifiers.length >= CLASSIFIER_MIN_DISTINCT_COUNT;

  return {
    unlocked,
    items,
    distinctClassifiers,
    distinctClassifiersCount: distinctClassifiers.length,
    unlockedWordsCount: safePool.length,
    requiredWords: CLASSIFIER_MIN_UNLOCKED_WORDS,
    requiredClassifiers: CLASSIFIER_MIN_DISTINCT_COUNT
  };
}

export function buildClassifierExerciseData(classifierItem, seed = 0) {
  const item = classifierItem || {
    ...ATTESTED_CLASSIFIER_PHRASES[0],
    blankPhraseHanzi: `${ATTESTED_CLASSIFIER_PHRASES[0].numberHanzi} [ ___ ] ${ATTESTED_CLASSIFIER_PHRASES[0].nounHanzi}`,
    sourceWord: UNIT_1_WORDS[0]
  };
  const accepted = new Set(item.acceptedClassifiers || [item.classifier]);
  const allClassifiers = Object.keys(HSK1_CLASSIFIER_CATALOG);
  const distractorPool = allClassifiers.filter((clf) => !accepted.has(clf));

  const chosenDistractors = [];
  for (let i = 0; i < distractorPool.length && chosenDistractors.length < 3; i++) {
    const pick = distractorPool[(i + seed * 2 + item.nounHanzi.charCodeAt(0)) % distractorPool.length];
    if (!chosenDistractors.includes(pick)) {
      chosenDistractors.push(pick);
    }
  }

  const rawOptions = [
    {
      id: `clf_opt_correct_${item.id}_${item.classifier}`,
      classifier: item.classifier,
      pinyin: HSK1_CLASSIFIER_CATALOG[item.classifier]?.pinyin || '',
      usage: HSK1_CLASSIFIER_CATALOG[item.classifier]?.usage || '',
      isCorrect: true
    },
    ...chosenDistractors.map((clf, idx) => ({
      id: `clf_opt_d_${idx}_${clf}`,
      classifier: clf,
      pinyin: HSK1_CLASSIFIER_CATALOG[clf]?.pinyin || '',
      usage: HSK1_CLASSIFIER_CATALOG[clf]?.usage || '',
      isCorrect: false
    }))
  ];

  const shift = (seed + item.classifier.charCodeAt(0)) % rawOptions.length;
  const options = rawOptions.map((_, idx) => rawOptions[(idx + shift) % rawOptions.length]);

  return {
    ...item,
    blankPhraseHanzi:
      item.blankPhraseHanzi || `${item.numberHanzi} [ ___ ] ${item.nounHanzi}`,
    options
  };
}

// ============================================================================
// CONVERSATIONAL Q&A MINI-DIALOGUES ENGINE (问答 — dialogue_qa)
// Strictly gated: unlockedWords.length >= 20 AND >= 4 attested Q&A pairs
// ============================================================================
export const DIALOGUE_QA_MIN_UNLOCKED_WORDS = 20;
export const DIALOGUE_QA_MIN_PAIRS = 4;

export const HSK1_DIALOGUE_QA_BANK = [
  // 吗 (Yes/No Questions)
  {
    id: 'qa_ma_zuofan',
    grammarTag: '吗',
    requiredWordGroups: [['会'], ['做', '饭', '做饭']],
    questionHanzi: '你会做饭吗？',
    questionPinyin: 'Nǐ huì zuòfàn ma?',
    questionEnglish: 'Can you cook?',
    correctReply: {
      hanzi: '我会做饭。',
      pinyin: 'Wǒ huì zuòfàn.',
      english: 'Yes, I can cook.'
    },
    distractorReplies: [
      {
        hanzi: '今天天气很好。',
        pinyin: 'Jīntiān tiānqì hěn hǎo.',
        english: 'Today the weather is very nice.'
      },
      {
        hanzi: '我家有四口人。',
        pinyin: 'Wǒ jiā yǒu sì kǒu rén.',
        english: 'My family has four people.'
      }
    ]
  },
  {
    id: 'qa_ma_zhongguo',
    grammarTag: '吗',
    requiredWordGroups: [['是'], ['中国', '中国人']],
    questionHanzi: '你是中国人吗？',
    questionPinyin: 'Nǐ shì Zhōngguórén ma?',
    questionEnglish: 'Are you Chinese?',
    correctReply: {
      hanzi: '我是中国人。',
      pinyin: 'Wǒ shì Zhōngguórén.',
      english: 'Yes, I am Chinese.'
    },
    distractorReplies: [
      {
        hanzi: '现在八点了。',
        pinyin: 'Xiànzài bā diǎn le.',
        english: 'It is eight o’clock now.'
      },
      {
        hanzi: '这个苹果五块钱。',
        pinyin: 'Zhège píngguǒ wǔ kuài qián.',
        english: 'This apple costs five yuan.'
      }
    ]
  },
  {
    id: 'qa_ma_hecha',
    grammarTag: '吗',
    requiredWordGroups: [['喜欢'], ['茶', '喝']],
    questionHanzi: '你喜欢喝茶吗？',
    questionPinyin: 'Nǐ xǐhuan hē chá ma?',
    questionEnglish: 'Do you like drinking tea?',
    correctReply: {
      hanzi: '我很喜欢喝茶。',
      pinyin: 'Wǒ hěn xǐhuan hē chá.',
      english: 'I like drinking tea very much.'
    },
    distractorReplies: [
      {
        hanzi: '我叫王明。',
        pinyin: 'Wǒ jiào Wáng Míng.',
        english: 'My name is Wang Ming.'
      },
      {
        hanzi: '明天见！',
        pinyin: 'Míngtiān jiàn!',
        english: 'See you tomorrow!'
      }
    ]
  },
  {
    id: 'qa_ma_renshi',
    grammarTag: '吗',
    requiredWordGroups: [['认识'], ['他', '她', '朋友']],
    questionHanzi: '你认识他吗？',
    questionPinyin: 'Nǐ rènshi tā ma?',
    questionEnglish: 'Do you know him?',
    correctReply: {
      hanzi: '我认识他，他是我的朋友。',
      pinyin: 'Wǒ rènshi tā, tā shì wǒ de péngyou.',
      english: 'Yes, I know him; he is my friend.'
    },
    distractorReplies: [
      {
        hanzi: '我去商店买水果。',
        pinyin: 'Wǒ qù shāngdiàn mǎi shuǐguǒ.',
        english: 'I am going to the store to buy fruit.'
      },
      {
        hanzi: '今天是星期三。',
        pinyin: 'Jīntiān shì xīngqīsān.',
        english: 'Today is Wednesday.'
      }
    ]
  },
  {
    id: 'qa_ma_nihao',
    grammarTag: '吗',
    requiredWordGroups: [['你好', '好'], ['谢谢']],
    questionHanzi: '你最近好吗？',
    questionPinyin: 'Nǐ zuìjìn hǎo ma?',
    questionEnglish: 'How have you been lately?',
    correctReply: {
      hanzi: '我很好，谢谢！',
      pinyin: 'Wǒ hěn hǎo, xièxie!',
      english: 'I am very well, thank you!'
    },
    distractorReplies: [
      {
        hanzi: '我有三本书。',
        pinyin: 'Wǒ yǒu sān běn shū.',
        english: 'I have three books.'
      },
      {
        hanzi: '他在医院工作。',
        pinyin: 'Tā zài yīyuàn gōngzuò.',
        english: 'He works at the hospital.'
      }
    ]
  },
  // 几 (How many — small numbers)
  {
    id: 'qa_ji_kouren',
    grammarTag: '几',
    requiredWordGroups: [['家'], ['几', '人', '有']],
    questionHanzi: '你家有几口人？',
    questionPinyin: 'Nǐ jiā yǒu jǐ kǒu rén?',
    questionEnglish: 'How many people are in your family?',
    correctReply: {
      hanzi: '我家有四口人。',
      pinyin: 'Wǒ jiā yǒu sì kǒu rén.',
      english: 'There are four people in my family.'
    },
    distractorReplies: [
      {
        hanzi: '我想喝一杯水。',
        pinyin: 'Wǒ xiǎng hē yī bēi shuǐ.',
        english: 'I would like to drink a glass of water.'
      },
      {
        hanzi: '今天天气很冷。',
        pinyin: 'Jīntiān tiānqì hěn lěng.',
        english: 'The weather is very cold today.'
      }
    ]
  },
  {
    id: 'qa_ji_dian',
    grammarTag: '几',
    requiredWordGroups: [['现在', '点'], ['几', '点']],
    questionHanzi: '现在几点了？',
    questionPinyin: 'Xiànzài jǐ diǎn le?',
    questionEnglish: 'What time is it now?',
    correctReply: {
      hanzi: '现在八点了。',
      pinyin: 'Xiànzài bā diǎn le.',
      english: 'It is eight o’clock now.'
    },
    distractorReplies: [
      {
        hanzi: '这是我的汉语老师。',
        pinyin: 'Zhè shì wǒ de Hànyǔ lǎoshī.',
        english: 'This is my Chinese teacher.'
      },
      {
        hanzi: '我喜欢吃苹果。',
        pinyin: 'Wǒ xǐhuan chī píngguǒ.',
        english: 'I like eating apples.'
      }
    ]
  },
  {
    id: 'qa_ji_xingqi',
    grammarTag: '几',
    requiredWordGroups: [['今天'], ['星期']],
    questionHanzi: '今天是星期几？',
    questionPinyin: 'Jīntiān shì xīngqī jǐ?',
    questionEnglish: 'What day of the week is today?',
    correctReply: {
      hanzi: '今天是星期三。',
      pinyin: 'Jīntiān shì xīngqīsān.',
      english: 'Today is Wednesday.'
    },
    distractorReplies: [
      {
        hanzi: '我住在北京。',
        pinyin: 'Wǒ zhù zài Běijīng.',
        english: 'I live in Beijing.'
      },
      {
        hanzi: '谢谢你，不客气。',
        pinyin: 'Xièxie nǐ, bù kèqi.',
        english: 'Thank you, you are welcome.'
      }
    ]
  },
  {
    id: 'qa_ji_shu',
    grammarTag: '几',
    requiredWordGroups: [['有'], ['书']],
    questionHanzi: '你有几本书？',
    questionPinyin: 'Nǐ yǒu jǐ běn shū?',
    questionEnglish: 'How many books do you have?',
    correctReply: {
      hanzi: '我有三本书。',
      pinyin: 'Wǒ yǒu sān běn shū.',
      english: 'I have three books.'
    },
    distractorReplies: [
      {
        hanzi: '我会说汉语。',
        pinyin: 'Wǒ huì shuō Hànyǔ.',
        english: 'I can speak Chinese.'
      },
      {
        hanzi: '对不起，没关系。',
        pinyin: 'Duìbuqǐ, méi guānxi.',
        english: 'Sorry, it does not matter.'
      }
    ]
  },
  // 多少 (How much / How many / Numbers)
  {
    id: 'qa_duoshao_shouji',
    grammarTag: '多少',
    requiredWordGroups: [['多少'], ['电话', '号', '手机']],
    questionHanzi: '你的手机号是多少？',
    questionPinyin: 'Nǐ de shǒujī hào shì duōshao?',
    questionEnglish: 'What is your mobile phone number?',
    correctReply: {
      hanzi: '我的手机号是138-0013。',
      pinyin: 'Wǒ de shǒujī hào shì yāo-sān-bā líng-líng-yāo-sān.',
      english: 'My mobile number is 138-0013.'
    },
    distractorReplies: [
      {
        hanzi: '我明天去学校。',
        pinyin: 'Wǒ míngtiān qù xuéxiào.',
        english: 'I am going to school tomorrow.'
      },
      {
        hanzi: '那只猫很漂亮。',
        pinyin: 'Nà zhī māo hěn piàoliang.',
        english: 'That cat is very pretty.'
      }
    ]
  },
  {
    id: 'qa_duoshao_qian',
    grammarTag: '多少',
    requiredWordGroups: [['多少'], ['钱', '块', '买']],
    questionHanzi: '这个苹果多少钱？',
    questionPinyin: 'Zhège píngguǒ duōshao qián?',
    questionEnglish: 'How much is this apple?',
    correctReply: {
      hanzi: '这个苹果五块钱。',
      pinyin: 'Zhège píngguǒ wǔ kuài qián.',
      english: 'This apple is five yuan.'
    },
    distractorReplies: [
      {
        hanzi: '我是学生。',
        pinyin: 'Wǒ shì xuésheng.',
        english: 'I am a student.'
      },
      {
        hanzi: '她在看书。',
        pinyin: 'Tā zài kànshū.',
        english: 'She is reading a book.'
      }
    ]
  },
  {
    id: 'qa_duoshao_xuesheng',
    grammarTag: '多少',
    requiredWordGroups: [['学校'], ['学生']],
    questionHanzi: '你们学校有多少学生？',
    questionPinyin: 'Nǐmen xuéxiào yǒu duōshao xuésheng?',
    questionEnglish: 'How many students does your school have?',
    correctReply: {
      hanzi: '我们学校有很多学生。',
      pinyin: 'Wǒmen xuéxiào yǒu hěn duō xuésheng.',
      english: 'Our school has many students.'
    },
    distractorReplies: [
      {
        hanzi: '我想吃米饭。',
        pinyin: 'Wǒ xiǎng chī mǐfàn.',
        english: 'I want to eat rice.'
      },
      {
        hanzi: '今天天气很热。',
        pinyin: 'Jīntiān tiānqì hěn rè.',
        english: 'The weather is very hot today.'
      }
    ]
  },
  // 什么 (What)
  {
    id: 'qa_shenme_mingzi',
    grammarTag: '什么',
    requiredWordGroups: [['什么', '叫'], ['名字']],
    questionHanzi: '你叫什么名字？',
    questionPinyin: 'Nǐ jiào shénme míngzi?',
    questionEnglish: 'What is your name?',
    correctReply: {
      hanzi: '我叫李明。',
      pinyin: 'Wǒ jiào Lǐ Míng.',
      english: 'My name is Li Ming.'
    },
    distractorReplies: [
      {
        hanzi: '现在十点了。',
        pinyin: 'Xiànzài shí diǎn le.',
        english: 'It is ten o’clock now.'
      },
      {
        hanzi: '我喝一杯茶。',
        pinyin: 'Wǒ hē yī bēi chá.',
        english: 'I drink a cup of tea.'
      }
    ]
  },
  {
    id: 'qa_shenme_chi',
    grammarTag: '什么',
    requiredWordGroups: [['什么'], ['吃', '米饭', '菜']],
    questionHanzi: '你想吃什么？',
    questionPinyin: 'Nǐ xiǎng chī shénme?',
    questionEnglish: 'What would you like to eat?',
    correctReply: {
      hanzi: '我想吃米饭和菜。',
      pinyin: 'Wǒ xiǎng chī mǐfàn hé cài.',
      english: 'I would like to eat rice and dishes.'
    },
    distractorReplies: [
      {
        hanzi: '我今年二十岁。',
        pinyin: 'Wǒ jīnnián èrshí suì.',
        english: 'I am twenty years old this year.'
      },
      {
        hanzi: '他是我哥哥。',
        pinyin: 'Tā shì wǒ gēge.',
        english: 'He is my older brother.'
      }
    ]
  },
  {
    id: 'qa_shenme_he',
    grammarTag: '什么',
    requiredWordGroups: [['什么'], ['喝', '水', '茶']],
    questionHanzi: '你想喝什么？',
    questionPinyin: 'Nǐ xiǎng hē shénme?',
    questionEnglish: 'What would you like to drink?',
    correctReply: {
      hanzi: '我想喝一杯茶。',
      pinyin: 'Wǒ xiǎng hē yī bēi chá.',
      english: 'I would like to drink a cup of tea.'
    },
    distractorReplies: [
      {
        hanzi: '我家有三口人。',
        pinyin: 'Wǒ jiā yǒu sān kǒu rén.',
        english: 'My family has three people.'
      },
      {
        hanzi: '我去学校学习。',
        pinyin: 'Wǒ qù xuéxiào xuéxí.',
        english: 'I go to school to study.'
      }
    ]
  },
  // 哪儿 (Where)
  {
    id: 'qa_nar_qu',
    grammarTag: '哪儿',
    requiredWordGroups: [['去'], ['哪儿', '哪']],
    questionHanzi: '你去哪儿？',
    questionPinyin: 'Nǐ qù nǎr?',
    questionEnglish: 'Where are you going?',
    correctReply: {
      hanzi: '我去商店买水果。',
      pinyin: 'Wǒ qù shāngdiàn mǎi shuǐguǒ.',
      english: 'I am going to the store to buy fruit.'
    },
    distractorReplies: [
      {
        hanzi: '我很高兴认识你。',
        pinyin: 'Wǒ hěn gāoxìng rènshi nǐ.',
        english: 'I am very glad to meet you.'
      },
      {
        hanzi: '这本书十块钱。',
        pinyin: 'Zhè běn shū shí kuài qián.',
        english: 'This book costs ten yuan.'
      }
    ]
  },
  {
    id: 'qa_nar_gongzuo',
    grammarTag: '哪儿',
    requiredWordGroups: [['工作'], ['哪儿', '在', '医院']],
    questionHanzi: '你在哪儿工作？',
    questionPinyin: 'Nǐ zài nǎr gōngzuò?',
    questionEnglish: 'Where do you work?',
    correctReply: {
      hanzi: '我在医院工作。',
      pinyin: 'Wǒ zài yīyuàn gōngzuò.',
      english: 'I work at a hospital.'
    },
    distractorReplies: [
      {
        hanzi: '今天是星期五。',
        pinyin: 'Jīntiān shì xīngqīwǔ.',
        english: 'Today is Friday.'
      },
      {
        hanzi: '我有一只小狗。',
        pinyin: 'Wǒ yǒu yī zhī xiǎogǒu.',
        english: 'I have a little dog.'
      }
    ]
  },
  {
    id: 'qa_nar_zhu',
    grammarTag: '哪儿',
    requiredWordGroups: [['住'], ['北京', '哪儿']],
    questionHanzi: '你住在哪儿？',
    questionPinyin: 'Nǐ zhù zài nǎr?',
    questionEnglish: 'Where do you live?',
    correctReply: {
      hanzi: '我住在北京。',
      pinyin: 'Wǒ zhù zài Běijīng.',
      english: 'I live in Beijing.'
    },
    distractorReplies: [
      {
        hanzi: '我不会做饭。',
        pinyin: 'Wǒ bù huì zuòfàn.',
        english: 'I cannot cook.'
      },
      {
        hanzi: '谢谢你的帮助。',
        pinyin: 'Xièxie nǐ de bāngzhù.',
        english: 'Thank you for your help.'
      }
    ]
  },
  // 怎么样 (How is it)
  {
    id: 'qa_zenmeyang_tianqi',
    grammarTag: '怎么样',
    requiredWordGroups: [['天气'], ['怎么样', '今天']],
    questionHanzi: '今天天气怎么样？',
    questionPinyin: 'Jīntiān tiānqì zěnmeyàng?',
    questionEnglish: 'How is the weather today?',
    correctReply: {
      hanzi: '今天天气很好。',
      pinyin: 'Jīntiān tiānqì hěn hǎo.',
      english: 'The weather is very nice today.'
    },
    distractorReplies: [
      {
        hanzi: '他是我的同学。',
        pinyin: 'Tā shì wǒ de tóngxué.',
        english: 'He is my classmate.'
      },
      {
        hanzi: '我有两杯茶。',
        pinyin: 'Wǒ yǒu liǎng bēi chá.',
        english: 'I have two cups of tea.'
      }
    ]
  },
  {
    id: 'qa_zenmeyang_hanyu',
    grammarTag: '怎么样',
    requiredWordGroups: [['汉语', '中文'], ['怎么样', '会', '说']],
    questionHanzi: '你的汉语怎么样？',
    questionPinyin: 'Nǐ de Hànyǔ zěnmeyàng?',
    questionEnglish: 'How is your Chinese?',
    correctReply: {
      hanzi: '我会说一点儿汉语。',
      pinyin: 'Wǒ huì shuō yīdiǎnr Hànyǔ.',
      english: 'I can speak a little Chinese.'
    },
    distractorReplies: [
      {
        hanzi: '现在九点半。',
        pinyin: 'Xiànzài jiǔ diǎn bàn.',
        english: 'It is nine thirty now.'
      },
      {
        hanzi: '那个杯子在桌子上。',
        pinyin: 'Nàge bēizi zài zhuōzi shàng.',
        english: 'That cup is on the table.'
      }
    ]
  },
  // 谁 (Who)
  {
    id: 'qa_shei_laoshi',
    grammarTag: '谁',
    requiredWordGroups: [['谁'], ['老师', '人']],
    questionHanzi: '那个人是谁？',
    questionPinyin: 'Nàge rén shì shéi?',
    questionEnglish: 'Who is that person?',
    correctReply: {
      hanzi: '他是我的汉语老师。',
      pinyin: 'Tā shì wǒ de Hànyǔ lǎoshī.',
      english: 'He is my Chinese teacher.'
    },
    distractorReplies: [
      {
        hanzi: '明天会下雨。',
        pinyin: 'Míngtiān huì xiàyǔ.',
        english: 'It will rain tomorrow.'
      },
      {
        hanzi: '这个苹果很甜。',
        pinyin: 'Zhège píngguǒ hěn tián.',
        english: 'This apple is very sweet.'
      }
    ]
  },
  {
    id: 'qa_shei_shu',
    grammarTag: '谁',
    requiredWordGroups: [['谁'], ['书', '朋友']],
    questionHanzi: '这是谁的书？',
    questionPinyin: 'Zhè shì shéi de shū?',
    questionEnglish: 'Whose book is this?',
    correctReply: {
      hanzi: '这是我朋友的书。',
      pinyin: 'Zhè shì wǒ péngyou de shū.',
      english: 'This is my friend’s book.'
    },
    distractorReplies: [
      {
        hanzi: '我喜欢喝水。',
        pinyin: 'Wǒ xǐhuan hē shuǐ.',
        english: 'I like drinking water.'
      },
      {
        hanzi: '我们坐出租车去。',
        pinyin: 'Wǒmen zuò chūzūchē qù.',
        english: 'We are going by taxi.'
      }
    ]
  },
  // 不 (Negation / A-not-A Questions)
  {
    id: 'qa_bu_kafei',
    grammarTag: '不',
    requiredWordGroups: [['不'], ['喝', '水', '茶', '咖啡']],
    questionHanzi: '你喝不喝茶？',
    questionPinyin: 'Nǐ hē bù hē chá?',
    questionEnglish: 'Do you drink tea or not?',
    correctReply: {
      hanzi: '谢谢，我不喝茶，我喝水。',
      pinyin: 'Xièxie, wǒ bù hē chá, wǒ hē shuǐ.',
      english: 'Thanks, I do not drink tea; I drink water.'
    },
    distractorReplies: [
      {
        hanzi: '我的学校很大。',
        pinyin: 'Wǒ de xuéxiào hěn dà.',
        english: 'My school is very big.'
      },
      {
        hanzi: '他今年二十五岁。',
        pinyin: 'Tā jīnnián èrshíwǔ suì.',
        english: 'He is twenty-five years old this year.'
      }
    ]
  },
  {
    id: 'qa_bu_qubeijing',
    grammarTag: '不',
    requiredWordGroups: [['不'], ['去', '明天', '北京']],
    questionHanzi: '你明天去不去北京？',
    questionPinyin: 'Nǐ míngtiān qù bù qù Běijīng?',
    questionEnglish: 'Are you going to Beijing tomorrow?',
    correctReply: {
      hanzi: '我不去北京，我明天工作。',
      pinyin: 'Wǒ bù qù Běijīng, wǒ míngtiān gōngzuò.',
      english: 'I am not going to Beijing; I work tomorrow.'
    },
    distractorReplies: [
      {
        hanzi: '这件衣服很好看。',
        pinyin: 'Zhè jiàn yīfu hěn hǎokàn.',
        english: 'This piece of clothing looks very nice.'
      },
      {
        hanzi: '我有两张桌子。',
        pinyin: 'Wǒ yǒu liǎng zhāng zhuōzi.',
        english: 'I have two tables.'
      }
    ]
  }
];

/**
 * Filters HSK 1 Q&A mini-dialogue pairs strictly to pairs whose core words appear in unlockedWords.
 */
export function getUnlockedDialoguePairs(unlockedWords = []) {
  const safePool = Array.isArray(unlockedWords) ? unlockedWords : [];
  if (safePool.length === 0) return [];

  const findGroupMatch = (group = []) => {
    for (const token of group) {
      const exact = safePool.find((w) => w && w.hanzi === token);
      if (exact) return exact;
    }
    for (const token of group) {
      const contained = safePool.find(
        (w) => w && typeof w.hanzi === 'string' && w.hanzi.includes(token)
      );
      if (contained) return contained;
    }
    return null;
  };

  const matched = [];
  HSK1_DIALOGUE_QA_BANK.forEach((pair) => {
    let primaryMatchedWord = null;
    const allGroupsMatched = pair.requiredWordGroups.every((group) => {
      const hit = findGroupMatch(group);
      if (hit && !primaryMatchedWord) primaryMatchedWord = hit;
      return Boolean(hit);
    });

    if (allGroupsMatched) {
      matched.push({
        ...pair,
        sourceWord: normalizeWordEntry(primaryMatchedWord || safePool[0])
      });
    }
  });

  return matched;
}

export function getDialogueQaUnlockStatus(unlockedWords = []) {
  const safePool = Array.isArray(unlockedWords) ? unlockedWords : [];
  const pairs = getUnlockedDialoguePairs(safePool);
  const unlocked =
    safePool.length >= DIALOGUE_QA_MIN_UNLOCKED_WORDS &&
    pairs.length >= DIALOGUE_QA_MIN_PAIRS;

  return {
    unlocked,
    pairs,
    pairsCount: pairs.length,
    unlockedWordsCount: safePool.length,
    requiredWords: DIALOGUE_QA_MIN_UNLOCKED_WORDS,
    requiredPairs: DIALOGUE_QA_MIN_PAIRS
  };
}

export function buildDialogueQaExerciseData(dialoguePair, seed = 0) {
  const pair = dialoguePair || {
    ...HSK1_DIALOGUE_QA_BANK[0],
    sourceWord: UNIT_1_WORDS[0]
  };
  const rawOptions = [
    {
      id: `qa_opt_correct_${pair.id}`,
      hanzi: pair.correctReply.hanzi,
      pinyin: pair.correctReply.pinyin,
      english: pair.correctReply.english,
      isCorrect: true
    },
    ...(pair.distractorReplies || []).slice(0, 2).map((d, idx) => ({
      id: `qa_opt_d_${idx}_${pair.id}`,
      hanzi: d.hanzi,
      pinyin: d.pinyin,
      english: d.english,
      isCorrect: false
    }))
  ];

  const shift = (seed + pair.questionHanzi.charCodeAt(0)) % rawOptions.length;
  const options = rawOptions.map((_, idx) => rawOptions[(idx + shift) % rawOptions.length]);

  return {
    ...pair,
    options
  };
}

// ============================================================================
// PROCEDURAL NUMBERS, TIME & PRICES LAB ENGINE (数字与时间)
// Strictly gated: unlockedWords.length >= 25 AND >= 4 core number/time morphemes
// ============================================================================
export const NUMBERS_TIME_MIN_UNLOCKED_WORDS = 25;
export const NUMBERS_TIME_MIN_CORE_CHARS = 4;
export const NUMBERS_TIME_CORE_CHARS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '百',
  '点',
  '分',
  '半',
  '月',
  '号',
  '块',
  '元'
];

export function getNumbersTimeLabUnlockStatus(unlockedWords = []) {
  const safePool = Array.isArray(unlockedWords) ? unlockedWords : [];
  const charSet = new Set();
  safePool.forEach((w) => {
    if (w && typeof w.hanzi === 'string') {
      Array.from(w.hanzi).forEach((ch) => charSet.add(ch));
    }
  });

  const matchedCoreChars = NUMBERS_TIME_CORE_CHARS.filter((ch) => charSet.has(ch));
  const unlocked =
    safePool.length >= NUMBERS_TIME_MIN_UNLOCKED_WORDS &&
    matchedCoreChars.length >= NUMBERS_TIME_MIN_CORE_CHARS;

  return {
    unlocked,
    unlockedWordsCount: safePool.length,
    matchedCoreChars,
    matchedCoreCharsCount: matchedCoreChars.length,
    requiredWords: NUMBERS_TIME_MIN_UNLOCKED_WORDS,
    requiredCoreChars: NUMBERS_TIME_MIN_CORE_CHARS
  };
}

const MANDARIN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const MANDARIN_DIGITS_PINYIN = [
  'líng',
  'yī',
  'èr',
  'sān',
  'sì',
  'wǔ',
  'liù',
  'qī',
  'bā',
  'jiǔ'
];

const MONTH_ABBR_EN = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/**
 * Converts an integer 0..999 into natural Standard Mandarin Hanzi and Pinyin.
 * Examples: 0 -> 零, 25 -> 二十五, 108 -> 一百零八, 115 -> 一百一十五, 340 -> 三百四十
 */
export function integerToMandarin(rawNum, { useLiangForTwo = false } = {}) {
  const n = Math.max(0, Math.min(999, Math.floor(Number(rawNum) || 0)));
  if (n === 0) {
    return { hanzi: '零', pinyin: 'líng' };
  }
  if (n === 2 && useLiangForTwo) {
    return { hanzi: '两', pinyin: 'liǎng' };
  }
  if (n < 10) {
    return { hanzi: MANDARIN_DIGITS[n], pinyin: MANDARIN_DIGITS_PINYIN[n] };
  }
  if (n < 20) {
    const ones = n % 10;
    return ones === 0
      ? { hanzi: '十', pinyin: 'shí' }
      : {
          hanzi: `十${MANDARIN_DIGITS[ones]}`,
          pinyin: `shí${MANDARIN_DIGITS_PINYIN[ones]}`
        };
  }
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0
      ? {
          hanzi: `${MANDARIN_DIGITS[tens]}十`,
          pinyin: `${MANDARIN_DIGITS_PINYIN[tens]}shí`
        }
      : {
          hanzi: `${MANDARIN_DIGITS[tens]}十${MANDARIN_DIGITS[ones]}`,
          pinyin: `${MANDARIN_DIGITS_PINYIN[tens]}shí${MANDARIN_DIGITS_PINYIN[ones]}`
        };
  }

  // 100..999
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const hHanzi = `${MANDARIN_DIGITS[hundreds]}百`;
  const hPinyin = `${MANDARIN_DIGITS_PINYIN[hundreds]}bǎi`;

  if (rem === 0) {
    return { hanzi: hHanzi, pinyin: hPinyin };
  }
  if (rem < 10) {
    return {
      hanzi: `${hHanzi}零${MANDARIN_DIGITS[rem]}`,
      pinyin: `${hPinyin} líng ${MANDARIN_DIGITS_PINYIN[rem]}`
    };
  }
  const tens = Math.floor(rem / 10);
  const ones = rem % 10;
  const tailHanzi =
    ones === 0
      ? `${MANDARIN_DIGITS[tens]}十`
      : `${MANDARIN_DIGITS[tens]}十${MANDARIN_DIGITS[ones]}`;
  const tailPinyin =
    ones === 0
      ? `${MANDARIN_DIGITS_PINYIN[tens]}shí`
      : `${MANDARIN_DIGITS_PINYIN[tens]}shí${MANDARIN_DIGITS_PINYIN[ones]}`;

  return {
    hanzi: `${hHanzi}${tailHanzi}`,
    pinyin: `${hPinyin} ${tailPinyin}`
  };
}

function formatClockTimeEntry(hour, minute) {
  const h = Math.max(1, Math.min(12, hour));
  const m = Math.max(0, Math.min(59, minute));
  const hConv = integerToMandarin(h, { useLiangForTwo: true });
  const padH = String(h).padStart(2, '0');
  const padM = String(m).padStart(2, '0');
  const numericDisplay = `${padH}:${padM}`;
  const shortNumeric = `${h}:${padM}`;

  let hanzi = '';
  let pinyin = '';
  if (m === 0) {
    hanzi = `${hConv.hanzi}点`;
    pinyin = `${hConv.pinyin} diǎn`;
  } else if (m === 30) {
    hanzi = `${hConv.hanzi}点半`;
    pinyin = `${hConv.pinyin} diǎn bàn`;
  } else if (m < 10) {
    const mConv = integerToMandarin(m);
    hanzi = `${hConv.hanzi}点零${mConv.hanzi}分`;
    pinyin = `${hConv.pinyin} diǎn líng ${mConv.pinyin} fēn`;
  } else if (m === 20 || m === 40 || m === 50) {
    const mConv = integerToMandarin(m);
    hanzi = `${hConv.hanzi}点${mConv.hanzi}`;
    pinyin = `${hConv.pinyin} diǎn ${mConv.pinyin}`;
  } else {
    const mConv = integerToMandarin(m);
    hanzi = `${hConv.hanzi}点${mConv.hanzi}分`;
    pinyin = `${hConv.pinyin} diǎn ${mConv.pinyin} fēn`;
  }

  return {
    kind: 'time',
    hour: h,
    minute: m,
    hanzi,
    pinyin,
    numericDisplay,
    shortNumeric,
    canonicalNumeric: shortNumeric,
    englishLabel: `Clock Time (${numericDisplay})`,
    inputPlaceholder: 'e.g. 8:30 or 08:30'
  };
}

function formatDateEntry(month, day) {
  const mo = Math.max(1, Math.min(12, month));
  const da = Math.max(1, Math.min(28, day));
  const moConv = integerToMandarin(mo);
  const daConv = integerToMandarin(da);
  const numericDisplay = `${mo}/${da}`;
  const englishDate = `${MONTH_ABBR_EN[mo]} ${da}`;

  return {
    kind: 'date',
    month: mo,
    day: da,
    hanzi: `${moConv.hanzi}月${daConv.hanzi}号`,
    pinyin: `${moConv.pinyin} yuè ${daConv.pinyin} hào`,
    numericDisplay: `${englishDate} (${numericDisplay})`,
    shortNumeric: numericDisplay,
    canonicalNumeric: numericDisplay,
    englishLabel: `Calendar Date (${englishDate})`,
    inputPlaceholder: 'e.g. 5/20 or 9/16'
  };
}

function formatRmbPriceEntry(yuan, jiao) {
  const y = Math.max(1, Math.min(199, yuan));
  const j = Math.max(0, Math.min(9, jiao));
  const yConv = integerToMandarin(y, { useLiangForTwo: true });

  if (j === 0) {
    return {
      kind: 'price',
      yuan: y,
      jiao: 0,
      hanzi: `${yConv.hanzi}块`,
      pinyin: `${yConv.pinyin} kuài`,
      numericDisplay: `¥${y}`,
      shortNumeric: `${y}`,
      canonicalNumeric: `${y}`,
      englishLabel: `RMB Price (¥${y}.00)`,
      inputPlaceholder: 'e.g. 65 or 28.5'
    };
  }

  const jConv = integerToMandarin(j);
  return {
    kind: 'price',
    yuan: y,
    jiao: j,
    hanzi: `${yConv.hanzi}块${jConv.hanzi}`,
    pinyin: `${yConv.pinyin} kuài ${jConv.pinyin}`,
    numericDisplay: `¥${y}.${j}0`,
    shortNumeric: `${y}.${j}`,
    canonicalNumeric: `${y}.${j}`,
    englishLabel: `RMB Price (¥${y}.${j}0)`,
    inputPlaceholder: 'e.g. 28.5 or 3.20'
  };
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleList(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Generates an infinite randomized procedural challenge for Numbers (0-999),
 * Clock Time & Dates (时间与日期), or RMB Prices (人民币价格).
 */
export function buildNumbersTimeChallenge(subMode = 'numbers', format = 'listening') {
  const mode = ['numbers', 'time_date', 'prices'].includes(subMode) ? subMode : 'numbers';
  const challengeFormat = format === 'reading' ? 'reading' : 'listening';
  const uid = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  let target = null;
  const distractors = [];
  const usedKeys = new Set();

  if (mode === 'numbers') {
    // Weighted across 0-19, 20-99, and 100-999 so learners practice every range
    const bandRoll = Math.random();
    let n = 0;
    if (bandRoll < 0.18) {
      n = randomIntBetween(0, 19);
    } else if (bandRoll < 0.55) {
      n = randomIntBetween(20, 99);
    } else {
      // Include plenty of X0Y (108) and XY0 (340) patterns
      const subRoll = Math.random();
      if (subRoll < 0.35) {
        n = randomIntBetween(1, 9) * 100 + randomIntBetween(1, 9);
      } else if (subRoll < 0.65) {
        n = randomIntBetween(1, 9) * 100 + randomIntBetween(1, 9) * 10;
      } else {
        n = randomIntBetween(100, 999);
      }
    }

    const conv = integerToMandarin(n);
    target = {
      kind: 'number',
      value: n,
      hanzi: conv.hanzi,
      pinyin: conv.pinyin,
      numericDisplay: String(n),
      shortNumeric: String(n),
      canonicalNumeric: String(n),
      englishLabel: `Number (${n})`,
      inputPlaceholder: 'Type number (e.g. 108)'
    };
    usedKeys.add(target.hanzi);

    // Build plausible close numeric distractors
    const candidateNums = [];
    if (n >= 100) {
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const o = n % 10;
      candidateNums.push(h * 100 + o * 10 + t);
      candidateNums.push(Math.max(10, n + (Math.random() < 0.5 ? 10 : -10)));
      candidateNums.push(Math.min(999, Math.max(100, (h === 9 ? 8 : h + 1) * 100 + (n % 100))));
      candidateNums.push(Math.max(0, n + (o === 9 ? -2 : 2)));
    } else if (n >= 10) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      if (o > 0) candidateNums.push(o * 10 + t);
      candidateNums.push(Math.min(99, n + 10));
      candidateNums.push(Math.max(1, n - 10));
      candidateNums.push(Math.min(99, n + 1));
    } else {
      candidateNums.push((n + 1) % 10, (n + 3) % 10, (n + 5) % 10, n + 10);
    }

    candidateNums.forEach((cand) => {
      if (distractors.length >= 3) return;
      const safeCand = Math.max(0, Math.min(999, Math.floor(cand)));
      const dConv = integerToMandarin(safeCand);
      if (!usedKeys.has(dConv.hanzi)) {
        usedKeys.add(dConv.hanzi);
        distractors.push({
          hanzi: dConv.hanzi,
          pinyin: dConv.pinyin,
          numericDisplay: String(safeCand),
          shortNumeric: String(safeCand)
        });
      }
    });

    while (distractors.length < 3) {
      const fallbackN =
        n >= 100 ? randomIntBetween(100, 999) : n >= 10 ? randomIntBetween(10, 99) : randomIntBetween(0, 19);
      const dConv = integerToMandarin(fallbackN);
      if (!usedKeys.has(dConv.hanzi)) {
        usedKeys.add(dConv.hanzi);
        distractors.push({
          hanzi: dConv.hanzi,
          pinyin: dConv.pinyin,
          numericDisplay: String(fallbackN),
          shortNumeric: String(fallbackN)
        });
      }
    }
  } else if (mode === 'time_date') {
    const isClockTime = Math.random() < 0.58;
    if (isClockTime) {
      const minuteChoices = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      const h = randomIntBetween(1, 12);
      const m = minuteChoices[randomIntBetween(0, minuteChoices.length - 1)];
      target = formatClockTimeEntry(h, m);
      usedKeys.add(target.hanzi);

      const candidatePairs = [
        [h, minuteChoices[(minuteChoices.indexOf(m) + 3) % minuteChoices.length]],
        [((h % 12) + 1), m],
        [h === 1 ? 12 : h - 1, m === 30 ? 15 : 30],
        [h, m === 0 ? 30 : 0]
      ];
      candidatePairs.forEach(([ch, cm]) => {
        if (distractors.length >= 3) return;
        const entry = formatClockTimeEntry(ch, cm);
        if (!usedKeys.has(entry.hanzi)) {
          usedKeys.add(entry.hanzi);
          distractors.push(entry);
        }
      });
      while (distractors.length < 3) {
        const entry = formatClockTimeEntry(
          randomIntBetween(1, 12),
          minuteChoices[randomIntBetween(0, minuteChoices.length - 1)]
        );
        if (!usedKeys.has(entry.hanzi)) {
          usedKeys.add(entry.hanzi);
          distractors.push(entry);
        }
      }
    } else {
      const mo = randomIntBetween(1, 12);
      const da = randomIntBetween(1, 28);
      target = formatDateEntry(mo, da);
      usedKeys.add(target.hanzi);

      const candidateDates = [
        [mo, ((da + 5 - 1) % 28) + 1],
        [((mo + 2 - 1) % 12) + 1, da],
        [da <= 12 ? da : ((mo % 12) + 1), mo <= 28 ? mo : ((da + 9 - 1) % 28) + 1],
        [mo, da === 1 ? 10 : Math.max(1, da - 3)]
      ];
      candidateDates.forEach(([cm, cd]) => {
        if (distractors.length >= 3) return;
        const entry = formatDateEntry(cm, cd);
        if (!usedKeys.has(entry.hanzi)) {
          usedKeys.add(entry.hanzi);
          distractors.push(entry);
        }
      });
      while (distractors.length < 3) {
        const entry = formatDateEntry(randomIntBetween(1, 12), randomIntBetween(1, 28));
        if (!usedKeys.has(entry.hanzi)) {
          usedKeys.add(entry.hanzi);
          distractors.push(entry);
        }
      }
    }
  } else {
    // RMB Prices: mix of whole yuan (¥65) and yuan + jiao (¥3.20, ¥28.50)
    const hasJiao = Math.random() < 0.65;
    const yuan = Math.random() < 0.45 ? randomIntBetween(1, 19) : randomIntBetween(20, 120);
    const jiao = hasJiao ? randomIntBetween(1, 9) : 0;
    target = formatRmbPriceEntry(yuan, jiao);
    usedKeys.add(target.hanzi);

    const candidatePrices = [
      [yuan, jiao === 0 ? 5 : (jiao + 3) % 9 + 1],
      [Math.min(199, yuan + (yuan < 10 ? 2 : 10)), jiao],
      [Math.max(1, yuan - (yuan > 12 ? 10 : 1)), jiao === 0 ? 0 : 0],
      [Math.min(199, yuan + 1), jiao === 5 ? 2 : 5]
    ];
    candidatePrices.forEach(([cy, cj]) => {
      if (distractors.length >= 3) return;
      const entry = formatRmbPriceEntry(cy, cj);
      if (!usedKeys.has(entry.hanzi)) {
        usedKeys.add(entry.hanzi);
        distractors.push(entry);
      }
    });
    while (distractors.length < 3) {
      const entry = formatRmbPriceEntry(
        randomIntBetween(1, 120),
        Math.random() < 0.6 ? randomIntBetween(1, 9) : 0
      );
      if (!usedKeys.has(entry.hanzi)) {
        usedKeys.add(entry.hanzi);
        distractors.push(entry);
      }
    }
  }

  const rawOptions = [
    {
      id: `nt_correct_${uid}`,
      hanzi: target.hanzi,
      pinyin: target.pinyin,
      numericDisplay: target.numericDisplay,
      shortNumeric: target.shortNumeric,
      isCorrect: true
    },
    ...distractors.slice(0, 3).map((d, idx) => ({
      id: `nt_d_${idx}_${uid}`,
      hanzi: d.hanzi,
      pinyin: d.pinyin,
      numericDisplay: d.numericDisplay,
      shortNumeric: d.shortNumeric,
      isCorrect: false
    }))
  ];

  return {
    id: `nt_q_${uid}`,
    subMode: mode,
    format: challengeFormat,
    ...target,
    options: shuffleList(rawOptions)
  };
}

/**
 * Validates typed numeric input for Numbers (108), Clock Times (8:30 / 08:30),
 * Dates (5/20 / 05-20 / May 20), and RMB Prices (28.5 / 28.50 / ¥28.50 / 65).
 */
export function validateNumbersTimeTypedInput(rawInput, challenge) {
  if (!challenge) return false;
  const cleaned = String(rawInput || '').trim();
  if (!cleaned) return false;

  if (challenge.kind === 'number') {
    const digitsOnly = cleaned.replace(/[,\s]/g, '');
    if (!/^\d+$/.test(digitsOnly)) return false;
    return Number(digitsOnly) === Number(challenge.value);
  }

  if (challenge.kind === 'time') {
    const normalized = cleaned.replace(/[：.]/g, ':').replace(/\s+/g, '');
    const m = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      return Number(m[1]) === challenge.hour && Number(m[2]) === challenge.minute;
    }
    if (challenge.minute === 0 && /^\d{1,2}$/.test(normalized)) {
      return Number(normalized) === challenge.hour;
    }
    return false;
  }

  if (challenge.kind === 'date') {
    const lower = cleaned.toLowerCase().replace(/\s+/g, ' ').trim();
    const slashMatch = lower.match(/^(\d{1,2})[\/\-.\s](\d{1,2})$/);
    if (slashMatch) {
      return Number(slashMatch[1]) === challenge.month && Number(slashMatch[2]) === challenge.day;
    }
    const abbr = MONTH_ABBR_EN[challenge.month]?.toLowerCase() || '';
    if (abbr && lower === `${abbr} ${challenge.day}`) {
      return true;
    }
    return false;
  }

  if (challenge.kind === 'price') {
    const stripped = cleaned.replace(/[¥￥$元块\s]/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(stripped)) return false;
    const expected = Number(`${challenge.yuan}.${challenge.jiao}`);
    return Math.abs(Number(stripped) - expected) < 0.001;
  }

  return false;
}



