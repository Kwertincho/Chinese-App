// ============================================================================
// LAZY STATIC LINGUISTIC DATA LOADER (100% Client-Side, $0 Cost, Offline-Ready)
// Fetches optional prebuilt static assets from /data/*.json with graceful
// non-blocking fallback when files are absent or served behind an SPA rewrite.
// ============================================================================

import {
  registerExternalCorpusSentences,
  getCorpusSentenceCount
} from './corpusMiner.js';

const LEXICON_DATA_URL = '/data/hsk_lexicon.json';
const CURRICULUM_DATA_URL = '/data/hsk_curriculum.json';
const CORPUS_DATA_URL = '/data/corpus_hsk.json';

let masterLexiconMap = {};
let preloadedCurriculum = { version: null, courses: [] };
let isLoaded = false;
let inFlightLoadPromise = null;

/**
 * Maps ICTCLAS part-of-speech tags (used in complete-hsk-vocabulary `p` arrays)
 * to the canonical HanziApp POS taxonomy.
 */
export function mapIctclasTagsToPos(rawTags) {
  const tags = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string' && rawTags.trim()
    ? [rawTags.trim()]
    : [];

  if (tags.length === 0) return null;

  for (const rawTag of tags) {
    const tag = String(rawTag || '').trim().toLowerCase();
    if (!tag) continue;
    const prefix = tag[0];

    if (tag === 'vg' || tag === 'vd' || tag === 'vn' || prefix === 'v') return 'verb';
    if (tag === 't' || tag === 'tg') return 'time';
    if (tag === 'f' || tag === 's' || tag === 'ns') return 'place';
    if (tag === 'q' || tag === 'mq' || tag === 'm') return 'classifier';
    if (tag === 'r' || tag === 'rr' || tag === 'ry' || tag === 'rz') return 'pron';
    if (tag === 'a' || tag === 'ad' || tag === 'an' || tag === 'ag') return 'adj';
    if (tag === 'd' || tag === 'dg') return 'adv';
    if (tag === 'u' || tag === 'ug' || tag === 'uj' || tag === 'ul' || tag === 'uz') return 'particle';
    if (tag === 'p') return 'prep';
    if (tag === 'c') return 'conj';
    if (tag === 'e' || tag === 'y' || tag === 'o' || tag === 'i' || tag === 'l') return 'expression';
    if (prefix === 'n') return 'noun';
  }

  return null;
}

/**
 * Extracts clean simplified classifier Hanzi tokens from either plain strings
 * (e.g. "杯") or CEDICT/HSK notation (e.g. "個|个[ge4]", "本[ben3]").
 */
function normalizeClassifiers(rawClassifiers) {
  if (!Array.isArray(rawClassifiers)) return [];
  const result = [];

  for (const item of rawClassifiers) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    // Strip bracketed pinyin e.g. [ge4]
    const withoutPinyin = raw.replace(/\[[^\]]*\]/g, '').trim();
    // If traditional|simplified format, take simplified (right side)
    const simplifiedPart = withoutPinyin.includes('|')
      ? withoutPinyin.split('|')[1].trim()
      : withoutPinyin;
    // Keep only CJK characters
    const clean = simplifiedPart.replace(/[^\u4e00-\u9fff]/g, '');
    if (clean && !result.includes(clean)) {
      result.push(clean);
    }
  }

  return result;
}

/**
 * Normalizes a raw entry from either minified `complete-hsk-vocabulary`
 * (`{ s, r, l, q, p, f }`), unminified `complete-hsk-vocabulary`, or
 * pre-enriched `hsk_lexicon.json` records into a unified lookup object.
 */
