// ============================================================================
// GENERATIVE GRAMMAR, TRANSFORM, ERROR-SPOTTER & PASSAGE ENGINE (100% Offline)
// Strictly draws words ONLY from `enrichedUnlockedWords`—never pulling locked
// vocabulary from the silent master lexicon.
// ============================================================================

import { enrichWordEntry } from './lexiconEnricher.js';
import {
  GRAMMAR_SCHEMAS,
  buildUnlockedPoolMap,
  checkRequiredParticlesUnlocked,
  doesClassifierMatchNoun,
  doesModifierMatchSeparable,
  getParticleEntry,
  getWordPos,
  hasAnyFeature,
  hasFeature,
  realizeEnglishNoun,
  realizeEnglishVerb,
  realizeSubjectEnglish,
  splitSeparableVerbParts
} from './grammarSchemas.js';
import {
  mineCorpusSentences,
  minedSentenceToOpenClozeItem,
  minedSentenceToTranslationItem,
  minedSentenceToMicroReadingPassage
} from './corpusMiner.js';

const SCHEMA_BY_ID = new Map(GRAMMAR_SCHEMAS.map((s) => [s.id, s]));

function normalizeUnlockedPool(enrichedUnlockedWords = []) {
  if (!Array.isArray(enrichedUnlockedWords)) return [];
  const seen = new Set();
  const list = [];
  for (let i = 0; i < enrichedUnlockedWords.length; i++) {
    const raw = enrichedUnlockedWords[i];
    if (!raw || typeof raw !== 'object' || typeof raw.hanzi !== 'string') continue;
    const key = raw.hanzi.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    try {
      list.push(raw.linguistics ? raw : enrichWordEntry(raw));
    } catch (err) {
      console.warn('[GrammarEngine] Failed to enrich unlocked word:', key, err);
    }
  }
  return list;
}

function shuffleCopy(arr = []) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function getWordPriorityWeight(word) {
  const raw = Number(word?.priorityWeight ?? word?.linguistics?.priorityWeight ?? 1.0);
  return Number.isFinite(raw) && raw > 0 ? raw : 1.0;
}

function weightedShuffleWords(arr = []) {
  if (!Array.isArray(arr) || arr.length <= 1) return [...(arr || [])];
  const pool = [...arr];
  const ordered = [];
  while (pool.length > 0) {
    const weights = pool.map((w) => getWordPriorityWeight(w));
    const total = weights.reduce((acc, w) => acc + w, 0);
    if (total <= 0) {
      ordered.push(...shuffleCopy(pool));
      break;
    }
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    ordered.push(pool.splice(idx, 1)[0]);
  }
  return ordered;
}

function scoreCandidateWord(word, { focusSet, srsSet }) {
  const priorityWeight = getWordPriorityWeight(word);
  let score = (0.4 + Math.random()) * priorityWeight * 1.5;
  if (focusSet?.has(word.hanzi)) score += 6 * Math.max(0.75, priorityWeight);
  if (srsSet?.has(word.hanzi)) score += 3.5 * Math.max(0.75, priorityWeight);
  return score;
}

const MAX_BACKTRACK_STEPS = 300;

function safeSlotFilter(slotDef, word, chosen, poolMap) {
  if (!slotDef || typeof slotDef.filter !== 'function' || !word) return false;
  try {
    return Boolean(slotDef.filter(word, chosen, poolMap));
  } catch (err) {
    console.warn('[GrammarEngine] Slot filter error:', slotDef.role, err);
    return false;
  }
}

/**
 * Backtracking slot solver that finds a semantically valid slot assignment for
 * a schema strictly from `pool`, optionally locking `targetWord` into one of
 * the slots (or matching a required particle).
 */
