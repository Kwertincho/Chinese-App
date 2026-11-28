// ============================================================================
// MULTI-VARIANT MANDARIN PRODUCTION GRADER & READINESS ENGINE (100% Offline)
// Reuses mandarinHelpers.js Pinyin segmentation/tone rules and provides
// actionable English syntactic diagnostics + strict generative unlock checks.
// ============================================================================

import {
  segmentMandarinPinyin,
  convertPinyinToNumeric,
  stripToneMarks
} from '../utils/mandarinHelpers.js';
import { TONE_VOWEL_MAP } from '../data/curriculumData.js';
import { getActiveGrammarSchemas } from './grammarEngine.js';
import {
  buildUnlockedPoolMap,
  getParticleEntry,
  getWordPos
} from './grammarSchemas.js';

const PUNCT_AND_SPACE_REGEX = /[，。！？、；：“”‘’《》【】（）,.!?;:'"()\s]+/g;
const CJK_CHAR_REGEX = /[\u4e00-\u9fff]/;
const NEUTRAL_ONLY_PARTICLES = new Set(['的', '吗', '呢', '了', '吧', '么', '过', '着']);
const CLOSE_FAMILY_SCHOOL_NOUNS = [
  '爸爸',
  '妈妈',
  '哥哥',
  '姐姐',
  '弟弟',
  '妹妹',
  '老师',
  '朋友',
  '家'
];
const COMMON_CLASSIFIER_CHARS = new Set([
  '个', '口', '本', '杯', '只', '条', '件', '家', '位', '张', '块', '元', '辆', '瓶', '碗', '盘', '台', '部', '把', '间', '种'
]);
const COMMON_TIME_WORDS = [
  '今天', '明天', '昨天', '现在', '上午', '中午', '下午', '晚上', '早上', '每天', '去年', '今年', '明年', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期天', '星期日'
];
const ASPECT_MODAL_PARTICLES = ['了', '正在', '没', '不', '会', '能', '可以', '想', '要'];

function stripHanziPunctAndSpace(str = '') {
  return String(str || '').replace(PUNCT_AND_SPACE_REGEX, '').trim();
}

function normalizeInputPinyinRaw(str = '') {
  return String(str || '')
    .trim()
    .replace(/[，。！？、；：“”‘’,.!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumericSyllables(pinyinStr = '') {
  const numericStr = convertPinyinToNumeric(normalizeInputPinyinRaw(pinyinStr));
  if (!numericStr) return [];
  return numericStr
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(/^([a-zü]+)([1-5])$/i);
      if (m) {
        return { base: m[1].toLowerCase(), tone: Number(m[2]) };
      }
      return { base: stripToneMarks(tok), tone: 5 };
    });
}

function hasExplicitToneMarksOrNumbers(rawStr = '') {
  const hasToneNumber = /[0-5]/.test(rawStr);
  if (hasToneNumber) return true;
  return Array.from(rawStr).some((ch) => {
    const entry = TONE_VOWEL_MAP[ch.toLowerCase()];
    return Boolean(entry && entry.tone !== 5);
  });
}

/**
 * Checks phonological equivalence between user and target syllable arrays,
 * accounting for 3+3 -> 2+3 sandhi, 不/一 tone sandhi, and neutral-tone softening.
 */
function areSyllableListsPhonologicallyEquivalent(userSyls, targetSyls, targetHanziChars = []) {
  if (!Array.isArray(userSyls) || !Array.isArray(targetSyls)) return false;
  if (userSyls.length === 0 || userSyls.length !== targetSyls.length) return false;

  for (let i = 0; i < targetSyls.length; i++) {
    const u = userSyls[i];
    const t = targetSyls[i];
    if (!u || !t || u.base !== t.base) return false;
    if (u.tone === t.tone) continue;

    const nextTarget = targetSyls[i + 1];
    const curChar = targetHanziChars[i] || '';
    const prevTarget = i > 0 ? targetSyls[i - 1] : null;

    // 3rd + 3rd -> 2nd + 3rd sandhi
    if (t.tone === 3 && nextTarget?.tone === 3 && u.tone === 2) continue;

    // 不 (bu4 -> bu2 before 4th tone)
    if (
      (curChar === '不' || (!curChar && t.base === 'bu')) &&
      t.tone === 4 &&
      nextTarget?.tone === 4 &&
      u.tone === 2
    ) {
      continue;
    }

    // 一 (yi1 -> yi2 before 4th tone; yi1 -> yi4 before 1st/2nd/3rd tone)
    if ((curChar === '一' || (!curChar && t.base === 'yi')) && t.tone === 1 && nextTarget) {
      if (nextTarget.tone === 4 && u.tone === 2) continue;
      if ([1, 2, 3].includes(nextTarget.tone) && u.tone === 4) continue;
    }

    // Neutral tone flexibility on neutral particles (de, ma, ne, le, ba, guo, zhe) or reduplicated 2nd syllables
    if (t.tone === 5 && NEUTRAL_ONLY_PARTICLES.has(curChar)) continue;
    if (u.tone === 5 && prevTarget && prevTarget.base === t.base) continue;
    if (t.tone === 5 && prevTarget && prevTarget.base === t.base && u.tone === prevTarget.tone) continue;

    return false;
  }

  return true;
}

// ============================================================================
// VARIANT EQUIVALENCE EXPANSION
// ============================================================================

const EQUIVALENT_PAIR_SWAPS = [
  { aHanzi: '哪儿', bHanzi: '哪里', aPinyin: 'nǎr', bPinyin: 'nǎlǐ' },
  { aHanzi: '这儿', bHanzi: '这里', aPinyin: 'zhèr', bPinyin: 'zhèlǐ' },
  { aHanzi: '那儿', bHanzi: '那里', aPinyin: 'nàr', bPinyin: 'nàlǐ' },
  {
    aHanzi: '一点儿',
    bHanzi: '一点',
    aPinyin: 'yīdiǎnr',
    bPinyin: 'yīdiǎn',
    aPinyinRegex: /y[īíǐì]diǎnr/gi,
    bPinyinRegex: /y[īíǐì]diǎn(?!r)/gi
  }
];

const PRONOUN_PINYIN_REGEX = {
  我: /\bw[ōóǒòo](?=\s|$)/i,
  你: /\bn[īíǐìi](?=\s|$)/i,
  他: /\bt[āáǎàa](?=\s|$)/i,
  她: /\bt[āáǎàa](?=\s|$)/i
};

function applyPairEquivalents(variants) {
  let current = [...variants];

  for (const pair of EQUIVALENT_PAIR_SWAPS) {
    const additions = [];
    const aRegex = pair.aPinyinRegex || new RegExp(pair.aPinyin, 'gi');
    const bRegex = pair.bPinyinRegex || new RegExp(pair.bPinyin, 'gi');
    for (const v of current) {
      if (!v || typeof v.hanzi !== 'string') continue;
      if (v.hanzi.includes(pair.aHanzi)) {
        additions.push({
          hanzi: v.hanzi.split(pair.aHanzi).join(pair.bHanzi),
          pinyin: v.pinyin ? v.pinyin.replace(aRegex, pair.bPinyin) : '',
          isPrimary: false
        });
      }
      if (v.hanzi.includes(pair.bHanzi)) {
        additions.push({
          hanzi: v.hanzi.split(pair.bHanzi).join(pair.aHanzi),
          pinyin: v.pinyin ? v.pinyin.replace(bRegex, pair.aPinyin) : '',
          isPrimary: false
        });
      }
    }
    current = [...current, ...additions];
  }

  // Time 点 <-> 点钟 equivalence (e.g. 三点 <-> 三点钟)
  const clockAdditions = [];
  for (const v of current) {
    if (/[一二两三四五六七八九十零\d]点(?!钟)/.test(v.hanzi)) {
      clockAdditions.push({
        hanzi: v.hanzi.replace(/([一二两三四五六七八九十零\d])点(?!钟)/g, '$1点钟'),
        pinyin: v.pinyin ? v.pinyin.replace(/diǎn(?!\s*zhōng)/gi, 'diǎn zhōng') : '',
        isPrimary: false
      });
    }
    if (/[一二两三四五六七八九十零\d]点钟/.test(v.hanzi)) {
      clockAdditions.push({
        hanzi: v.hanzi.replace(/([一二两三四五六七八九十零\d])点钟/g, '$1点'),
        pinyin: v.pinyin ? v.pinyin.replace(/diǎn\s*zhōng/gi, 'diǎn') : '',
        isPrimary: false
      });
    }
  }
  current = [...current, ...clockAdditions];

  // Optional 的 between singular pronoun (我/你/他/她) and close family/school nouns
  const deAdditions = [];
  for (const v of current) {
    for (const pron of ['我', '你', '他', '她']) {
      for (const noun of CLOSE_FAMILY_SCHOOL_NOUNS) {
        const withDe = `${pron}的${noun}`;
        const withoutDe = `${pron}${noun}`;
        if (v.hanzi.includes(withDe)) {
          deAdditions.push({
            hanzi: v.hanzi.replace(withDe, withoutDe),
            pinyin: v.pinyin ? v.pinyin.replace(/\bde\b/i, '').replace(/\s+/g, ' ').trim() : '',
            isPrimary: false
          });
        } else if (v.hanzi.includes(withoutDe)) {
          const pronRegex = PRONOUN_PINYIN_REGEX[pron];
          let expandedPinyin = '';
          if (v.pinyin && pronRegex && pronRegex.test(v.pinyin)) {
            expandedPinyin = v.pinyin.replace(pronRegex, (m) => `${m} de`).replace(/\s+/g, ' ').trim();
          }
          deAdditions.push({
            hanzi: v.hanzi.replace(withoutDe, withDe),
            pinyin: expandedPinyin,
            isPrimary: false
          });
        }
      }
    }
  }
  current = [...current, ...deAdditions];

  // Optional sentence-final 呢 on 正在 progressive sentences
  const progAdditions = [];
  for (const v of current) {
    if (v.hanzi.includes('正在') && v.hanzi.endsWith('呢')) {
      progAdditions.push({
        hanzi: v.hanzi.slice(0, -1),
        pinyin: v.pinyin ? v.pinyin.replace(/\s*ne\s*$/i, '').trim() : '',
        isPrimary: false
      });
    } else if (v.hanzi.includes('正在') && !v.hanzi.endsWith('呢')) {
      progAdditions.push({
        hanzi: `${v.hanzi}呢`,
        pinyin: v.pinyin ? `${v.pinyin} ne`.trim() : '',
        isPrimary: false
      });
    }
  }
  current = [...current, ...progAdditions];

  // Deduplicate by stripped Hanzi while preserving primary flag & richest Pinyin
  const deduped = new Map();
  for (const item of current) {
    const cleanH = stripHanziPunctAndSpace(item.hanzi);
    if (!cleanH) continue;
    const existing = deduped.get(cleanH);
    if (!existing) {
      deduped.set(cleanH, {
        hanzi: cleanH,
        displayHanzi: item.displayHanzi || item.hanzi,
        pinyin: item.pinyin || '',
        isPrimary: Boolean(item.isPrimary)
      });
    } else {
      if (item.isPrimary) existing.isPrimary = true;
      if (!existing.pinyin && item.pinyin) existing.pinyin = item.pinyin;
    }
  }

  return Array.from(deduped.values());
}

function buildExpandedEquivalenceVariants(generatedItem = {}) {
  const safeItem = generatedItem && typeof generatedItem === 'object' ? generatedItem : {};
  const baseVariants = [];
  const primaryHanzi = stripHanziPunctAndSpace(safeItem.hanzi || '');
  if (primaryHanzi) {
    baseVariants.push({
      hanzi: primaryHanzi,
      displayHanzi: safeItem.hanzi || primaryHanzi,
      pinyin: safeItem.pinyin || '',
      isPrimary: true
    });
  }

  const rawAccepted = Array.isArray(safeItem.acceptedVariants)
    ? safeItem.acceptedVariants
    : [];
  rawAccepted.forEach((v) => {
    const h = stripHanziPunctAndSpace(typeof v === 'string' ? v : v?.hanzi || '');
    const p = typeof v === 'object' ? v?.pinyin || '' : '';
    if (h && h !== primaryHanzi) {
      baseVariants.push({ hanzi: h, displayHanzi: typeof v === 'string' ? v : v.hanzi, pinyin: p, isPrimary: false });
    }
  });

  // Automatically derive S + Time <-> Time + S fronting with accurate paired Pinyin
  const tokens = Array.isArray(safeItem.tokens) ? safeItem.tokens : [];
  if (tokens.length >= 3) {
    const first = tokens[0];
    const second = tokens[1];
    if (
      (first.role === 'subject' && second.role === 'time') ||
      (first.role === 'time' && second.role === 'subject')
    ) {
      const swappedTokens = [second, first, ...tokens.slice(2)];
      baseVariants.push({
        hanzi: swappedTokens.map((t) => t.hanzi).join(''),
        displayHanzi: swappedTokens.map((t) => t.hanzi).join(''),
        pinyin: swappedTokens
          .map((t) => t.pinyin)
          .filter(Boolean)
          .join(' '),
        isPrimary: false
      });
    }
  }

  return applyPairEquivalents(baseVariants);
}

// ============================================================================
// ACTIONABLE SYNTACTIC ERROR DIAGNOSTICS
// ============================================================================

function diagnoseMandarinError(rawInput, generatedItem = {}) {
  const safeItem = generatedItem && typeof generatedItem === 'object' ? generatedItem : {};
  const cleanHanzi = stripHanziPunctAndSpace(rawInput);
  const cleanPinyin = stripToneMarks(rawInput);
  const isHanzi = CJK_CHAR_REGEX.test(cleanHanzi);
  const tokens = Array.isArray(safeItem.tokens) ? safeItem.tokens : [];
  const schemaId = safeItem.schemaId || safeItem.grammarPoint?.id || '';
  const ruleSummary =
    safeItem.grammarPoint?.ruleSummary || 'Check word order and required particles.';

  // 1. Negation errors: 不有, 不 with past time, 没 with 是/adjective
  if (
    (isHanzi && cleanHanzi.includes('不有')) ||
    (!isHanzi && cleanPinyin.includes('buyou'))
  ) {
    return {
      errorCategory: 'negation_bu_mei',
      diagnostic: 'Use 没 (méi), never 不 (bù), to negate 有 (yǒu).'
    };
  }

  const hasPastCue =
    schemaId === 'past_neg_mei' ||
    tokens.some((t) => t.role === 'time' && ['昨天', '去年'].includes(t.hanzi)) ||
    cleanHanzi.includes('昨天') ||
    cleanHanzi.includes('去年');

  if (
    hasPastCue &&
    ((isHanzi && cleanHanzi.includes('不') && !cleanHanzi.includes('没')) ||
      (!isHanzi && /\bbu\b/i.test(normalizeInputPinyinRaw(rawInput).replace(/[0-5]/g, '')) && !cleanPinyin.includes('mei')))
  ) {
    return {
      errorCategory: 'negation_bu_mei',
      diagnostic: 'Use 没 (méi) instead of 不 (bù) to negate completed past actions.'
    };
  }

  const adjToken = tokens.find((t) => t.role === 'adj' || t.pos === 'adj');
  if (
    (isHanzi &&
      (cleanHanzi.includes('没是') ||
        ((schemaId === 'shi_neg' || schemaId === 'adj_neg') && cleanHanzi.includes('没')) ||
        (adjToken && cleanHanzi.includes(`没${adjToken.hanzi}`)))) ||
    (!isHanzi && (cleanPinyin.includes('meishi') || ((schemaId === 'shi_neg' || schemaId === 'adj_neg') && cleanPinyin.includes('mei'))))
  ) {
    return {
      errorCategory: 'negation_bu_mei',
      diagnostic: 'Use 不 (bù), not 没 (méi), to negate 是 or descriptive adjectives.'
    };
  }

  // 2. Place word order: ...V + 在 + Place (never trigger on valid S + 在 + Place where 在 is the main verb)
  const placeToken = tokens.find((t) => t.role === 'place');
  const verbToken = tokens.find((t) => (t.role === 'verb' || t.pos === 'verb') && t.hanzi !== '在');
  if (isHanzi && placeToken && verbToken) {
    const zaiPlaceIdx = cleanHanzi.indexOf(`在${placeToken.hanzi}`);
    const verbIdx = cleanHanzi.indexOf(verbToken.hanzi);
    if (zaiPlaceIdx > -1 && verbIdx > -1 && zaiPlaceIdx > verbIdx) {
      return {
        errorCategory: 'place_order',
        diagnostic:
          "Word order: In Mandarin, '在 + location' goes BEFORE the main verb (Subject + 在 + Location + Verb)."
      };
    }
  } else if (isHanzi && verbToken && tokens.some((t) => t.hanzi === '在')) {
    const verbIdx = cleanHanzi.indexOf(verbToken.hanzi);
    if (verbIdx > -1) {
      const afterVerb = cleanHanzi.slice(verbIdx + verbToken.hanzi.length);
      if (/(?:^|[^正])在[\u4e00-\u9fff]{1,4}$/.test(afterVerb)) {
        return {
          errorCategory: 'place_order',
          diagnostic:
            "Word order: In Mandarin, '在 + location' goes BEFORE the main verb (Subject + 在 + Location + Verb)."
        };
      }
    }
  }

  // 3. Time expression placed at the very end of the sentence
  const timeToken = tokens.find((t) => t.role === 'time');
  const timeCandidates = timeToken ? [timeToken.hanzi, ...COMMON_TIME_WORDS] : COMMON_TIME_WORDS;
  if (isHanzi && timeCandidates.some((tw) => cleanHanzi.length > tw.length && cleanHanzi.endsWith(tw))) {
    return {
      errorCategory: 'time_order',
      diagnostic:
        'Word order: Place time expressions before the verb (Subject + Time + Verb, or Time + Subject + Verb).'
    };
  }

  // 4. Numeral / Classifier errors: 二 before classifier, or missing classifier
  if (isHanzi) {
    const chars = Array.from(cleanHanzi);
    for (let i = 0; i < chars.length - 1; i++) {
      if (chars[i] === '二' && COMMON_CLASSIFIER_CHARS.has(chars[i + 1])) {
        return {
          errorCategory: 'classifier_error',
          diagnostic: 'Use 两 (liǎng) instead of 二 (èr) before measure words.'
        };
      }
    }
  }

  const numToken = tokens.find((t) => t.role === 'number');
  const clToken = tokens.find((t) => t.role === 'classifier');
  const nounToken = tokens.find((t) => t.role === 'noun');
  if (isHanzi && numToken && clToken && nounToken) {
    const hasNumAndNounDirectly = cleanHanzi.includes(`${numToken.hanzi}${nounToken.hanzi}`);
    const missingCl = !cleanHanzi.includes(clToken.hanzi);
    if (hasNumAndNounDirectly && missingCl) {
      return {
        errorCategory: 'classifier_error',
        diagnostic: 'Remember to place a measure word (量词) between the number and the noun.'
      };
    }
  }

  // 5. Separable verb (离合词) split/object placement error
  const sepV1 = tokens.find((t) => t.role === 'sep_v1');
  const sepV2 = tokens.find((t) => t.role === 'sep_v2');
  if (isHanzi && sepV1 && sepV2) {
    const fullSep = `${sepV1.hanzi}${sepV2.hanzi}`;
    const modToken = tokens.find((t) => t.role === 'modifier');
    if (schemaId === 'separable_le' && (cleanHanzi.includes(`${fullSep}了`) || cleanHanzi.includes(`了${fullSep}`))) {
      return {
        errorCategory: 'separable_error',
        diagnostic: `Separable verb (离合词): Split ${fullSep} and insert 了 inside (${sepV1.hanzi}了${sepV2.hanzi}), rather than ${fullSep}了.`
      };
    }
    if (schemaId === 'separable_modifier' && modToken && cleanHanzi.includes(`${fullSep}${modToken.hanzi}`)) {
      return {
        errorCategory: 'separable_error',
        diagnostic: `Separable verb (离合词): Insert ${modToken.hanzi} inside ${fullSep} (${sepV1.hanzi}${modToken.hanzi}${sepV2.hanzi}), not after it.`
      };
    }
  }

  // 6. Missing required particle (吗, 了, 的, 正在, 都, 吧, 过, 比)
  const importantParticles = ['吗', '了', '的', '正在', '都', '吧', '过', '比'];
  for (const pChar of importantParticles) {
    const requiredInTokens = tokens.some((t) => t.hanzi === pChar);
    if (!requiredInTokens) continue;
    // Skip optional 的 for close family nouns
    if (pChar === '的' && CLOSE_FAMILY_SCHOOL_NOUNS.some((n) => cleanHanzi.includes(n))) continue;
    // Skip optional 呢 (not in list anyway)
    const missingFromHanzi = isHanzi && !cleanHanzi.includes(pChar);
    const pBase = stripToneMarks(
      tokens.find((t) => t.hanzi === pChar)?.pinyin || ''
    );
    const missingFromPinyin = !isHanzi && pBase && !cleanPinyin.includes(pBase);

    if (missingFromHanzi || missingFromPinyin) {
      return {
        errorCategory: 'missing_particle',
        diagnostic: `Missing required particle "${pChar}". ${ruleSummary}`
      };
    }
  }

  // 7. Concise fallback showing expected grammar rule
  return {
    errorCategory: 'structure_mismatch',
    diagnostic: `Check the sentence structure: ${ruleSummary}`
  };
}

// ============================================================================
// 1. MULTI-VARIANT SENTENCE PRODUCTION GRADER
// ============================================================================

/**
 * Grades a learner's Mandarin production (Hanzi or Pinyin) against a generated
 * sentence item, supporting standard variants, tone sandhi, and English error diagnostics.
 */
export function gradeMandarinProduction(
  userInput,
  generatedItem,
  { inputMode = 'auto', requireTones = true } = {}
) {
  const safeItem = generatedItem && typeof generatedItem === 'object' ? generatedItem : { hanzi: '', pinyin: '' };
  const raw = String(userInput || '').trim();
  if (!raw) {
    return {
      isCorrect: false,
      matchType: 'Empty',
      matchedVariant: null,
      errorCategory: 'empty',
      diagnostic: 'Type your Mandarin answer before checking.',
      feedback: 'Type your Mandarin answer before checking.'
    };
  }

  const variants = buildExpandedEquivalenceVariants(safeItem);
  const cleanUserHanzi = stripHanziPunctAndSpace(raw);
  const userHasHanzi = CJK_CHAR_REGEX.test(cleanUserHanzi);

  // Branch A: Hanzi Grading
  if (inputMode === 'hanzi' || (inputMode === 'auto' && userHasHanzi)) {
    const matched = variants.find((v) => v.hanzi === cleanUserHanzi);
    if (matched) {
      const matchType = matched.isPrimary ? 'Exact Hanzi' : 'Valid Variant';
      return {
        isCorrect: true,
        matchType,
        matchedVariant: matched.displayHanzi || matched.hanzi,
        errorCategory: null,
        diagnostic: null,
        feedback:
          matchType === 'Exact Hanzi'
            ? `Spot on! ${safeItem.hanzi || ''} (${safeItem.pinyin || ''})`
            : `Valid Mandarin variant accepted! ${matched.displayHanzi || matched.hanzi} (${safeItem.pinyin || ''})`
      };
    }

    const diag = diagnoseMandarinError(raw, safeItem);
    return {
      isCorrect: false,
      matchType: 'Mismatch',
      matchedVariant: null,
      errorCategory: diag.errorCategory,
      diagnostic: diag.diagnostic,
      feedback: `${diag.diagnostic} Expected: ${safeItem.hanzi || ''} (${safeItem.pinyin || ''})`
    };
  }

  // Branch B: Pinyin Grading
  const userSyls = parseNumericSyllables(raw);
  const userHasTones = hasExplicitToneMarksOrNumbers(raw);
  const userToneless = stripToneMarks(raw);

  const variantsWithPinyin = variants.filter((v) => Boolean(v.pinyin));
  const checkList =
    variantsWithPinyin.length > 0
      ? variantsWithPinyin
      : [{ hanzi: stripHanziPunctAndSpace(safeItem.hanzi || ''), displayHanzi: safeItem.hanzi || '', pinyin: safeItem.pinyin || '', isPrimary: true }];

  // Check if every target syllable is neutral-only (e.g., a single particle)
  const allNeutralOnly = checkList.some((v) => {
    const chars = Array.from(v.hanzi);
    return chars.length > 0 && chars.every((c) => NEUTRAL_ONLY_PARTICLES.has(c));
  });

  // First check exact/phonologically-equivalent tone match
  let matchedTonelessVariant = null;
  for (const variant of checkList) {
    const targetSyls = parseNumericSyllables(variant.pinyin);
    const targetChars = Array.from(variant.hanzi);

    if (
      (!requireTones || userHasTones || allNeutralOnly) &&
      areSyllableListsPhonologicallyEquivalent(userSyls, targetSyls, targetChars)
    ) {
      const matchType = variant.isPrimary ? 'Exact Pinyin' : 'Valid Variant';
      return {
        isCorrect: true,
        matchType,
        matchedVariant: variant.displayHanzi || variant.hanzi,
        errorCategory: null,
        diagnostic: null,
        feedback: `Correct! ${variant.displayHanzi || safeItem.hanzi || ''} (${variant.pinyin})`
      };
    }

    if (userToneless && stripToneMarks(variant.pinyin) === userToneless) {
      matchedTonelessVariant = variant;
    }
  }

  // Syllables match, but tones are missing or wrong
  if (matchedTonelessVariant) {
    if (requireTones && !userHasTones && !allNeutralOnly) {
      return {
        isCorrect: false,
        matchType: 'Tone Mismatch',
        matchedVariant: null,
        errorCategory: 'tone_mismatch',
        diagnostic: 'Syllables match, but check your tone marks/numbers.',
        feedback: `Syllables match, but tones are required! Expected: ${matchedTonelessVariant.pinyin}`
      };
    }
    return {
      isCorrect: false,
      matchType: 'Tone Mismatch',
      matchedVariant: null,
      errorCategory: 'tone_mismatch',
      diagnostic: 'Syllables match, but check your tone marks/numbers.',
      feedback: `Syllables match, but check your tone marks/numbers. Expected: ${matchedTonelessVariant.pinyin}`
    };
  }

  // Fall back to syntactic error diagnosis on Pinyin
  const diag = diagnoseMandarinError(raw, safeItem);
  return {
    isCorrect: false,
    matchType: 'Mismatch',
    matchedVariant: null,
    errorCategory: diag.errorCategory,
    diagnostic: diag.diagnostic,
    feedback: `${diag.diagnostic} Expected: ${safeItem.hanzi || ''} (${safeItem.pinyin || ''})`
  };
}

// ============================================================================
// 2. FREE-TEXT OPEN CLOZE GRADER
// ============================================================================

/**
 * Grades a free-text Open Cloze blank answer, accepting Hanzi or tone-accurate
 * Pinyin for `blankToken` plus any equivalent entries in `acceptedAnswers`.
 */
export function gradeOpenClozeAnswer(userInput, blankToken, acceptedAnswers = []) {
  const raw = String(userInput || '').trim();
  if (!raw) {
    return {
      isCorrect: false,
      matchType: 'Empty',
      matchedAnswer: null,
      errorCategory: 'empty',
      diagnostic: 'Type the missing Mandarin word (Hanzi or Pinyin with tones).',
      feedback: 'Type the missing Mandarin word (Hanzi or Pinyin with tones).'
    };
  }

  const normalizedTargets = [];
  const pushTarget = (entry, isPrimary = false) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      const clean = stripHanziPunctAndSpace(entry);
      if (clean) normalizedTargets.push({ hanzi: clean, pinyin: '', isPrimary });
    } else if (typeof entry === 'object') {
      const clean = stripHanziPunctAndSpace(entry.hanzi || entry.text || '');
      if (clean || entry.pinyin) {
        normalizedTargets.push({
          hanzi: clean,
          pinyin: String(entry.pinyin || '').trim(),
          isPrimary
        });
      }
    }
  };

  pushTarget(blankToken, true);
  if (Array.isArray(acceptedAnswers)) {
    acceptedAnswers.forEach((ans) => pushTarget(ans, false));
  }

  const cleanUserHanzi = stripHanziPunctAndSpace(raw);
  const userHasHanzi = CJK_CHAR_REGEX.test(cleanUserHanzi);

  if (userHasHanzi) {
    const matched = normalizedTargets.find((t) => t.hanzi && t.hanzi === cleanUserHanzi);
    if (matched) {
      return {
        isCorrect: true,
        matchType: matched.isPrimary ? 'Exact Hanzi' : 'Valid Variant',
        matchedAnswer: matched.hanzi,
        errorCategory: null,
        diagnostic: null,
        feedback: `Correct! ${matched.hanzi}${matched.pinyin ? ` (${matched.pinyin})` : ''}`
      };
    }

    const primary = normalizedTargets[0] || { hanzi: '', pinyin: '' };
    return {
      isCorrect: false,
      matchType: 'Mismatch',
      matchedAnswer: null,
      errorCategory: 'cloze_mismatch',
      diagnostic: `Expected "${primary.hanzi}"${primary.pinyin ? ` (${primary.pinyin})` : ''}.`,
      feedback: `Not quite — expected "${primary.hanzi}"${primary.pinyin ? ` (${primary.pinyin})` : ''}.`
    };
  }

  // Pinyin blank grading
  const userSyls = parseNumericSyllables(raw);
  const userHasTones = hasExplicitToneMarksOrNumbers(raw);
  const userToneless = stripToneMarks(raw);
  const segmented = segmentMandarinPinyin(raw);

  let tonelessHit = null;
  for (const target of normalizedTargets) {
    if (!target.pinyin) continue;
    const targetChars = Array.from(target.hanzi || '');
    const isNeutralOnly =
      targetChars.length > 0 && targetChars.every((c) => NEUTRAL_ONLY_PARTICLES.has(c));
    const targetSyls = parseNumericSyllables(target.pinyin);

    if (
      (userHasTones || isNeutralOnly) &&
      segmented.length > 0 &&
      areSyllableListsPhonologicallyEquivalent(userSyls, targetSyls, targetChars)
    ) {
      return {
        isCorrect: true,
        matchType: target.isPrimary ? 'Exact Pinyin' : 'Valid Variant',
        matchedAnswer: target.hanzi || target.pinyin,
        errorCategory: null,
        diagnostic: null,
        feedback: `Correct! ${target.hanzi} (${target.pinyin})`
      };
    }

    if (userToneless && stripToneMarks(target.pinyin) === userToneless) {
      tonelessHit = target;
    }
  }

  if (tonelessHit) {
    return {
      isCorrect: false,
      matchType: 'Tone Mismatch',
      matchedAnswer: null,
      errorCategory: 'tone_mismatch',
      diagnostic: 'Syllables match, but check your tone marks/numbers.',
      feedback: `Syllables match, but check your tones! Expected: ${tonelessHit.hanzi} (${tonelessHit.pinyin})`
    };
  }

  const primary = normalizedTargets[0] || { hanzi: '', pinyin: '' };
  return {
    isCorrect: false,
    matchType: 'Mismatch',
    matchedAnswer: null,
    errorCategory: 'cloze_mismatch',
    diagnostic: `Expected "${primary.hanzi}"${primary.pinyin ? ` (${primary.pinyin})` : ''}.`,
    feedback: `Expected "${primary.hanzi}"${primary.pinyin ? ` (${primary.pinyin})` : ''}.`
  };
}

