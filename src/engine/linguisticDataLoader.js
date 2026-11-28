// ============================================================================
// LAZY STATIC LINGUISTIC DATA LOADER (100% Client-Side, $0 Cost, Offline-Ready)
// Fetches optional prebuilt static assets from /data/*.json with graceful
// non-blocking fallback when files are absent or served behind an SPA rewrite.
// ============================================================================

import {
  registerExternalCorpusSentences,
  getCorpusSentenceCount
} from './corpusMiner.js';

const LEXICON_FILENAME = 'hsk_lexicon.json';
const CURRICULUM_FILENAME = 'hsk_curriculum.json';
const CORPUS_FILENAME = 'corpus_hsk.json';

export const DEFAULT_REMOTE_DATA_BASE_URL =
  'https://cdn.jsdelivr.net/gh/Kwertincho/hanziapp-data@main';
export const DATA_BASE_URL_STORAGE_KEY = 'hanziapp_data_base_url';
const LAST_SYNCED_AT_STORAGE_KEY = 'hanziapp_data_last_synced_at';
const LAST_SYNC_SOURCE_STORAGE_KEY = 'hanziapp_data_last_source';

let masterLexiconMap = {};
let preloadedCurriculum = { version: null, courses: [] };
let isLoaded = false;
let inFlightLoadPromise = null;
let corpusSource = 'starter';
let activeDataSource = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(LAST_SYNC_SOURCE_STORAGE_KEY) || 'embedded';
    }
  } catch {
    // Ignore storage errors
  }
  return 'embedded';
})();
let lastSyncedAt = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(LAST_SYNCED_AT_STORAGE_KEY) || null;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
})();

/**
 * Returns the active remote data repository base URL (without trailing slashes),
 * reading an optional user override from localStorage ('hanziapp_data_base_url').
 */
export function getDataBaseUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(DATA_BASE_URL_STORAGE_KEY);
      if (typeof saved === 'string' && saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_REMOTE_DATA_BASE_URL;
}

/**
 * Persists a custom data repository base URL in localStorage (or clears override
 * when empty / equal to DEFAULT_REMOTE_DATA_BASE_URL) and returns the active base URL.
 */