function findSlotAssignment(
  schema,
  pool,
  poolMap,
  {
    targetWord = null,
    fixedSlots = null,
    focusSet = null,
    srsSet = null
  } = {}
) {
  if (!schema || !Array.isArray(pool) || pool.length === 0) return null;
  if (!checkRequiredParticlesUnlocked(schema, poolMap)) return null;

  const targetHanzi = targetWord?.hanzi || null;
  const targetIsRequiredParticle =
    Boolean(targetHanzi) && (schema.requiredParticles || []).includes(targetHanzi);

  const slotDefs = Array.isArray(schema.slots) ? schema.slots : [];
  const chosen = fixedSlots ? { ...fixedSlots } : {};
  let steps = 0;

  const solve = (slotIdx, targetPlaced) => {
    if (steps >= MAX_BACKTRACK_STEPS) return false;
    steps += 1;

    if (slotIdx >= slotDefs.length) {
      return !targetHanzi || targetPlaced || targetIsRequiredParticle;
    }

    const slotDef = slotDefs[slotIdx];
    const role = slotDef?.role;
    if (!role) return false;

    // Respect pre-pinned slot (used by Syntax Transform so base & target share exact words)
    if (chosen[role]) {
      const pinned = chosen[role];
      if (!safeSlotFilter(slotDef, pinned, chosen, poolMap)) return false;
      const nowPlaced = targetPlaced || (targetHanzi && pinned.hanzi === targetHanzi);
      return solve(slotIdx + 1, nowPlaced);
    }

    let candidates = pool.filter((w) => safeSlotFilter(slotDef, w, chosen, poolMap));
    if (candidates.length === 0) return false;

    // Prioritize targetWord first if it fits this slot, then focus/SRS words + light randomness
    candidates = candidates
      .map((w) => ({
        w,
        score:
          (targetHanzi && w.hanzi === targetHanzi && !targetPlaced ? 100 : 0) +
          scoreCandidateWord(w, { focusSet, srsSet })
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.w);

    const maxBranch = Math.min(candidates.length, 8);
    for (let i = 0; i < maxBranch; i++) {
      if (steps >= MAX_BACKTRACK_STEPS) return false;
      const cand = candidates[i];
      chosen[role] = cand;
      const nowPlaced = targetPlaced || (targetHanzi && cand.hanzi === targetHanzi);
      if (solve(slotIdx + 1, nowPlaced)) {
        return true;
      }
      delete chosen[role];
    }

    return false;
  };

  try {
    const success = solve(0, false);
    return success ? chosen : null;
  } catch (err) {
    console.warn('[GrammarEngine] Slot solver failed for schema:', schema?.id, err);
    return null;
  }
}

function finalizeGeneratedSentence(schema, slots, poolMap, targetWord = null) {
  if (!schema || typeof schema.realize !== 'function' || !slots) return null;
  try {
    const realized = schema.realize(slots, poolMap);
    if (!realized || !Array.isArray(realized.tokens) || realized.tokens.length === 0) {
      return null;
    }
    const targetHanzi = targetWord?.hanzi || null;
    const tokens = realized.tokens.map((tok) => ({
      ...tok,
      isTarget: Boolean(
        targetHanzi &&
          (tok.hanzi === targetHanzi || tok.sourceWord?.hanzi === targetHanzi)
      )
    }));

    return {
      id: `gen_${schema.id}_${tokens.map((t) => t.hanzi).join('')}_${Math.floor(Math.random() * 10000)}`,
      schemaId: schema.id,
      hskLevel: schema.hskLevel,
      title: schema.title,
      ruleSummary: schema.ruleSummary,
      targetWord: targetWord || null,
      slots,
      ...realized,
      tokens
    };
  } catch (err) {
    console.warn('[GrammarEngine] Realization failed for schema:', schema?.id, err);
    return null;
  }
}

// ============================================================================
// 1. ACTIVE GRAMMAR SCHEMAS INSPECTOR
// ============================================================================

/**
 * Returns only schemas whose `requiredParticles` AND semantic slots can be
 * fully satisfied using the learner's `enrichedUnlockedWords`.
 */
export function getActiveGrammarSchemas(enrichedUnlockedWords = []) {
  try {
    const pool = normalizeUnlockedPool(enrichedUnlockedWords);
    if (pool.length === 0) return [];
    const poolMap = buildUnlockedPoolMap(pool);

    return GRAMMAR_SCHEMAS.filter((schema) => {
      try {
        if (!checkRequiredParticlesUnlocked(schema, poolMap)) return false;
        return Boolean(findSlotAssignment(schema, pool, poolMap));
      } catch (err) {
        console.warn('[GrammarEngine] Active schema check failed:', schema?.id, err);
        return false;
      }
    });
  } catch (err) {
    console.warn('[GrammarEngine] getActiveGrammarSchemas failed:', err);
    return [];
  }
}

// ============================================================================
// 2. SINGLE-WORD SENTENCE GENERATOR
// ============================================================================

/**
 * Generates a coherent Mandarin sentence featuring `targetWord` using strictly
 * unlocked vocabulary, or returns `null` if no valid schema matches yet.
 */
export function generateSentenceForWord(
  targetWord,
  enrichedUnlockedWords = [],
  options = {}
) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length === 0) return null;

  const enrichedTarget = targetWord
    ? targetWord.linguistics
      ? targetWord
      : enrichWordEntry(targetWord)
    : null;

  // Ensure targetWord itself is in the pool if caller passed a valid unlocked word
  const poolMap = buildUnlockedPoolMap(pool);
  if (enrichedTarget?.hanzi && !poolMap.has(enrichedTarget.hanzi)) {
    return null;
  }

  const {
    schemaId = null,
    excludeSchemaIds = [],
    srsDueHanziSet = new Set(),
    focusWords = []
  } = options || {};

  const excludeSet = new Set(Array.isArray(excludeSchemaIds) ? excludeSchemaIds : []);
  const focusSet = new Set(
    (Array.isArray(focusWords) ? focusWords : []).map((w) => (typeof w === 'string' ? w : w?.hanzi)).filter(Boolean)
  );
  if (enrichedTarget?.hanzi) focusSet.add(enrichedTarget.hanzi);

  const srsSet =
    srsDueHanziSet instanceof Set
      ? srsDueHanziSet
      : new Set(Array.isArray(srsDueHanziSet) ? srsDueHanziSet : []);

  let candidateSchemas = schemaId
    ? [SCHEMA_BY_ID.get(schemaId)].filter(Boolean)
    : shuffleCopy(GRAMMAR_SCHEMAS).filter((s) => !excludeSet.has(s.id));

  // If targeting a separable verb, prefer separable schemas first!
  if (enrichedTarget && (enrichedTarget.isSeparable || enrichedTarget.linguistics?.isSeparable)) {
    candidateSchemas = [
      ...candidateSchemas.filter((s) => s.id.startsWith('separable_')),
      ...candidateSchemas.filter((s) => !s.id.startsWith('separable_'))
    ];
  }

  for (let i = 0; i < candidateSchemas.length; i++) {
    const schema = candidateSchemas[i];
    try {
      const slots = findSlotAssignment(schema, pool, poolMap, {
        targetWord: enrichedTarget,
        focusSet,
        srsSet
      });
      if (slots) {
        const finalized = finalizeGeneratedSentence(schema, slots, poolMap, enrichedTarget);
        if (finalized) return finalized;
      }
    } catch (err) {
      console.warn('[GrammarEngine] generateSentenceForWord schema failed:', schema?.id, err);
    }
  }

  return null;
}

// ============================================================================
// 3. GENERATIVE BATCH BUILDER
// ============================================================================

/**
 * Generates a deduplicated hybrid batch of sentences (~50% i+0 corpus-mined items
 * when available + ~50% schema-generated sentences), prioritizing `focusWords`
 * and `srsDueHanziSet`.
 * @param {any[]} enrichedUnlockedWords
 * @param {{ count?: number, focusWords?: any[], srsDueHanziSet?: Set<string> | string[], mode?: string }} [options]
 */