// ============================================================================
// 3. GENERATIVE ENGINE UNLOCK READINESS CHECKS
// ============================================================================

const TRANSFORM_READINESS_PAIRS = [
  ['shi_identity', 'shi_ma'],
  ['shi_identity', 'shi_neg'],
  ['adj_hen', 'adj_neg'],
  ['you_possession', 'you_neg'],
  ['adj_hen', 'a_not_a_adj'],
  ['time_action', 'a_not_a_verb'],
  ['completed_le_obj', 'past_neg_mei'],
  ['modal_xiang', 'progressive_zhengzai'],
  ['modal_xiang', 'suggestion_ba']
];

export function createLockedGenerativeReadiness(unlockedWordsCount = 0) {
  const count = Number.isFinite(Number(unlockedWordsCount)) ? Math.max(0, Number(unlockedWordsCount)) : 0;
  return {
    unlockedWordsCount: count,
    activeSchemasCount: 0,
    availableTransformCount: 0,
    availableErrorPatternsCount: 0,
    unlockedSeparableCount: 0,
    unlockedAspectModalCount: 0,
    translation_prod: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 12,
      detailProgressText: `Unlocks at 12+ words (${count}/12) & 4 grammar patterns (0/4)`
    },
    open_cloze: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 15,
      detailProgressText: `Unlocks at 15+ words (${count}/15) & 5 grammar patterns (0/5)`
    },
    syntax_transform: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 18,
      detailProgressText: `Unlocks at 18+ words (${count}/18) & 3 transform patterns (0/3)`
    },
    error_spotter: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 20,
      detailProgressText: `Unlocks at 20+ words (${count}/20) & 4 error patterns (0/4)`
    },
    contextual_writing: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 15,
      detailProgressText: `Unlocks at 15+ words (${count}/15) & 4 grammar patterns (0/4)`
    },
    grammar_lab: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 20,
      detailProgressText: `Unlocks at 20+ words (${count}/20) & 2 separable verbs (0/2) or 4 aspect/modal particles (0/4)`
    },
    micro_reading: {
      unlocked: false,
      unlockedWordsCount: count,
      requiredWords: 25,
      detailProgressText: `Unlocks at 25+ words (${count}/25) & 6 grammar patterns (0/6)`
    }
  };
}