export function setDataBaseUrl(url) {
  const cleaned = typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
  try {
    if (typeof localStorage !== 'undefined') {
      if (!cleaned || cleaned === DEFAULT_REMOTE_DATA_BASE_URL) {
        localStorage.removeItem(DATA_BASE_URL_STORAGE_KEY);
      } else {
        localStorage.setItem(DATA_BASE_URL_STORAGE_KEY, cleaned);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return getDataBaseUrl();
}

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
    if (tag === 'q' || tag === 'mq') return 'classifier';
    if (tag === 'm') return 'num';
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
    .map((course, idx) => {
      const parsedHskBand =
        course.hskBand !== undefined && course.hskBand !== null && course.hskBand !== ''
          ? Number(course.hskBand)
          : NaN;
      return {
        id: String(course.id || `preloaded_hsk_${idx + 1}`),
        courseName: String(course.courseName || course.name || `HSK Course ${idx + 1}`),
        hskBand: Number.isFinite(parsedHskBand) ? parsedHskBand : null,
        sourceType: 'preloaded-hsk',
        lessons: course.lessons
          .filter((l) => l && typeof l === 'object' && Array.isArray(l.words))
          .map((lesson, lIdx) => {
            const normalizedLesson = {
              id: String(lesson.id || `lesson_${idx + 1}_${lIdx + 1}`),
              title: String(lesson.title || `Lesson ${lIdx + 1}`),
              words: lesson.words
            };
            if (typeof lesson.lessonNumber === 'number' && Number.isFinite(lesson.lessonNumber)) {
              normalizedLesson.lessonNumber = lesson.lessonNumber;
            }
            if (Array.isArray(lesson.grammarPoints) && lesson.grammarPoints.length > 0) {
              normalizedLesson.grammarPoints = [...lesson.grammarPoints];
            }
            return normalizedLesson;
          })
      };
    })
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
 * Attempts to fetch a static dataset JSON file from the configured remote data
 * repository first, falling back silently to local `/data/${filename}`.
 */
async function fetchDatasetWithFallback(filename, { activeBaseUrl, forceRefresh = false } = {}) {
  const cacheBust = forceRefresh ? `?t=${Date.now()}` : '';
  const cleanBase = String(activeBaseUrl || DEFAULT_REMOTE_DATA_BASE_URL).replace(/\/+$/, '');

  if (cleanBase) {
    const remoteUrl = `${cleanBase}/${filename}${cacheBust}`;
    const remoteData = await fetchStaticJsonSafely(remoteUrl);
    if (remoteData !== null) {
      return { data: remoteData, source: 'remote' };
    }
  }

  const localUrl = `/data/${filename}${cacheBust}`;
  const localData = await fetchStaticJsonSafely(localUrl);
  if (localData !== null) {
    return { data: localData, source: 'local' };
  }

  return { data: null, source: 'embedded' };
}

/**
 * Async singleton loader for static offline linguistic assets.
 * Safe to invoke during app idle/startup: never throws and never blocks UI.
 */
export async function loadStaticLinguisticData(options = {}) {
  const { forceRefresh = false, forceReload = false } = options || {};
  const shouldForce = Boolean(forceRefresh || forceReload);

  if (isLoaded && !shouldForce) {
    return getLinguisticDataStatus();
  }
  if (inFlightLoadPromise && !shouldForce) {
    return inFlightLoadPromise;
  }

  const activeBaseUrl = getDataBaseUrl();

  inFlightLoadPromise = (async () => {
    try {
      const [lexiconResult, curriculumResult, corpusResult] = await Promise.allSettled([
        fetchDatasetWithFallback(LEXICON_FILENAME, { activeBaseUrl, forceRefresh: shouldForce }),
        fetchDatasetWithFallback(CURRICULUM_FILENAME, { activeBaseUrl, forceRefresh: shouldForce }),
        fetchDatasetWithFallback(CORPUS_FILENAME, { activeBaseUrl, forceRefresh: shouldForce })
      ]);

      const lexiconRes =
        lexiconResult.status === 'fulfilled'
          ? lexiconResult.value
          : { data: null, source: 'embedded' };
      const curriculumRes =
        curriculumResult.status === 'fulfilled'
          ? curriculumResult.value
          : { data: null, source: 'embedded' };
      const corpusRes =
        corpusResult.status === 'fulfilled'
          ? corpusResult.value
          : { data: null, source: 'embedded' };

      const lexiconPayload = lexiconRes.data;
      const curriculumPayload = curriculumRes.data;
      const corpusPayload = corpusRes.data;

      if (lexiconPayload) {
        masterLexiconMap = indexLexiconPayload(lexiconPayload);
      } else if (!isLoaded) {
        masterLexiconMap = {};
      }

      if (curriculumPayload) {
        preloadedCurriculum = normalizeCurriculumPayload(curriculumPayload);
      } else if (!isLoaded) {
        preloadedCurriculum = { version: null, courses: [] };
      }

      if (corpusPayload) {
        const externalSentences = Array.isArray(corpusPayload)
          ? corpusPayload
          : Array.isArray(corpusPayload.sentences)
          ? corpusPayload.sentences
          : Array.isArray(corpusPayload.data)
          ? corpusPayload.data
          : Array.isArray(corpusPayload.items)
          ? corpusPayload.items
          : [];
        if (externalSentences.length > 0) {
          registerExternalCorpusSentences(externalSentences);
          corpusSource =
            corpusRes.source === 'remote' || corpusRes.source === 'local'
              ? corpusRes.source
              : 'starter';
        } else if (!isLoaded) {
          corpusSource = 'starter';
        }
      } else if (!isLoaded) {
        corpusSource = 'starter';
      }

      const sources = [lexiconRes.source, curriculumRes.source, corpusRes.source];
      if (sources.includes('remote')) {
        activeDataSource = 'remote';
      } else if (sources.includes('local')) {
        activeDataSource = 'local';
      } else if (!isLoaded) {
        activeDataSource = 'embedded';
      }

      if (sources.includes('remote') || sources.includes('local') || shouldForce) {
        lastSyncedAt = new Date().toISOString();
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LAST_SYNCED_AT_STORAGE_KEY, lastSyncedAt);
            localStorage.setItem(LAST_SYNC_SOURCE_STORAGE_KEY, activeDataSource);
          }
        } catch {
          // Ignore storage errors
        }
      }

      isLoaded = true;
    } catch {
      masterLexiconMap = masterLexiconMap || {};
      preloadedCurriculum = preloadedCurriculum || { version: null, courses: [] };
      activeDataSource = activeDataSource || 'embedded';
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
  const activeBaseUrl = getDataBaseUrl();
  return {
    loaded: isLoaded,
    lexiconCount: Object.keys(masterLexiconMap).length,
    preloadedCoursesCount: Array.isArray(preloadedCurriculum?.courses)
      ? preloadedCurriculum.courses.length
      : 0,
    curriculumVersion: preloadedCurriculum?.version || null,
    corpusCount: getCorpusSentenceCount(),
    corpusSource: corpusSource || 'starter',
    source: activeDataSource || 'embedded',
    lastSyncedAt: lastSyncedAt || null,
    activeBaseUrl,
    dataBaseUrl: activeBaseUrl
  };
}