export function generateGenerativeBatch(
  enrichedUnlockedWords = [],
  { count = 6, focusWords = [], srsDueHanziSet = new Set(), mode = 'translation_prod' } = {}
) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length === 0) return [];
  const poolMap = buildUnlockedPoolMap(pool);

  const srsSet =
    srsDueHanziSet instanceof Set
      ? srsDueHanziSet
      : new Set(Array.isArray(srsDueHanziSet) ? srsDueHanziSet : []);

  const focusList = (Array.isArray(focusWords) ? focusWords : [])
    .map((w) => (typeof w === 'string' ? poolMap.get(w) : poolMap.get(w?.hanzi)))
    .filter(Boolean);
  const srsList = pool.filter(
    (w) => srsSet.has(w.hanzi) && !focusList.some((f) => f.hanzi === w.hanzi)
  );
  const remainingList = weightedShuffleWords(
    pool.filter(
      (w) =>
        !focusList.some((f) => f.hanzi === w.hanzi) &&
        !srsList.some((s) => s.hanzi === w.hanzi)
    )
  );

  const priorityQueue = [
    ...weightedShuffleWords(focusList),
    ...weightedShuffleWords(srsList),
    ...remainingList
  ];
  const results = [];
  const seenHanzi = new Set();
  const usedSchemaIds = [];

  // Hybrid Phase 5A Blending: mine ~50% i+0 natural corpus sentences rotating across focusList
  const corpusTargetCount = Math.floor(count / 2);
  const backupCorpusItems = [];
  if (corpusTargetCount > 0) {
    try {
      const shuffledFocus = weightedShuffleWords(focusList);
      const focusTargets =
        shuffledFocus.length > 0
          ? shuffledFocus.slice(0, Math.min(shuffledFocus.length, Math.max(2, corpusTargetCount)))
          : [null];
      const minedList = [];
      const seenMinedHanzi = new Set();

      const perTargetLimit = Math.max(2, Math.ceil(count / focusTargets.length));
      for (let fIdx = 0; fIdx < focusTargets.length && minedList.length < count * 2; fIdx++) {
        const partial = mineCorpusSentences(pool, {
          mode: 'i0_only',
          targetWord: focusTargets[fIdx] || null,
          srsDueHanziSet: srsSet,
          limit: perTargetLimit
        });
        for (let p = 0; p < partial.length; p++) {
          const m = partial[p];
          if (m && m.hanzi && !seenMinedHanzi.has(m.hanzi)) {
            seenMinedHanzi.add(m.hanzi);
            minedList.push(m);
          }
        }
      }

      if (minedList.length < count) {
        const extraMined = mineCorpusSentences(pool, {
          mode: 'i0_only',
          targetWord: null,
          srsDueHanziSet: srsSet,
          limit: count
        });
        for (let p = 0; p < extraMined.length; p++) {
          const m = extraMined[p];
          if (m && m.hanzi && !seenMinedHanzi.has(m.hanzi)) {
            seenMinedHanzi.add(m.hanzi);
            minedList.push(m);
          }
        }
      }

      for (let i = 0; i < minedList.length; i++) {
        const mined = minedList[i];
        if (!mined || !mined.hanzi || seenHanzi.has(mined.hanzi)) continue;
        const converted =
          mode === 'open_cloze'
            ? minedSentenceToOpenClozeItem(mined, pool)
            : minedSentenceToTranslationItem(mined, pool);
        if (!converted) continue;
        if (results.length < corpusTargetCount) {
          seenHanzi.add(converted.hanzi);
          results.push(converted);
        } else {
          backupCorpusItems.push(converted);
        }
      }
    } catch (err) {
      console.warn('[GrammarEngine] Corpus blend skipped due to error:', err);
    }
  }

  // Pass 1: maximize schema diversity while prioritizing focus & SRS words
  for (let i = 0; i < priorityQueue.length && results.length < count; i++) {
    const word = priorityQueue[i];
    const sent = generateSentenceForWord(word, pool, {
      excludeSchemaIds: usedSchemaIds,
      focusWords: focusList,
      srsDueHanziSet: srsSet
    });
    if (sent && !seenHanzi.has(sent.hanzi)) {
      seenHanzi.add(sent.hanzi);
      usedSchemaIds.push(sent.schemaId);
      results.push(sent);
    }
  }

  // Pass 2: allow schema reuse if still below requested count
  let guard = 0;
  while (results.length < count && guard < count * 5) {
    guard++;
    const word = priorityQueue[guard % Math.max(1, priorityQueue.length)];
    const sent = generateSentenceForWord(word, pool, {
      focusWords: focusList,
      srsDueHanziSet: srsSet
    });
    if (sent && !seenHanzi.has(sent.hanzi)) {
      seenHanzi.add(sent.hanzi);
      results.push(sent);
    }
  }

  // Top up from any remaining unused i+0 corpus items if schema generation fell short
  for (let i = 0; i < backupCorpusItems.length && results.length < count; i++) {
    const item = backupCorpusItems[i];
    if (item && !seenHanzi.has(item.hanzi)) {
      seenHanzi.add(item.hanzi);
      results.push(item);
    }
  }

  return shuffleCopy(results);
}

// ============================================================================
// 4. SYNTAX TRANSFORMATION GENERATOR
// ============================================================================

const SYNTAX_TRANSFORM_PAIRS = [
  {
    transformType: 'to_yes_no_ma',
    baseSchemaId: 'shi_identity',
    targetSchemaId: 'shi_ma',
    instruction: 'Transform this statement into a Yes/No question using 吗 (ma).'
  },
  {
    transformType: 'to_negation',
    baseSchemaId: 'shi_identity',
    targetSchemaId: 'shi_neg',
    instruction: 'Negate this identity statement using 不 (bù).'
  },
  {
    transformType: 'to_negation',
    baseSchemaId: 'adj_hen',
    targetSchemaId: 'adj_neg',
    instruction: 'Negate this adjective description using 不 (bù) (drop 很).'
  },
  {
    transformType: 'to_negation',
    baseSchemaId: 'you_possession',
    targetSchemaId: 'you_neg',
    instruction: 'Negate this possession sentence using 没有 (méiyǒu) (never 不有).'
  },
  {
    transformType: 'to_a_not_a',
    baseSchemaId: 'adj_hen',
    targetSchemaId: 'a_not_a_adj',
    instruction: 'Rewrite this description as an A-not-A question (Adj + 不 + Adj, no 吗).'
  },
  {
    transformType: 'to_a_not_a',
    baseSchemaId: 'time_action',
    targetSchemaId: 'a_not_a_verb',
    instruction: 'Turn the core action into an A-not-A question (V + 不 + V, no 吗).'
  },
  {
    transformType: 'to_past_negative',
    baseSchemaId: 'completed_le_obj',
    targetSchemaId: 'past_neg_mei',
    instruction: 'Negate this completed past action using 没 (méi) and drop 了.'
  },
  {
    transformType: 'to_progressive',
    baseSchemaId: 'modal_xiang',
    targetSchemaId: 'progressive_zhengzai',
    instruction: 'Change this desire into an ongoing action happening right now using 正在...呢.'
  },
  {
    transformType: 'to_suggestion_ba',
    baseSchemaId: 'modal_xiang',
    targetSchemaId: 'suggestion_ba',
    instruction: 'Turn this into a friendly group suggestion using 我们...吧 ("Let\'s...").'
  }
];

/**
 * Generates a paired Syntax Transformation task where both base and expected
 * sentences share the same unlocked semantic slots.
 */