/**
 * Evaluates exact unlock readiness for all 7 Phase 3/4 generative modes
 * strictly from the learner's `enrichedUnlockedWords` and active grammar schemas.
 */
export function getGenerativeEngineReadiness(enrichedUnlockedWords = []) {
  const safePool = Array.isArray(enrichedUnlockedWords)
    ? enrichedUnlockedWords.filter((w) => w && typeof w === 'object' && typeof w.hanzi === 'string' && w.hanzi.trim())
    : [];
  const unlockedWordsCount = safePool.length;

  if (unlockedWordsCount === 0) {
    return createLockedGenerativeReadiness(0);
  }

  try {
    const poolMap = buildUnlockedPoolMap(safePool);
    const activeSchemas = getActiveGrammarSchemas(safePool);
    const activeSchemasCount = activeSchemas.length;
    const activeIds = new Set(activeSchemas.map((s) => s?.id).filter(Boolean));

    // Count distinct transformable base patterns available
    const availableTransformCount = TRANSFORM_READINESS_PAIRS.filter(
      ([baseId, targetId]) => activeIds.has(baseId) && activeIds.has(targetId)
    ).length;

    // Count distinct error-spotter patterns available (out of 7 categories)
    const unlockedClassifiers = safePool.filter(
      (w) => getWordPos(w) === 'classifier' && !['岁', '些', '元', '块'].includes(w.hanzi)
    );
    const errorPatternFlags = [
      activeIds.has('zai_location_action'), // place_after_verb
      activeIds.has('you_neg') && Boolean(getParticleEntry('不', poolMap)) && Boolean(getParticleEntry('有', poolMap)), // bu_with_you
      activeIds.has('past_neg_mei') && Boolean(getParticleEntry('不', poolMap)), // bu_with_past
      activeIds.has('you_possession') && Boolean(getParticleEntry('两', poolMap)) && Boolean(getParticleEntry('二', poolMap)), // er_before_classifier
      activeIds.has('you_possession') && unlockedClassifiers.length >= 2, // wrong_classifier
      activeIds.has('scope_dou'), // misplaced_adverb_ye_dou
      activeIds.has('separable_modifier') // separable_object_error
    ];
    const availableErrorPatternsCount = errorPatternFlags.filter(Boolean).length;

    // Count unlocked separable verbs & aspect/modal particles
    const unlockedSeparableCount = safePool.filter(
      (w) =>
        Boolean(w?.isSeparable || w?.linguistics?.isSeparable) &&
        Array.isArray(w?.sepParts || w?.linguistics?.sepParts) &&
        (w?.sepParts || w?.linguistics?.sepParts).length === 2
    ).length;

    const unlockedAspectModalCount = ASPECT_MODAL_PARTICLES.filter((p) =>
      Boolean(getParticleEntry(p, poolMap))
    ).length;

    const translationProdUnlocked = unlockedWordsCount >= 12 && activeSchemasCount >= 4;
    const openClozeUnlocked = unlockedWordsCount >= 15 && activeSchemasCount >= 5;
    const syntaxTransformUnlocked = unlockedWordsCount >= 18 && availableTransformCount >= 3;
    const errorSpotterUnlocked = unlockedWordsCount >= 20 && availableErrorPatternsCount >= 4;
    const contextualWritingUnlocked = unlockedWordsCount >= 15 && activeSchemasCount >= 4;
    const grammarLabUnlocked =
      unlockedWordsCount >= 20 &&
      (unlockedSeparableCount >= 2 || unlockedAspectModalCount >= 4);
    const microReadingUnlocked = unlockedWordsCount >= 25 && activeSchemasCount >= 6;

    return {
      unlockedWordsCount,
      activeSchemasCount,
      availableTransformCount,
      availableErrorPatternsCount,
      unlockedSeparableCount,
      unlockedAspectModalCount,
      translation_prod: {
        unlocked: translationProdUnlocked,
        unlockedWordsCount,
        requiredWords: 12,
        detailProgressText: translationProdUnlocked
          ? `Ready • ${activeSchemasCount} active grammar patterns`
          : `Unlocks at 12+ words (${unlockedWordsCount}/12) & 4 grammar patterns (${activeSchemasCount}/4)`
      },
      open_cloze: {
        unlocked: openClozeUnlocked,
        unlockedWordsCount,
        requiredWords: 15,
        detailProgressText: openClozeUnlocked
          ? `Ready • ${activeSchemasCount} active grammar patterns`
          : `Unlocks at 15+ words (${unlockedWordsCount}/15) & 5 grammar patterns (${activeSchemasCount}/5)`
      },
      syntax_transform: {
        unlocked: syntaxTransformUnlocked,
        unlockedWordsCount,
        requiredWords: 18,
        detailProgressText: syntaxTransformUnlocked
          ? `Ready • ${availableTransformCount} syntax transformations`
          : `Unlocks at 18+ words (${unlockedWordsCount}/18) & 3 transform patterns (${availableTransformCount}/3)`
      },
      error_spotter: {
        unlocked: errorSpotterUnlocked,
        unlockedWordsCount,
        requiredWords: 20,
        detailProgressText: errorSpotterUnlocked
          ? `Ready • ${availableErrorPatternsCount} diagnostic error patterns`
          : `Unlocks at 20+ words (${unlockedWordsCount}/20) & 4 error patterns (${availableErrorPatternsCount}/4)`
      },
      contextual_writing: {
        unlocked: contextualWritingUnlocked,
        unlockedWordsCount,
        requiredWords: 15,
        detailProgressText: contextualWritingUnlocked
          ? `Ready • ${activeSchemasCount} active context patterns`
          : `Unlocks at 15+ words (${unlockedWordsCount}/15) & 4 grammar patterns (${activeSchemasCount}/4)`
      },
      grammar_lab: {
        unlocked: grammarLabUnlocked,
        unlockedWordsCount,
        requiredWords: 20,
        detailProgressText: grammarLabUnlocked
          ? `Ready • ${unlockedSeparableCount} separable verbs & ${unlockedAspectModalCount} aspect/modal particles`
          : `Unlocks at 20+ words (${unlockedWordsCount}/20) & 2 separable verbs (${unlockedSeparableCount}/2) or 4 aspect/modal particles (${unlockedAspectModalCount}/4)`
      },
      micro_reading: {
        unlocked: microReadingUnlocked,
        unlockedWordsCount,
        requiredWords: 25,
        detailProgressText: microReadingUnlocked
          ? `Ready • ${activeSchemasCount} story grammar patterns`
          : `Unlocks at 25+ words (${unlockedWordsCount}/25) & 6 grammar patterns (${activeSchemasCount}/6)`
      }
    };
  } catch (err) {
    console.warn('[TranslationGrader] getGenerativeEngineReadiness failed:', err);
    return createLockedGenerativeReadiness(unlockedWordsCount);
  }
}