function normalizeStaticLexiconRecord(rawEntry, explicitHanziKey = '') {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  const isRawHskMinified = typeof rawEntry.s === 'string' && rawEntry.s.trim().length > 0;
  const isRawHskFull = typeof rawEntry.simplified === 'string' && rawEntry.simplified.trim().length > 0;

  const hanzi = String(
    explicitHanziKey ||
      rawEntry.hanzi ||
      (isRawHskMinified ? rawEntry.s : '') ||
      (isRawHskFull ? rawEntry.simplified : '')
  ).trim();

  if (!hanzi) return null;

  if (isRawHskMinified || isRawHskFull) {
    const forms = Array.isArray(rawEntry.f)
      ? rawEntry.f
      : Array.isArray(rawEntry.forms)
      ? rawEntry.forms
      : [];
    const primaryForm = forms[0] || {};
    const transcriptions = primaryForm.i || primaryForm.transcriptions || {};
    const pinyin = String(
      transcriptions.y || transcriptions.pinyin || rawEntry.pinyin || ''
    ).trim();
    const pinyinNum = String(
      transcriptions.n || transcriptions.numeric || rawEntry.pinyinNum || ''
    ).trim();

    const meaningsArr = Array.isArray(primaryForm.m)
      ? primaryForm.m
      : Array.isArray(primaryForm.meanings)
      ? primaryForm.meanings
      : [];
    const meaning = meaningsArr
      .map((m) => String(m || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('; ');

    const rawPosTags = Array.isArray(rawEntry.p)
      ? rawEntry.p
      : Array.isArray(rawEntry.pos)
      ? rawEntry.pos
      : [];

    const allClassifiers = [];
    forms.forEach((fm) => {
      const fmCls = normalizeClassifiers(fm?.c || fm?.classifiers || []);
      fmCls.forEach((c) => {
        if (!allClassifiers.includes(c)) allClassifiers.push(c);
      });
    });

    const hskLevels = Array.isArray(rawEntry.l)
      ? rawEntry.l.map((lv) => String(lv))
      : Array.isArray(rawEntry.level)
      ? rawEntry.level.map((lv) => String(lv))
      : [];

    const freqRankRaw = rawEntry.q ?? rawEntry.frequency ?? rawEntry.freqRank;
    const freqRank =
      typeof freqRankRaw === 'number' && Number.isFinite(freqRankRaw)
        ? freqRankRaw
        : null;

    const radical = String(rawEntry.r || rawEntry.radical || '').trim() || null;

    return {
      hanzi,
      pos: mapIctclasTagsToPos(rawPosTags),
      ictclasPos: rawPosTags,
      features: Array.isArray(rawEntry.features) ? [...rawEntry.features] : [],
      valence: rawEntry.valence && typeof rawEntry.valence === 'object' ? rawEntry.valence : null,
      classifiers: allClassifiers,
      isSeparable: typeof rawEntry.isSeparable === 'boolean' ? rawEntry.isSeparable : null,
      sepParts: Array.isArray(rawEntry.sepParts) ? [...rawEntry.sepParts] : null,
      enGloss: rawEntry.enGloss && typeof rawEntry.enGloss === 'object' ? rawEntry.enGloss : null,
      hskLevels,
      freqRank,
      radical,
      pinyin,
      pinyinNum,
      meaning
    };
  }

  // Standard pre-built /data/hsk_lexicon.json entry
  const rawPosTags = Array.isArray(rawEntry.ictclasPos)
    ? rawEntry.ictclasPos
    : Array.isArray(rawEntry.p)
    ? rawEntry.p
    : [];

  return {
    hanzi,
    pos: rawEntry.pos || mapIctclasTagsToPos(rawPosTags) || null,
    ictclasPos: rawPosTags,
    features: Array.isArray(rawEntry.features) ? [...rawEntry.features] : [],
    valence: rawEntry.valence && typeof rawEntry.valence === 'object' ? rawEntry.valence : null,
    classifiers: normalizeClassifiers(rawEntry.classifiers || []),
    isSeparable: typeof rawEntry.isSeparable === 'boolean' ? rawEntry.isSeparable : null,
    sepParts: Array.isArray(rawEntry.sepParts) ? [...rawEntry.sepParts] : null,
    enGloss: rawEntry.enGloss && typeof rawEntry.enGloss === 'object' ? rawEntry.enGloss : null,
    hskLevels: Array.isArray(rawEntry.hskLevels) ? rawEntry.hskLevels.map(String) : [],
    freqRank:
      typeof rawEntry.freqRank === 'number' && Number.isFinite(rawEntry.freqRank)
        ? rawEntry.freqRank
        : null,
    radical: rawEntry.radical ? String(rawEntry.radical).trim() : null,
    pinyin: rawEntry.pinyin ? String(rawEntry.pinyin).trim() : '',
    pinyinNum: rawEntry.pinyinNum ? String(rawEntry.pinyinNum).trim() : '',
    meaning: rawEntry.meaning ? String(rawEntry.meaning).trim() : ''
  };
}

/**
 * Indexes either a keyed lexicon map or an array (including minified
 * `complete-hsk-vocabulary` arrays) into `{ [hanzi]: LexiconRecord }`.
 */
function indexLexiconPayload(payload) {
  const indexed = {};
  if (!payload) return indexed;

  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) {
      const normalized = normalizeStaticLexiconRecord(payload[i]);
      if (normalized && normalized.hanzi && !indexed[normalized.hanzi]) {
        indexed[normalized.hanzi] = normalized;
      }
    }
    return indexed;
  }

  if (typeof payload === 'object') {
    const sourceObj =
      payload.entries && typeof payload.entries === 'object' && !Array.isArray(payload.entries)
        ? payload.entries
        : payload.lexicon && typeof payload.lexicon === 'object' && !Array.isArray(payload.lexicon)
        ? payload.lexicon
        : payload;

    const keys = Object.keys(sourceObj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === 'version' || key === 'generatedAt' || key === 'meta') continue;
      const value = sourceObj[key];
      const normalized = normalizeStaticLexiconRecord(value, key);
      if (normalized && normalized.hanzi) {
        indexed[normalized.hanzi] = normalized;
      }
    }
  }

  return indexed;
}