export function generateSyntaxTransformItem(enrichedUnlockedWords = [], focusWord = null) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length === 0) return null;
  const poolMap = buildUnlockedPoolMap(pool);

  const enrichedFocus = focusWord
    ? poolMap.get(typeof focusWord === 'string' ? focusWord : focusWord.hanzi) || null
    : null;

  const shuffledPairs = shuffleCopy(SYNTAX_TRANSFORM_PAIRS);

  for (let i = 0; i < shuffledPairs.length; i++) {
    const pair = shuffledPairs[i];
    try {
      const baseSchema = SCHEMA_BY_ID.get(pair.baseSchemaId);
      const targetSchema = SCHEMA_BY_ID.get(pair.targetSchemaId);
      if (!baseSchema || !targetSchema) continue;
      if (
        !checkRequiredParticlesUnlocked(baseSchema, poolMap) ||
        !checkRequiredParticlesUnlocked(targetSchema, poolMap)
      ) {
        continue;
      }

      // Solve target schema first (often more constrained, e.g. single-char verb/adj or classifier)
      const targetSlots = findSlotAssignment(targetSchema, pool, poolMap, {
        targetWord: enrichedFocus
      });
      if (!targetSlots) continue;

      // Carry overlapping semantic slots into the base schema
      const sharedSlots = {};
      const baseRoles = new Set((baseSchema.slots || []).map((s) => s.role));
      Object.keys(targetSlots).forEach((role) => {
        if (baseRoles.has(role)) sharedSlots[role] = targetSlots[role];
      });
      // Bridge noun <-> subject for adj_hen <-> a_not_a_adj
      if (pair.baseSchemaId === 'adj_hen' && pair.targetSchemaId === 'a_not_a_adj' && targetSlots.noun) {
        sharedSlots.subject = targetSlots.noun;
      }
      // Bridge object <-> noun for completed_le_obj <-> past_neg_mei / time_action
      if (pair.targetSchemaId === 'completed_le_obj' && targetSlots.noun && baseRoles.has('object')) {
        sharedSlots.object = targetSlots.noun;
      }
      if (pair.baseSchemaId === 'completed_le_obj' && targetSlots.object && baseRoles.has('noun')) {
        sharedSlots.noun = targetSlots.object;
      }
      // Bridge subject -> 我们 for modal_xiang -> suggestion_ba so base & target share protagonist
      if (pair.targetSchemaId === 'suggestion_ba' && baseRoles.has('subject')) {
        const women = getParticleEntry('我们', poolMap);
        if (women) sharedSlots.subject = women;
      }

      // For time_action -> a_not_a_verb, restrict time slot to non-past so present V不V matches naturally
      if (pair.baseSchemaId === 'time_action' && pair.targetSchemaId === 'a_not_a_verb') {
        const nonPastTime = shuffleCopy(
          pool.filter(
            (w) =>
              getWordPos(w) === 'time' &&
              !hasFeature(w, 'time_past') &&
              hasAnyFeature(w, ['time_present', 'time_future', 'part_of_day', 'weekday', 'habitual'])
          )
        )[0];
        if (!nonPastTime) continue;
        sharedSlots.time = nonPastTime;
      }

      const baseSlots = findSlotAssignment(baseSchema, pool, poolMap, {
        fixedSlots: sharedSlots
      });
      if (!baseSlots) continue;

      const baseSentence = finalizeGeneratedSentence(baseSchema, baseSlots, poolMap, enrichedFocus);
      const expectedSentence = finalizeGeneratedSentence(
        targetSchema,
        targetSlots,
        poolMap,
        enrichedFocus
      );
      if (!baseSentence || !expectedSentence) continue;

      return {
        id: `xform_${pair.transformType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        transformType: pair.transformType,
        baseSentence,
        instruction: pair.instruction,
        targetGrammarPoint: expectedSentence.grammarPoint,
        expectedSentence
      };
    } catch (err) {
      console.warn('[GrammarEngine] generateSyntaxTransformItem pair failed:', pair?.transformType, err);
    }
  }

  return null;
}

// ============================================================================
// 5. ERROR-SPOTTER GENERATOR (7 REALISTIC L2 MANDARIN ERROR CATEGORIES)
// ============================================================================

function buildErrorItem({
  errorType,
  brokenTokens,
  errorTokenIndex,
  errorTokenIndices = null,
  correctedSentence,
  fixOptions,
  explanation
}) {
  const punct = correctedSentence.hanzi.slice(-1).match(/[。！？]/)
    ? correctedSentence.hanzi.slice(-1)
    : '。';
  const normalizedErrorIndices =
    Array.isArray(errorTokenIndices) && errorTokenIndices.length > 0
      ? Array.from(new Set([errorTokenIndex, ...errorTokenIndices]))
      : [errorTokenIndex];
  return {
    id: `err_${errorType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    errorType,
    brokenTokens,
    brokenHanzi: `${brokenTokens.map((t) => t.hanzi).join('')}${punct}`,
    errorTokenIndex,
    errorTokenIndices: normalizedErrorIndices,
    correctedTokens: correctedSentence.tokens,
    correctedHanzi: correctedSentence.hanzi,
    correctedPinyin: correctedSentence.pinyin,
    english: correctedSentence.english,
    fixOptions: shuffleCopy(fixOptions),
    explanation
  };
}

/**
 * Generates a valid sentence from unlocked words and injects 1 realistic
 * Mandarin learner error with clickable fix options and explanation.
 */
export function generateErrorSpotterItem(enrichedUnlockedWords = [], focusWord = null) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length === 0) return null;
  const poolMap = buildUnlockedPoolMap(pool);
  const enrichedFocus = focusWord
    ? poolMap.get(typeof focusWord === 'string' ? focusWord : focusWord.hanzi) || null
    : null;

  const builders = shuffleCopy([
    // 1. place_after_verb: S + 在 + Place + V + O -> *S + V + O + 在 + Place
    () => {
      const schema = SCHEMA_BY_ID.get('zai_location_action');
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const [tSubj, tZai, tPlace, tVerb, tObj] = correct.tokens;
      const brokenTokens = [tSubj, tVerb, tObj, tZai, tPlace];
      return buildErrorItem({
        errorType: 'place_after_verb',
        brokenTokens,
        errorTokenIndex: 3,
        errorTokenIndices: [3, 4],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: `Move 在${tPlace.hanzi} BEFORE ${tVerb.hanzi}${tObj.hanzi}`, isCorrect: true },
          { id: 'fix_d1', text: `Replace 在 with 是`, isCorrect: false },
          { id: 'fix_d2', text: `Add 的 after ${tVerb.hanzi}`, isCorrect: false }
        ],
        explanation: `In Mandarin, location (在 + Place) must come BEFORE the verb: "${correct.hanzi}" (never at the end like English).`
      });
    },

    // 2. bu_with_you: S + 没有 + N -> *S + 不 + 有 + N
    () => {
      const schema = SCHEMA_BY_ID.get('you_neg');
      const bu = getParticleEntry('不', poolMap);
      const you = getParticleEntry('有', poolMap);
      if (!bu || !you) return null;
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const [tSubj, , tNoun] = correct.tokens;
      const brokenTokens = [
        tSubj,
        { id: 'err_bu', role: 'negation', hanzi: '不', pinyin: bu.pinyin || 'bù', pos: 'adv', sourceWord: bu },
        { id: 'err_you', role: 'verb', hanzi: '有', pinyin: you.pinyin || 'yǒu', pos: 'verb', sourceWord: you },
        tNoun
      ];
      return buildErrorItem({
        errorType: 'bu_with_you',
        brokenTokens,
        errorTokenIndex: 1,
        errorTokenIndices: [1],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: 'Replace 不 with 没 (没有)', isCorrect: true },
          { id: 'fix_d1', text: 'Replace 有 with 是', isCorrect: false },
          { id: 'fix_d2', text: 'Add 了 at the end', isCorrect: false }
        ],
        explanation: `The verb 有 (to have) is ALWAYS negated with 没 (没有), never 不有 → "${correct.hanzi}".`
      });
    },

    // 3. bu_with_past: S + TimePast + 没 + V + O -> *S + TimePast + 不 + V + O
    () => {
      const schema = SCHEMA_BY_ID.get('past_neg_mei');
      const bu = getParticleEntry('不', poolMap);
      if (!bu) return null;
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const brokenTokens = correct.tokens.map((t, idx) =>
        idx === 2 ? { ...t, id: 'err_bu_past', hanzi: '不', pinyin: bu.pinyin || 'bù', sourceWord: bu } : t
      );
      return buildErrorItem({
        errorType: 'bu_with_past',
        brokenTokens,
        errorTokenIndex: 2,
        errorTokenIndices: [2],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: 'Replace 不 with 没 for past negation', isCorrect: true },
          { id: 'fix_d1', text: 'Add 了 after the verb', isCorrect: false },
          { id: 'fix_d2', text: `Move ${slots.timePast.hanzi} to the end`, isCorrect: false }
        ],
        explanation: `Past events (like ${slots.timePast.hanzi}) are negated with 没 (méi), not 不 (bù) → "${correct.hanzi}".`
      });
    },

    // 4. er_before_classifier: S + 有 + 两 + CL + N -> *S + 有 + 二 + CL + N
    () => {
      const schema = SCHEMA_BY_ID.get('you_possession');
      const liang = getParticleEntry('两', poolMap);
      const er = getParticleEntry('二', poolMap);
      if (!liang || !er) return null;
      const slots = findSlotAssignment(schema, pool, poolMap, {
        targetWord: enrichedFocus,
        fixedSlots: { number: liang }
      });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const brokenTokens = correct.tokens.map((t, idx) =>
        idx === 2 ? { ...t, id: 'err_er', hanzi: '二', pinyin: er.pinyin || 'èr', sourceWord: er } : t
      );
      return buildErrorItem({
        errorType: 'er_before_classifier',
        brokenTokens,
        errorTokenIndex: 2,
        errorTokenIndices: [2],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: `Replace 二 with 两 before ${slots.classifier.hanzi}`, isCorrect: true },
          { id: 'fix_d1', text: `Delete the classifier ${slots.classifier.hanzi}`, isCorrect: false },
          { id: 'fix_d2', text: 'Replace 有 with 是', isCorrect: false }
        ],
        explanation: `Always use 两 (liǎng), never 二 (èr), directly before a measure word/classifier → "${correct.hanzi}".`
      });
    },

    // 5. wrong_classifier: S + 有 + Num + CL + N -> *S + 有 + Num + WrongCL + N
    () => {
      const schema = SCHEMA_BY_ID.get('you_possession');
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const wrongCl = shuffleCopy(pool).find(
        (w) =>
          getWordPos(w) === 'classifier' &&
          w.hanzi !== slots.classifier.hanzi &&
          !['岁', '些', '元', '块'].includes(w.hanzi) &&
          !doesClassifierMatchNoun(w, slots.noun)
      );
      if (!wrongCl) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const brokenTokens = correct.tokens.map((t, idx) =>
        idx === 3
          ? { ...t, id: `err_cl_${wrongCl.hanzi}`, hanzi: wrongCl.hanzi, pinyin: wrongCl.pinyin || '', sourceWord: wrongCl }
          : t
      );
      return buildErrorItem({
        errorType: 'wrong_classifier',
        brokenTokens,
        errorTokenIndex: 3,
        errorTokenIndices: [3],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: `Replace ${wrongCl.hanzi} with ${slots.classifier.hanzi}`, isCorrect: true },
          { id: 'fix_d1', text: `Remove ${slots.number.hanzi}`, isCorrect: false },
          { id: 'fix_d2', text: 'Move 有 to the end', isCorrect: false }
        ],
        explanation: `${slots.noun.hanzi} pairs with the measure word ${slots.classifier.hanzi}, not ${wrongCl.hanzi} → "${correct.hanzi}".`
      });
    },

    // 6. misplaced_adverb_ye_dou: PluralS + 都 + V + O -> *都 + PluralS + V + O
    () => {
      const schema = SCHEMA_BY_ID.get('scope_dou');
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const [tSubj, tDou, tVerb, tObj] = correct.tokens;
      const brokenTokens = [tDou, tSubj, tVerb, tObj];
      return buildErrorItem({
        errorType: 'misplaced_adverb_ye_dou',
        brokenTokens,
        errorTokenIndex: 0,
        errorTokenIndices: [0],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: `Move 都 AFTER ${tSubj.hanzi} (before ${tVerb.hanzi})`, isCorrect: true },
          { id: 'fix_d1', text: 'Move 都 to the very end', isCorrect: false },
          { id: 'fix_d2', text: 'Replace 都 with 很', isCorrect: false }
        ],
        explanation: `Adverbs like 都 (dōu) and 也 (yě) always go AFTER the subject and BEFORE the verb → "${correct.hanzi}".`
      });
    },

    // 7. separable_object_error: S + V1 + Mod + V2 -> *S + V1V2 + Mod (e.g. *我上课中文)
    () => {
      const schema = SCHEMA_BY_ID.get('separable_modifier');
      const slots = findSlotAssignment(schema, pool, poolMap, { targetWord: enrichedFocus });
      if (!slots) return null;
      const correct = finalizeGeneratedSentence(schema, slots, poolMap, enrichedFocus);
      if (!correct) return null;
      const [tSubj, tV1, tMod, tV2] = correct.tokens;
      const brokenTokens = [tSubj, tV1, tV2, tMod];
      return buildErrorItem({
        errorType: 'separable_object_error',
        brokenTokens,
        errorTokenIndex: 3,
        errorTokenIndices: [2, 3],
        correctedSentence: correct,
        fixOptions: [
          { id: 'fix_ok', text: `Insert ${tMod.hanzi} INSIDE ${tV1.hanzi} + ${tV2.hanzi} (${tV1.hanzi}${tMod.hanzi}${tV2.hanzi})`, isCorrect: true },
          { id: 'fix_d1', text: `Move ${tMod.hanzi} before ${tSubj.hanzi}`, isCorrect: false },
          { id: 'fix_d2', text: `Add 很 before ${tV1.hanzi}${tV2.hanzi}`, isCorrect: false }
        ],
        explanation: `${slots.separableVerb.hanzi} is a separable verb (离合词): modifiers go INSIDE between ${tV1.hanzi} and ${tV2.hanzi} → "${correct.hanzi}".`
      });
    }
  ]);

  for (let i = 0; i < builders.length; i++) {
    try {
      const item = builders[i]();
      if (item) return item;
    } catch (err) {
      console.warn('[GrammarEngine] generateErrorSpotterItem builder failed:', err);
    }
  }

  return null;
}

// ============================================================================
// 6. SEPARABLE VERB LAB (离合词) GENERATOR
// ============================================================================

/**
 * Generates a targeted `离合词` exercise strictly gated on unlocked separable verbs
 * (e.g. 上课 → 上了课 / 上中文课, 睡觉 → 睡了觉, 看病 → 看了病).
 */
export function generateSeparableVerbLabItem(enrichedUnlockedWords = []) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length === 0) return null;
  const poolMap = buildUnlockedPoolMap(pool);

  const unlockedSeparables = pool.filter(
    (w) =>
      Boolean(w.isSeparable || w.linguistics?.isSeparable) &&
      Array.isArray(w.sepParts || w.linguistics?.sepParts) &&
      (w.sepParts || w.linguistics?.sepParts).length === 2
  );
  if (unlockedSeparables.length === 0) return null;

  const shuffledSep = weightedShuffleWords(unlockedSeparables);
  const le = getParticleEntry('了', poolMap);

  for (let i = 0; i < shuffledSep.length; i++) {
    try {
      const sepWord = shuffledSep[i];
      const parts = splitSeparableVerbParts(sepWord);
      if (!parts) continue;

      // Try modifier insertion first if an unlocked modifier matches (e.g., 上中文课, 看汉语书)
      const matchingMod = weightedShuffleWords(pool).find((m) =>
        doesModifierMatchSeparable(sepWord, m)
      );
      const preferModifier = Boolean(matchingMod) && (!le || Math.random() < 0.5);

      if (preferModifier && matchingMod) {
        const modSchema = SCHEMA_BY_ID.get('separable_modifier');
        const slots = findSlotAssignment(modSchema, pool, poolMap, {
          fixedSlots: { separableVerb: sepWord, modifier: matchingMod }
        });
        if (slots) {
          const realized = finalizeGeneratedSentence(modSchema, slots, poolMap, sepWord);
          if (realized) {
            const correctForm = `${parts.v1}${matchingMod.hanzi}${parts.v2}`;
            const wrong1 = `${sepWord.hanzi}${matchingMod.hanzi}`;
            const wrong2 = `${matchingMod.hanzi}${sepWord.hanzi}`;
            const wrong3 = `${parts.v2}${matchingMod.hanzi}${parts.v1}`;

            return {
              id: `seplab_mod_${sepWord.hanzi}_${Date.now()}`,
              labType: 'insert_modifier',
              separableWord: sepWord,
              sepParts: [parts.v1, parts.v2],
              insertedElement: matchingMod.hanzi,
              promptEnglish: realized.english,
              brokenExample: `${slots.subject.hanzi}${wrong1}。`,
              targetTokens: realized.tokens,
              targetHanzi: realized.hanzi,
              targetPinyin: realized.pinyin,
              english: realized.english,
              options: shuffleCopy([
                { id: 'sep_ok', hanzi: correctForm, isCorrect: true },
                { id: 'sep_w1', hanzi: wrong1, isCorrect: false },
                { id: 'sep_w2', hanzi: wrong2, isCorrect: false },
                { id: 'sep_w3', hanzi: wrong3, isCorrect: false }
              ]),
              explanation: `${sepWord.hanzi} splits into ${parts.v1} + ${parts.v2} (离合词), placing "${matchingMod.hanzi}" inside: ${correctForm} (${realized.hanzi}).`
            };
          }
        }
      }

      // Completed aspect 了 insertion inside V1 + 了 + V2 (e.g., 上了课, 睡了觉, 看了病)
      if (le) {
        const leSchema = SCHEMA_BY_ID.get('separable_le');
        const slots = findSlotAssignment(leSchema, pool, poolMap, {
          fixedSlots: { separableVerb: sepWord }
        });
        const subj =
          slots?.subject ||
          pool.find((w) => getWordPos(w) === 'pron' && hasFeature(w, 'human') && !hasFeature(w, 'interrogative')) ||
          pool.find((w) => hasFeature(w, 'human'));

        if (slots) {
          const realized = finalizeGeneratedSentence(leSchema, slots, poolMap, sepWord);
          if (realized) {
            const correctForm = `${parts.v1}了${parts.v2}`;
            const wrong1 = `了${sepWord.hanzi}`;
            const wrong2 = `${parts.v2}了${parts.v1}`;
            const wrong3 = `${parts.v1}${parts.v2}了${parts.v2}`;

            return {
              id: `seplab_le_${sepWord.hanzi}_${Date.now()}`,
              labType: 'insert_le',
              separableWord: sepWord,
              sepParts: [parts.v1, parts.v2],
              insertedElement: '了',
              promptEnglish: realized.english,
              brokenExample: `${slots.subject.hanzi}${slots.timePast.hanzi}${wrong1}。`,
              targetTokens: realized.tokens,
              targetHanzi: realized.hanzi,
              targetPinyin: realized.pinyin,
              english: realized.english,
              options: shuffleCopy([
                { id: 'sep_ok', hanzi: correctForm, isCorrect: true },
                { id: 'sep_w1', hanzi: wrong1, isCorrect: false },
                { id: 'sep_w2', hanzi: wrong2, isCorrect: false },
                { id: 'sep_w3', hanzi: wrong3, isCorrect: false }
              ]),
              explanation: `Insert aspect particle 了 directly after the verb character "${parts.v1}" inside ${sepWord.hanzi}: ${correctForm} (${realized.hanzi}).`
            };
          }
        } else if (subj) {
          // Fallback when no past-time word (like 昨天) is unlocked yet: S + V1 + 了 + V2。
          const subjEn = realizeSubjectEnglish(subj);
          const subjText = subjEn?.text || 'Someone';
          const pastEn = realizeEnglishVerb(sepWord.enGloss || sepWord.meaning, {
            subjectType: subjEn?.subjectType || '3sg',
            tense: 'past'
          });
          const correctForm = `${parts.v1}了${parts.v2}`;
          const hanzi = `${subj.hanzi}${correctForm}。`;
          const pinyin = [subj.pinyin, parts.v1Pinyin, le.pinyin || 'le', parts.v2Pinyin]
            .filter(Boolean)
            .join(' ');
          const english = `${subjText[0].toUpperCase()}${subjText.slice(1)} ${pastEn}.`;

          return {
            id: `seplab_le_short_${sepWord.hanzi}_${Date.now()}`,
            labType: 'insert_le',
            separableWord: sepWord,
            sepParts: [parts.v1, parts.v2],
            insertedElement: '了',
            promptEnglish: english,
            brokenExample: `${subj.hanzi}了${sepWord.hanzi}。`,
            targetTokens: [
              { id: `sep_s_${subj.hanzi}`, role: 'subject', hanzi: subj.hanzi, pinyin: subj.pinyin || '', pos: getWordPos(subj), sourceWord: subj },
              { id: `sep_v1_${parts.v1}`, role: 'sep_v1', hanzi: parts.v1, pinyin: parts.v1Pinyin, pos: 'verb', sourceWord: sepWord },
              { id: 'sep_le', role: 'aspect', hanzi: '了', pinyin: le.pinyin || 'le', pos: 'particle', sourceWord: le },
              { id: `sep_v2_${parts.v2}`, role: 'sep_v2', hanzi: parts.v2, pinyin: parts.v2Pinyin, pos: 'noun', sourceWord: sepWord }
            ],
            targetHanzi: hanzi,
            targetPinyin: pinyin,
            english,
            options: shuffleCopy([
              { id: 'sep_ok', hanzi: correctForm, isCorrect: true },
              { id: 'sep_w1', hanzi: `了${sepWord.hanzi}`, isCorrect: false },
              { id: 'sep_w2', hanzi: `${parts.v2}了${parts.v1}`, isCorrect: false },
              { id: 'sep_w3', hanzi: `${parts.v1}${parts.v2}了${parts.v2}`, isCorrect: false }
            ]),
            explanation: `Insert 了 between "${parts.v1}" and "${parts.v2}" in ${sepWord.hanzi} → ${correctForm} (${hanzi}).`
          };
        }
      }
    } catch (err) {
      console.warn('[GrammarEngine] generateSeparableVerbLabItem failed:', err);
    }
  }

  return null;
}