/**
 * Normalizes /data/hsk_curriculum.json into a clean `{ version, courses }` shape.
 */
function normalizeCurriculumPayload(payload) {
  const empty = { version: null, courses: [] };
  if (!payload || typeof payload !== 'object') return empty;

  const rawCourses = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.courses)
    ? payload.courses
    : [];

  const courses = rawCourses
    .filter((c) => c && typeof c === 'object' && Array.isArray(c.lessons))
    .map((course, idx) => ({
      id: String(course.id || `preloaded_hsk_${idx + 1}`),
      courseName: String(course.courseName || course.name || `HSK Course ${idx + 1}`),
      hskBand: course.hskBand != null ? String(course.hskBand) : null,
      sourceType: 'preloaded-hsk',
      lessons: course.lessons
        .filter((l) => l && typeof l === 'object' && Array.isArray(l.words))
        .map((lesson, lIdx) => ({
          id: String(lesson.id || `lesson_${idx + 1}_${lIdx + 1}`),
          title: String(lesson.title || `Lesson ${lIdx + 1}`),
          words: lesson.words
        }))
    }))
    .filter((c) => c.lessons.length > 0);

  return {
    version: payload.version != null ? String(payload.version) : null,
    courses
  };
}

/**
 * Safely fetches a static JSON file without ever throwing or failing on SPA
 * HTML fallbacks (e.g., Vercel rewrite returning index.html with 200 OK).
 */
async function fetchStaticJsonSafely(url) {
  if (typeof fetch !== 'function') return null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!response || !response.ok) return null;

    const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) return null;

    const rawText = await response.text();
    const trimmed = rawText.trimStart();
    if (!trimmed || trimmed.startsWith('<')) return null;

    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Async singleton loader for static offline linguistic assets.
 * Safe to invoke during app idle/startup: never throws and never blocks UI.
 */
export async function loadStaticLinguisticData(options = {}) {
  const { forceReload = false } = options || {};

  if (isLoaded && !forceReload) {
    return getLinguisticDataStatus();
  }
  if (inFlightLoadPromise && !forceReload) {
    return inFlightLoadPromise;
  }

  inFlightLoadPromise = (async () => {
    try {
      const [lexiconResult, curriculumResult, corpusResult] = await Promise.allSettled([
        fetchStaticJsonSafely(LEXICON_DATA_URL),
        fetchStaticJsonSafely(CURRICULUM_DATA_URL),
        fetchStaticJsonSafely(CORPUS_DATA_URL)
      ]);

      const lexiconPayload =
        lexiconResult.status === 'fulfilled' ? lexiconResult.value : null;
      const curriculumPayload =
        curriculumResult.status === 'fulfilled' ? curriculumResult.value : null;
      const corpusPayload =
        corpusResult.status === 'fulfilled' ? corpusResult.value : null;

      masterLexiconMap = lexiconPayload ? indexLexiconPayload(lexiconPayload) : {};
      preloadedCurriculum = curriculumPayload
        ? normalizeCurriculumPayload(curriculumPayload)
        : { version: null, courses: [] };

      if (corpusPayload) {
        const externalSentences = Array.isArray(corpusPayload)
          ? corpusPayload
          : Array.isArray(corpusPayload.sentences)
          ? corpusPayload.sentences
          : [];
        if (externalSentences.length > 0) {
          registerExternalCorpusSentences(externalSentences);
        }
      }

      isLoaded = true;
    } catch {
      masterLexiconMap = masterLexiconMap || {};
      preloadedCurriculum = preloadedCurriculum || { version: null, courses: [] };
      isLoaded = true;
    } finally {
      inFlightLoadPromise = null;
    }

    return getLinguisticDataStatus();
  })();

  return inFlightLoadPromise;
}

/**
 * Synchronous getter for the full master lexicon map keyed by simplified Hanzi.
 */
export function getMasterLexiconMap() {
  return masterLexiconMap;
}

/**
 * Synchronous lookup for a single simplified Hanzi entry in the loaded lexicon.
 */
export function getLexiconEntry(hanzi) {
  const key = String(hanzi || '').trim();
  if (!key) return null;
  return masterLexiconMap[key] || null;
}

/**
 * Synchronous getter for the preloaded sequential HSK courses catalog.
 */
export function getPreloadedCurriculum() {
  return preloadedCurriculum;
}

/**
 * Synchronous status snapshot for diagnostics or UI badges.
 */
export function getLinguisticDataStatus() {
  return {
    loaded: isLoaded,
    lexiconCount: Object.keys(masterLexiconMap).length,
    preloadedCoursesCount: Array.isArray(preloadedCurriculum?.courses)
      ? preloadedCurriculum.courses.length
      : 0,
    corpusCount: getCorpusSentenceCount()
  };
}