// ============================================================================
// 7. MICRO-READING PASSAGE GENERATOR (3-SENTENCE STORY + 2 ANTI-SPOILER Qs)
// ============================================================================

function pickDistractorWords(correctWord, pool, predicate, count = 3) {
  const sameCategory = weightedShuffleWords(
    pool.filter((w) => w.hanzi !== correctWord.hanzi && predicate(w))
  );
  const generalFallback = weightedShuffleWords(
    pool.filter(
      (w) =>
        w.hanzi !== correctWord.hanzi &&
        !sameCategory.some((c) => c.hanzi === w.hanzi) &&
        ['noun', 'place', 'time', 'adj'].includes(getWordPos(w))
    )
  );
  return [...sameCategory, ...generalFallback].slice(0, count);
}

function buildComprehensionQuestionFromSentence(
  sentence,
  protagonistEn,
  pool,
  qIndex,
  protagonistWord = null
) {
  const { slots, schemaId } = sentence;
  const isFirstPerson = protagonistWord?.hanzi === '我' || protagonistEn === 'I';
  const displayProtagonist = isFirstPerson ? 'the speaker' : protagonistEn;
  const possessiveProtagonist = isFirstPerson
    ? "the speaker's"
    : `${displayProtagonist}'s`;

  if (schemaId === 'shi_identity' && slots?.noun) {
    const ans = slots.noun;
    const distractors = pickDistractorWords(ans, pool, (w) => getWordPos(w) === 'noun' && hasFeature(w, 'human'));
    if (distractors.length < 3) return null;
    return {
      id: `mr_q_${qIndex}_${schemaId}`,
      prompt: `According to the passage, who is ${displayProtagonist}?`,
      options: shuffleCopy([
        { id: `mr_opt_ok_${qIndex}`, text: realizeEnglishNoun(ans.enGloss || ans.meaning, { count: 1, indefinite: true }), hanzi: ans.hanzi, isCorrect: true },
        ...distractors.map((d, idx) => ({
          id: `mr_opt_d_${qIndex}_${idx}`,
          text: realizeEnglishNoun(d.enGloss || d.meaning, { count: 1, indefinite: true }),
          hanzi: d.hanzi,
          isCorrect: false
        }))
      ]),
      explanation: `${sentence.hanzi} (${sentence.pinyin}) — "${sentence.english}"`
    };
  }

  if (slots?.place && ['zai_location_action', 'time_place_action', 'serial_qu_place_v'].includes(schemaId)) {
    const ans = slots.place;
    const distractors = pickDistractorWords(ans, pool, (w) => getWordPos(w) === 'place' && !hasAnyFeature(w, ['interrogative', 'location']));
    if (distractors.length < 3) return null;
    return {
      id: `mr_q_${qIndex}_${schemaId}`,
      prompt: `Where does ${displayProtagonist} go or do the activity in the passage?`,
      options: shuffleCopy([
        { id: `mr_opt_ok_${qIndex}`, text: realizeEnglishNoun(ans.enGloss || ans.meaning, { count: 1 }), hanzi: ans.hanzi, isCorrect: true },
        ...distractors.map((d, idx) => ({
          id: `mr_opt_d_${qIndex}_${idx}`,
          text: realizeEnglishNoun(d.enGloss || d.meaning, { count: 1 }),
          hanzi: d.hanzi,
          isCorrect: false
        }))
      ]),
      explanation: `${sentence.hanzi} (${sentence.pinyin}) — "${sentence.english}"`
    };
  }

  if (slots?.object && slots?.verb) {
    const ans = slots.object;
    const verbBase = realizeEnglishVerb(slots.verb.enGloss || slots.verb.meaning, { subjectType: '1pl' });
    const distractors = pickDistractorWords(ans, pool, (w) => getWordPos(w) === getWordPos(ans));
    if (distractors.length < 3) return null;
    return {
      id: `mr_q_${qIndex}_${schemaId}`,
      prompt: `What does ${displayProtagonist} ${verbBase} in the passage?`,
      options: shuffleCopy([
        { id: `mr_opt_ok_${qIndex}`, text: realizeEnglishNoun(ans.enGloss || ans.meaning, { count: 1 }), hanzi: ans.hanzi, isCorrect: true },
        ...distractors.map((d, idx) => ({
          id: `mr_opt_d_${qIndex}_${idx}`,
          text: realizeEnglishNoun(d.enGloss || d.meaning, { count: 1 }),
          hanzi: d.hanzi,
          isCorrect: false
        }))
      ]),
      explanation: `${sentence.hanzi} (${sentence.pinyin}) — "${sentence.english}"`
    };
  }

  if (slots?.noun && ['you_possession', 'completed_le_obj', 'you_neg'].includes(schemaId)) {
    const ans = slots.noun;
    const distractors = pickDistractorWords(ans, pool, (w) => getWordPos(w) === 'noun');
    if (distractors.length < 3) return null;
    const prompt =
      schemaId === 'you_neg'
        ? `What does ${displayProtagonist} NOT have?`
        : schemaId === 'completed_le_obj'
        ? `Which item did ${displayProtagonist} mention in the past event?`
        : `What does ${displayProtagonist} have?`;
    return {
      id: `mr_q_${qIndex}_${schemaId}`,
      prompt,
      options: shuffleCopy([
        { id: `mr_opt_ok_${qIndex}`, text: realizeEnglishNoun(ans.enGloss || ans.meaning, { count: 1 }), hanzi: ans.hanzi, isCorrect: true },
        ...distractors.map((d, idx) => ({
          id: `mr_opt_d_${qIndex}_${idx}`,
          text: realizeEnglishNoun(d.enGloss || d.meaning, { count: 1 }),
          hanzi: d.hanzi,
          isCorrect: false
        }))
      ]),
      explanation: `${sentence.hanzi} (${sentence.pinyin}) — "${sentence.english}"`
    };
  }

  if (slots?.adj) {
    const ans = slots.adj;
    const distractors = pickDistractorWords(ans, pool, (w) => getWordPos(w) === 'adj');
    if (distractors.length < 3) return null;
    const describedTarget =
      schemaId === 'de_possessive' && slots?.noun
        ? `${possessiveProtagonist} ${realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, { count: 1 })}`
        : displayProtagonist;
    return {
      id: `mr_q_${qIndex}_${schemaId}`,
      prompt: `How is ${describedTarget} described in the passage?`,
      options: shuffleCopy([
        { id: `mr_opt_ok_${qIndex}`, text: (ans.meaning || ans.english || '').split(/[;/]/)[0].trim(), hanzi: ans.hanzi, isCorrect: true },
        ...distractors.map((d, idx) => ({
          id: `mr_opt_d_${qIndex}_${idx}`,
          text: (d.meaning || d.english || '').split(/[;/]/)[0].trim(),
          hanzi: d.hanzi,
          isCorrect: false
        }))
      ]),
      explanation: `${sentence.hanzi} (${sentence.pinyin}) — "${sentence.english}"`
    };
  }

  return null;
}

function buildProceduralMicroReadingPassage(pool) {
  const poolMap = buildUnlockedPoolMap(pool);

  const protagonists = weightedShuffleWords(
    pool.filter(
      (w) =>
        (getWordPos(w) === 'pron' &&
          hasFeature(w, 'human') &&
          hasFeature(w, 'singular') &&
          ['我', '他', '她'].includes(w.hanzi)) ||
        (getWordPos(w) === 'noun' &&
          hasFeature(w, 'human') &&
          ['爸爸', '妈妈', '朋友', '老师', '学生', '同学'].includes(w.hanzi))
    )
  );
  if (protagonists.length === 0) return null;

  const beatSchemaGroups = [
    // Beat 1: Introduction / Identity / State
    ['shi_identity', 'you_possession', 'adj_hen', 'de_possessive'],
    // Beat 2: Routine / Place / Action / Desire
    ['time_place_action', 'zai_location_action', 'serial_qu_place_v', 'time_action', 'modal_xiang', 'modal_hui'],
    // Beat 3: Completed event / Experience / Wrap-up
    ['completed_le_obj', 'separable_le', 'separable_modifier', 'experiential_guo', 'past_neg_mei', 'modal_yao', 'you_neg', 'adj_hen']
  ];

  for (let pIdx = 0; pIdx < protagonists.length; pIdx++) {
    const protagonist = protagonists[pIdx];
    const protagonistInfo = realizeSubjectEnglish(protagonist);
    const sentences = [];
    const usedSchemas = new Set();
    const seenHanzi = new Set();

    for (let beat = 0; beat < beatSchemaGroups.length; beat++) {
      const schemaCandidates = shuffleCopy(beatSchemaGroups[beat]);
      for (let sIdx = 0; sIdx < schemaCandidates.length; sIdx++) {
        const sid = schemaCandidates[sIdx];
        if (usedSchemas.has(sid)) continue;
        const schema = SCHEMA_BY_ID.get(sid);
        if (!schema || !checkRequiredParticlesUnlocked(schema, poolMap)) continue;

        const hasSubjectSlot = (schema.slots || []).some((sl) => sl.role === 'subject');
        if (!hasSubjectSlot) continue;

        try {
          const slots = findSlotAssignment(schema, pool, poolMap, {
            fixedSlots: { subject: protagonist }
          });
          if (!slots) continue;

          const realized = finalizeGeneratedSentence(schema, slots, poolMap, protagonist);
          if (!realized || seenHanzi.has(realized.hanzi)) continue;

          seenHanzi.add(realized.hanzi);
          usedSchemas.add(sid);
          sentences.push(realized);
          break;
        } catch (err) {
          console.warn('[GrammarEngine] Micro-reading beat failed:', sid, err);
        }
      }
    }

    if (sentences.length < 3) continue;

    // Build 2 distinct reading comprehension questions (strictly anti-spoiler: no Pinyin in options/prompts)
    const questions = [];
    for (let i = 0; i < sentences.length && questions.length < 2; i++) {
      try {
        const q = buildComprehensionQuestionFromSentence(
          sentences[i],
          protagonistInfo.text,
          pool,
          questions.length,
          protagonist
        );
        if (q && !questions.some((prev) => prev.prompt === q.prompt)) {
          questions.push(q);
        }
      } catch (err) {
        console.warn('[GrammarEngine] Micro-reading question failed:', err);
      }
    }

    if (questions.length < 2) continue;

    return {
      id: `passage_${protagonist.hanzi}_${Date.now()}`,
      title: `Daily Snapshot • ${protagonist.hanzi}`,
      protagonist,
      sentences,
      fullHanzi: sentences.map((s) => s.hanzi).join(''),
      fullPinyin: sentences.map((s) => s.pinyin).join(' '),
      fullEnglish: sentences.map((s) => s.english).join(' '),
      questions,
      sourceType: 'procedural'
    };
  }

  return null;
}

/**
 * Generates a coherent 3-sentence micro-reading passage centered on a single
 * topic or protagonist using ONLY `enrichedUnlockedWords`, plus 2 anti-spoiler
 * reading comprehension questions. Blends ~50% natural corpus passages and
 * ~50% procedural passages when both are available.
 * @param {any[]} [enrichedUnlockedWords]
 * @param {any} [focusWord]
 */
export function generateMicroReadingPassage(enrichedUnlockedWords = [], focusWord = null) {
  const pool = normalizeUnlockedPool(enrichedUnlockedWords);
  if (pool.length < 6) return null;

  const tryCorpus = () => {
    try {
      const corpusPassage = minedSentenceToMicroReadingPassage(pool, focusWord);
      if (
        corpusPassage &&
        Array.isArray(corpusPassage.sentences) &&
        corpusPassage.sentences.length >= 3 &&
        Array.isArray(corpusPassage.questions) &&
        corpusPassage.questions.length >= 2
      ) {
        return corpusPassage;
      }
    } catch (err) {
      console.warn('[GrammarEngine] Corpus micro-reading fallback to procedural:', err);
    }
    return null;
  };

  const preferCorpus = Math.random() < 0.5;
  if (preferCorpus) {
    return tryCorpus() || buildProceduralMicroReadingPassage(pool);
  }
  return buildProceduralMicroReadingPassage(pool) || tryCorpus();
}
