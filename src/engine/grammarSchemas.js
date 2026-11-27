// ============================================================================
// TYPED BILINGUAL GRAMMAR SCHEMAS & ENGLISH REALIZER (100% Offline, $0 Cost)
// 32 New HSK Course 1 + forward-gated HSK 2 schemas with strict lexical,
// particle, semantic valence, classifier, and separable-verb constraints.
// ============================================================================

const IRREGULAR_VERBS = {
  be: { third: 'is', past: 'was', pastPlural: 'were', pp: 'been', gerund: 'being' },
  have: { third: 'has', past: 'had', pp: 'had', gerund: 'having' },
  do: { third: 'does', past: 'did', pp: 'done', gerund: 'doing' },
  go: { third: 'goes', past: 'went', pp: 'been', gerund: 'going' },
  eat: { third: 'eats', past: 'ate', pp: 'eaten', gerund: 'eating' },
  drink: { third: 'drinks', past: 'drank', pp: 'drunk', gerund: 'drinking' },
  buy: { third: 'buys', past: 'bought', pp: 'bought', gerund: 'buying' },
  see: { third: 'sees', past: 'saw', pp: 'seen', gerund: 'seeing' },
  read: { third: 'reads', past: 'read', pp: 'read', gerund: 'reading' },
  come: { third: 'comes', past: 'came', pp: 'come', gerund: 'coming' },
  speak: { third: 'speaks', past: 'spoke', pp: 'spoken', gerund: 'speaking' },
  write: { third: 'writes', past: 'wrote', pp: 'written', gerund: 'writing' },
  sleep: { third: 'sleeps', past: 'slept', pp: 'slept', gerund: 'sleeping' },
  give: { third: 'gives', past: 'gave', pp: 'given', gerund: 'giving' },
  take: { third: 'takes', past: 'took', pp: 'taken', gerund: 'taking' },
  sit: { third: 'sits', past: 'sat', pp: 'sat', gerund: 'sitting' },
  drive: { third: 'drives', past: 'drove', pp: 'driven', gerund: 'driving' },
  know: { third: 'knows', past: 'knew', pp: 'known', gerund: 'knowing' },
  meet: { third: 'meets', past: 'met', pp: 'met', gerund: 'meeting' },
  sing: { third: 'sings', past: 'sang', pp: 'sung', gerund: 'singing' },
  make: { third: 'makes', past: 'made', pp: 'made', gerund: 'making' },
  get: { third: 'gets', past: 'got', pp: 'gotten', gerund: 'getting' },
  run: { third: 'runs', past: 'ran', pp: 'run', gerund: 'running' },
  find: { third: 'finds', past: 'found', pp: 'found', gerund: 'finding' },
  wear: { third: 'wears', past: 'wore', pp: 'worn', gerund: 'wearing' },
  think: { third: 'thinks', past: 'thought', pp: 'thought', gerund: 'thinking' },
  tell: { third: 'tells', past: 'told', pp: 'told', gerund: 'telling' },
  teach: { third: 'teaches', past: 'taught', pp: 'taught', gerund: 'teaching' },
  sell: { third: 'sells', past: 'sold', pp: 'sold', gerund: 'selling' },
  begin: { third: 'begins', past: 'began', pp: 'begun', gerund: 'beginning' },
  swim: { third: 'swims', past: 'swam', pp: 'swum', gerund: 'swimming' },
  understand: { third: 'understands', past: 'understood', pp: 'understood', gerund: 'understanding' }
};

const UNCOUNTABLE_NOUNS = new Set([
  'water',
  'tea',
  'coffee',
  'milk',
  'juice',
  'beer',
  'rice',
  'cooked rice',
  'money',
  'weather',
  'chinese',
  'mandarin chinese',
  'english',
  'fruit',
  'clothing',
  'clothes',
  'fish',
  'noodles',
  'bread',
  'music',
  'china',
  'beijing',
  'shanghai',
  'japan',
  'the united states',
  'the uk',
  'home',
  'here',
  'there'
]);

const PROPER_OR_NO_ARTICLE_NOUNS = new Set([
  'china',
  'beijing',
  'shanghai',
  'japan',
  'the united states',
  'the uk',
  'mandarin chinese',
  'chinese',
  'english',
  'home',
  'dad',
  'mom',
  'father',
  'mother',
  'here',
  'there',
  'everyone'
]);

const NUMBER_WORDS_EN = {
  零: 'zero',
  一: 'one',
  二: 'two',
  两: 'two',
  三: 'three',
  四: 'four',
  五: 'five',
  六: 'six',
  七: 'seven',
  八: 'eight',
  九: 'nine',
  十: 'ten',
  百: 'a hundred'
};

const NUMBER_VALUES = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 100
};

function conjugateHeadWord(headWord, form) {
  const lower = String(headWord || '').toLowerCase();
  const irreg = IRREGULAR_VERBS[lower];
  if (irreg) {
    if (form === 'third') return irreg.third;
    if (form === 'past') return irreg.past;
    if (form === 'pp') return irreg.pp || irreg.past;
    if (form === 'gerund') return irreg.gerund;
    return lower;
  }

  if (form === 'third') {
    if (/(?:s|sh|ch|x|z|o)$/i.test(lower)) return `${lower}es`;
    if (/[^aeiou]y$/i.test(lower)) return `${lower.slice(0, -1)}ies`;
    return `${lower}s`;
  }
  if (form === 'past' || form === 'pp') {
    if (/e$/i.test(lower)) return `${lower}d`;
    if (/[^aeiou]y$/i.test(lower)) return `${lower.slice(0, -1)}ied`;
    if (/^[a-z]*[^aeiou][aeiou][bdgmnpt]$/i.test(lower) && lower.length <= 5) {
      return `${lower}${lower[lower.length - 1]}ed`;
    }
    return `${lower}ed`;
  }
  if (form === 'gerund') {
    if (/ie$/i.test(lower)) return `${lower.slice(0, -2)}ying`;
    if (/[^e]e$/i.test(lower)) return `${lower.slice(0, -1)}ing`;
    if (/^[a-z]*[^aeiou][aeiou][bdgmnpt]$/i.test(lower) && lower.length <= 5) {
      return `${lower}${lower[lower.length - 1]}ing`;
    }
    return `${lower}ing`;
  }
  return lower;
}

function getBeForm(subjectType = '3sg', tense = 'present') {
  if (tense === 'past') {
    return subjectType === '1sg' || subjectType === '3sg' ? 'was' : 'were';
  }
  if (subjectType === '1sg') return 'am';
  if (subjectType === '3sg') return 'is';
  return 'are';
}

function getDoForm(subjectType = '3sg', tense = 'present') {
  if (tense === 'past') return 'did';
  return subjectType === '3sg' ? 'does' : 'do';
}

function getHaveForm(subjectType = '3sg') {
  return subjectType === '3sg' ? 'has' : 'have';
}

/**
 * Deterministic English verb realizer supporting copula, 3rd-person singular,
 * regular/irregular past tense, experiential perfect, progressive, modals, and negation.
 */
export function realizeEnglishVerb(
  enGloss,
  { subjectType = '3sg', tense = 'present', negated = false, modal = null } = {}
) {
  const rawBase =
    typeof enGloss === 'string'
      ? enGloss
      : enGloss?.base || enGloss?.singular || 'do';
  const cleanBase =
    String(rawBase || 'do')
      .split(/[;/]/)[0]
      .replace(/^to\s+/i, '')
      .trim() || 'do';

  const parts = cleanBase.split(/\s+/).filter(Boolean);
  const head = parts[0] || 'do';
  const rest = parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : '';
  const headLower = head.toLowerCase();

  // Explicit modal auxiliary handling (can, may, want to, should, etc.)
  if (modal) {
    const cleanModal = String(modal).trim().toLowerCase();
    const isSemiModal = cleanModal === 'want to' || cleanModal === 'want' || cleanModal === 'need to';

    if (isSemiModal) {
      const semiVerb = cleanModal.startsWith('need') ? 'need' : 'want';
      if (negated) {
        return `${getDoForm(subjectType, tense)} not ${semiVerb} to ${cleanBase}`;
      }
      if (tense === 'past') {
        return `${semiVerb}ed to ${cleanBase}`;
      }
      const inflectedSemi = subjectType === '3sg' ? `${semiVerb}s` : semiVerb;
      return `${inflectedSemi} to ${cleanBase}`;
    }

    if (negated) {
      if (cleanModal === 'can') return `cannot ${cleanBase}`;
      return `${cleanModal} not ${cleanBase}`;
    }
    return `${cleanModal} ${cleanBase}`;
  }

  // Copula "be" (including "be called")
  if (headLower === 'be') {
    const beForm = getBeForm(subjectType, tense === 'past' ? 'past' : 'present');
    if (tense === 'experiential') {
      return `${getHaveForm(subjectType)} ${negated ? 'never ' : ''}been${rest}`;
    }
    return negated ? `${beForm} not${rest}` : `${beForm}${rest}`;
  }

  // Progressive tense ("is reading", "am eating")
  if (tense === 'progressive') {
    const beForm = getBeForm(subjectType, 'present');
    const gerund =
      enGloss && typeof enGloss === 'object' && enGloss.gerund && !rest
        ? enGloss.gerund
        : `${conjugateHeadWord(head, 'gerund')}${rest}`;
    return negated ? `${beForm} not ${gerund}` : `${beForm} ${gerund}`;
  }

  // Experiential aspect (过 -> "have eaten", "has read")
  if (tense === 'experiential') {
    const haveForm = getHaveForm(subjectType);
    const pp =
      headLower === 'go'
        ? 'been to'
        : `${conjugateHeadWord(head, 'pp')}${rest}`;
    return negated ? `${haveForm} never ${pp}` : `${haveForm} ${pp}`;
  }

  // Negated present or past
  if (negated) {
    return `${getDoForm(subjectType, tense)} not ${cleanBase}`;
  }

  // Affirmative past
  if (tense === 'past') {
    if (enGloss && typeof enGloss === 'object' && enGloss.past) {
      return String(enGloss.past).split(/[;/]/)[0].trim();
    }
    return `${conjugateHeadWord(head, 'past')}${rest}`;
  }

  // Affirmative present
  if (subjectType === '3sg') {
    if (enGloss && typeof enGloss === 'object' && enGloss.third) {
      return String(enGloss.third).split(/[;/]/)[0].trim();
    }
    return `${conjugateHeadWord(head, 'third')}${rest}`;
  }

  return cleanBase;
}

/**
 * Selects "a" or "an" using phonetic English heuristics.
 */
function pickIndefiniteArticle(nounPhrase) {
  const lower = String(nounPhrase || '').trim().toLowerCase();
  if (!lower) return 'a';
  if (/^(?:honest|hour|heir|honor)/.test(lower)) return 'an';
  if (/^(?:uni|use|euro|one|once)/.test(lower)) return 'a';
  return /^[aeiou]/.test(lower) ? 'an' : 'a';
}

/**
 * Deterministic English noun realizer with count, definite/indefinite article,
 * uncountable guardrails, and irregular plural handling.
 */
export function realizeEnglishNoun(
  enGloss,
  { count = 1, definite = false, indefinite = false } = {}
) {
  const rawSingular =
    typeof enGloss === 'string'
      ? enGloss
      : enGloss?.singular || enGloss?.base || 'thing';
  const singular =
    String(rawSingular || 'thing')
      .split(/[;/]/)[0]
      .replace(/\([^)]*\)/g, '')
      .trim() || 'thing';
  const lower = singular.toLowerCase();

  const isUncountable = UNCOUNTABLE_NOUNS.has(lower);
  const isProperOrFixed =
    PROPER_OR_NO_ARTICLE_NOUNS.has(lower) ||
    lower.startsWith('the ') ||
    lower.startsWith('my ') ||
    lower.startsWith('your ');

  if (count !== 1 && !isUncountable) {
    let plural =
      enGloss && typeof enGloss === 'object' && enGloss.plural
        ? String(enGloss.plural).split(/[;/]/)[0].trim()
        : null;
    if (!plural) {
      if (lower === 'person') plural = 'people';
      else if (lower === 'child') plural = 'children';
      else if (/(?:s|sh|ch|x|z)$/i.test(singular)) plural = `${singular}es`;
      else if (/[^aeiou]y$/i.test(singular)) plural = `${singular.slice(0, -1)}ies`;
      else plural = `${singular}s`;
    }
    return definite && !isProperOrFixed ? `the ${plural}` : plural;
  }

  if (definite && !isProperOrFixed) {
    return `the ${singular}`;
  }

  if (indefinite && !isUncountable && !isProperOrFixed) {
    return `${pickIndefiniteArticle(singular)} ${singular}`;
  }

  return singular;
}

export function realizeSubjectEnglish(word) {
  const h = typeof word?.hanzi === 'string' ? word.hanzi : '';
  if (h === '我') return { text: 'I', subjectType: '1sg', possessive: 'my' };
  if (h === '你' || h === '您') return { text: 'you', subjectType: '2sg', possessive: 'your' };
  if (h === '他') return { text: 'he', subjectType: '3sg', possessive: 'his' };
  if (h === '她') return { text: 'she', subjectType: '3sg', possessive: 'her' };
  if (h === '它') return { text: 'it', subjectType: '3sg', possessive: 'its' };
  if (h === '我们') return { text: 'we', subjectType: '1pl', possessive: 'our' };
  if (h === '你们') return { text: 'you all', subjectType: '2sg', possessive: 'your' };
  if (h === '他们' || h === '她们') return { text: 'they', subjectType: '3pl', possessive: 'their' };
  if (h === '大家') return { text: 'everyone', subjectType: '3sg', possessive: "everyone's" };
  if (h === '爸爸') return { text: 'Dad', subjectType: '3sg', possessive: "Dad's" };
  if (h === '妈妈') return { text: 'Mom', subjectType: '3sg', possessive: "Mom's" };

  const noun =
    realizeEnglishNoun(word?.enGloss || word?.meaning || h || 'person', {
      count: 1,
      definite: true
    }) || 'the person';
  return {
    text: noun,
    subjectType: '3sg',
    possessive: `${noun}'s`
  };
}

function realizeAgentObjectEnglish(word) {
  const h = typeof word?.hanzi === 'string' ? word.hanzi : '';
  if (h === '我') return 'me';
  if (h === '你' || h === '您') return 'you';
  if (h === '他') return 'him';
  if (h === '她') return 'her';
  if (h === '它') return 'it';
  if (h === '我们') return 'us';
  if (h === '你们') return 'you all';
  if (h === '他们' || h === '她们') return 'them';
  return realizeSubjectEnglish(word).text;
}

function realizeVerbParticipleEnglish(verbWord) {
  const raw =
    verbWord?.enGloss?.base ||
    (typeof verbWord?.enGloss === 'string' ? verbWord.enGloss : null) ||
    verbWord?.meaning ||
    verbWord?.english ||
    'do';
  const cleanBase =
    String(raw)
      .split(/[;/]/)[0]
      .replace(/^to\s+/i, '')
      .replace(/\([^)]*\)/g, '')
      .trim() || 'do';
  const parts = cleanBase.split(/\s+/);
  const head = parts[0] || 'do';
  const rest = parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : '';
  return `${conjugateHeadWord(head, 'pp')}${rest}`;
}

function realizeVerbGerundEnglish(verbWord) {
  const raw =
    verbWord?.enGloss?.base ||
    (typeof verbWord?.enGloss === 'string' ? verbWord.enGloss : null) ||
    verbWord?.meaning ||
    verbWord?.english ||
    'do';
  const cleanBase =
    String(raw)
      .split(/[;/]/)[0]
      .replace(/^to\s+/i, '')
      .replace(/\([^)]*\)/g, '')
      .trim() || 'do';
  const parts = cleanBase.split(/\s+/);
  const head = parts[0] || 'do';
  const rest = parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : '';
  return `${conjugateHeadWord(head, 'gerund')}${rest}`;
}

function realizePlaceEnglish(placeWord) {
  const h = placeWord?.hanzi || '';
  if (h === '家') return 'home';
  if (h === '这儿' || h === '这里') return 'here';
  if (h === '那儿' || h === '那里') return 'there';
  return realizeEnglishNoun(placeWord?.enGloss || placeWord?.meaning || h, {
    count: 1,
    definite: !hasFeature(placeWord, 'country') && !hasFeature(placeWord, 'city')
  });
}

function realizeLocationPreposition(placeWord) {
  const h = placeWord?.hanzi || '';
  if (h === '家') return 'at home';
  if (h === '这儿' || h === '这里') return 'here';
  if (h === '那儿' || h === '那里') return 'there';
  const placeEn = realizePlaceEnglish(placeWord);
  if (hasFeature(placeWord, 'country') || hasFeature(placeWord, 'city')) {
    return `in ${placeEn}`;
  }
  return `at ${placeEn}`;
}

function realizeGoPlaceEnglish(placeWord) {
  const h = placeWord?.hanzi || '';
  if (h === '家') return 'home';
  if (h === '这儿' || h === '这里') return 'here';
  if (h === '那儿' || h === '那里') return 'there';
  return `to ${realizePlaceEnglish(placeWord)}`;
}

function realizeAdjEnglish(adjWord) {
  const raw = adjWord?.enGloss?.singular || adjWord?.meaning || adjWord?.english || '';
  return String(raw)
    .split(/[;/]/)[0]
    .replace(/\([^)]*\)/g, '')
    .replace(/^to\s+be\s+/i, '')
    .trim() || 'good';
}

function realizeTimeEnglish(timeWord) {
  const raw = timeWord?.enGloss?.singular || timeWord?.meaning || timeWord?.english || '';
  return String(raw).split(/[;/]/)[0].trim() || 'today';
}

function realizeClassifierPhraseEnglish(numWord, clWord, nounWord) {
  const nVal = NUMBER_VALUES[numWord?.hanzi] ?? 1;
  const nWordEn = NUMBER_WORDS_EN[numWord?.hanzi] || String(nVal);
  const nounEn = realizeEnglishNoun(nounWord?.enGloss || nounWord?.meaning || nounWord?.hanzi, {
    count: nVal,
    definite: false,
    indefinite: false
  });
  const cl = clWord?.hanzi || '';

  if (cl === '杯') {
    return `${nVal === 1 ? 'a cup' : `${nWordEn} cups`} of ${nounEn}`;
  }
  if (cl === '碗') {
    return `${nVal === 1 ? 'a bowl' : `${nWordEn} bowls`} of ${nounEn}`;
  }
  if (cl === '瓶') {
    return `${nVal === 1 ? 'a bottle' : `${nWordEn} bottles`} of ${nounEn}`;
  }
  if (cl === '张' && nounEn === 'newspaper') {
    return `${nVal === 1 ? 'a' : nWordEn} ${nounEn}`;
  }
  if (cl === '块' || cl === '元') {
    return `${nWordEn} yuan`;
  }
  if (nVal === 1) {
    return realizeEnglishNoun(nounWord?.enGloss || nounWord?.meaning || nounWord?.hanzi, {
      count: 1,
      indefinite: true
    });
  }
  return `${nWordEn} ${nounEn}`;
}

function capitalizeSentence(text, punctuation = '.') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const capped = clean[0].toUpperCase() + clean.slice(1);
  if (/[.!?]$/.test(capped)) return capped;
  return `${capped}${punctuation}`;
}

// ============================================================================
// SEMANTIC CONSTRAINT HELPERS
// ============================================================================

export function hasFeature(word, feat) {
  if (!word || typeof word !== 'object' || !feat) return false;
  const feats = word.features || word.linguistics?.features || [];
  return Array.isArray(feats) && feats.includes(feat);
}

export function hasAnyFeature(word, featList = []) {
  if (!word || !Array.isArray(featList)) return false;
  return featList.some((f) => hasFeature(word, f));
}

export function getWordPos(word) {
  if (!word || typeof word !== 'object') return 'noun';
  return word.pos || word.linguistics?.pos || 'noun';
}

export function getWordClassifiers(word) {
  if (!word || typeof word !== 'object') return [];
  const cls = word.classifiers || word.linguistics?.classifiers || [];
  return Array.isArray(cls) ? cls : [];
}

/**
 * Checks whether a particle/function word (or composite like 没有 = 没+有)
 * is present in the learner's unlocked vocabulary pool.
 */
export function getParticleEntry(hanzi, poolMap) {
  if (!hanzi || !(poolMap instanceof Map)) return null;
  if (poolMap.has(hanzi)) return poolMap.get(hanzi);
  // Allow composite 没有 when both 没 and 有 are unlocked
  if (hanzi === '没有' && poolMap.has('没') && poolMap.has('有')) {
    const mei = poolMap.get('没');
    const you = poolMap.get('有');
    return {
      hanzi: '没有',
      pinyin: `${mei?.pinyin || 'méi'}${you?.pinyin || 'yǒu'}`,
      meaning: 'do not have',
      pos: 'verb',
      features: ['negation', 'existential'],
      sourceWord: mei
    };
  }
  // Allow 没 to be backed by unlocked 没有
  if (hanzi === '没' && poolMap.has('没有')) {
    const meiyou = poolMap.get('没有');
    return {
      hanzi: '没',
      pinyin: 'méi',
      meaning: 'not (past / have)',
      pos: 'adv',
      features: ['negation', 'neg_past'],
      sourceWord: meiyou
    };
  }
  // Allow composite 越来越 when both 越 and 来 are unlocked
  if (hanzi === '越来越' && poolMap.has('越') && poolMap.has('来')) {
    const yue = poolMap.get('越');
    return {
      hanzi: '越来越',
      pinyin: 'yuè lái yuè',
      meaning: 'more and more',
      pos: 'adv',
      features: ['degree', 'gradual'],
      sourceWord: yue
    };
  }
  return null;
}

export function buildUnlockedPoolMap(enrichedUnlockedWords = []) {
  const map = new Map();
  if (!Array.isArray(enrichedUnlockedWords)) return map;
  for (let i = 0; i < enrichedUnlockedWords.length; i++) {
    const w = enrichedUnlockedWords[i];
    if (w && typeof w === 'object' && typeof w.hanzi === 'string') {
      const key = w.hanzi.trim();
      if (key && !map.has(key)) {
        map.set(key, w);
      }
    }
  }
  return map;
}

export function checkRequiredParticlesUnlocked(schema, enrichedUnlockedWords = []) {
  if (!schema) return false;
  const poolMap =
    enrichedUnlockedWords instanceof Map
      ? enrichedUnlockedWords
      : buildUnlockedPoolMap(enrichedUnlockedWords);
  const reqs = Array.isArray(schema.requiredParticles) ? schema.requiredParticles : [];
  return reqs.every((p) => Boolean(getParticleEntry(p, poolMap)));
}

/**
 * Strict verb-object semantic valence validator.
 * Rejects separable verbs (离合词) from direct-object slots and enforces
 * natural collocations (喝+drink, 吃+food, 读+readable, 去+place, 买+buyable, etc.).
 */
export function doesVerbMatchObject(verbWord, objWord) {
  if (!verbWord?.hanzi || !objWord?.hanzi) return false;
  if (verbWord.isSeparable || verbWord.linguistics?.isSeparable) return false;
  if (verbWord.hanzi === objWord.hanzi) return false;

  const v = verbWord.hanzi;
  const objPos = getWordPos(objWord);

  if (v === '喝') return hasFeature(objWord, 'drink');
  if (v === '吃') return hasFeature(objWord, 'food');
  if (v === '读') return hasFeature(objWord, 'readable');
  if (v === '看') return hasAnyFeature(objWord, ['readable', 'watchable', 'human']);
  if (v === '写') return hasAnyFeature(objWord, ['writable', 'readable']);
  if (v === '说') return hasFeature(objWord, 'language');
  if (v === '学' || v === '学习') return hasAnyFeature(objWord, ['language', 'learnable']);
  if (v === '买') return hasAnyFeature(objWord, ['buyable', 'food', 'drink', 'object']);
  if (v === '穿') return hasFeature(objWord, 'wearable');
  if (v === '听') return hasAnyFeature(objWord, ['media', 'language']);
  if (v === '坐') return hasAnyFeature(objWord, ['vehicle', 'furniture']);
  if (v === '开') return hasAnyFeature(objWord, ['vehicle', 'device']);
  if (v === '去' || v === '来' || v === '回' || v === '住') {
    return objPos === 'place' || hasFeature(objWord, 'place');
  }
  if (v === '喜欢' || v === '爱') {
    return (
      (objPos === 'noun' || objPos === 'place') &&
      !hasAnyFeature(objWord, ['interrogative', 'demonstrative', 'location', 'name'])
    );
  }
  if (v === '认识') return hasAnyFeature(objWord, ['human', 'writable']) && objPos === 'noun';
  if (v === '知道') return hasAnyFeature(objWord, ['name', 'abstract']);
  if (v === '找' || v === '等' || v === '帮助') return hasFeature(objWord, 'human') && objPos === 'noun';
  if (v === '问') return hasAnyFeature(objWord, ['human', 'askable']) && objPos === 'noun';

  const valenceObjFeats = verbWord.valence?.objFeatures || verbWord.linguistics?.valence?.objFeatures;
  if (Array.isArray(valenceObjFeats) && valenceObjFeats.length > 0) {
    return hasAnyFeature(objWord, valenceObjFeats);
  }

  return objPos === 'noun' && hasAnyFeature(objWord, ['object', 'food', 'drink', 'readable']);
}

/**
 * Strict classifier-noun compatibility check.
 */
export function doesClassifierMatchNoun(clWord, nounWord) {
  if (!clWord?.hanzi || !nounWord?.hanzi) return false;
  if (getWordPos(clWord) !== 'classifier') return false;
  const nounPos = getWordPos(nounWord);
  if (nounPos !== 'noun' && nounPos !== 'place') return false;
  if (hasAnyFeature(nounWord, ['interrogative', 'demonstrative', 'country', 'city', 'weather', 'location'])) {
    return false;
  }

  const nounCls = getWordClassifiers(nounWord);
  if (nounCls.includes(clWord.hanzi)) return true;

  // Allow general classifier 个 only for countable nouns with no specialized classifier listed
  if (clWord.hanzi === '个' && nounCls.length === 0) {
    return hasAnyFeature(nounWord, ['human', 'object', 'fruit']);
  }
  return false;
}

/**
 * Checks if an adjective naturally predicates a given subject/noun.
 */
export function doesAdjMatchSubject(adjWord, subjWord) {
  if (!adjWord?.hanzi || !subjWord?.hanzi) return false;
  if (getWordPos(adjWord) !== 'adj') return false;
  const a = adjWord.hanzi;

  if (a === '好吃') return hasFeature(subjWord, 'food');
  if (a === '好喝') return hasFeature(subjWord, 'drink');
  if (a === '高兴' || a === '忙' || a === '累') return hasFeature(subjWord, 'human');
  if (a === '热' || a === '冷') return hasAnyFeature(subjWord, ['weather', 'drink', 'food', 'place']);
  if (a === '贵' || a === '便宜') return hasAnyFeature(subjWord, ['buyable', 'food', 'drink', 'object', 'wearable']);
  if (a === '远' || a === '近') return hasFeature(subjWord, 'place');
  if (a === '漂亮' || a === '好看') return hasAnyFeature(subjWord, ['human', 'wearable', 'place', 'object', 'media']);
  if (a === '大' || a === '小') return hasAnyFeature(subjWord, ['place', 'object', 'animal', 'food', 'fruit', 'furniture']);
  if (a === '好') return !hasAnyFeature(subjWord, ['interrogative', 'demonstrative']);

  return !hasAnyFeature(subjWord, ['interrogative', 'demonstrative']);
}

/**
 * Checks whether a modifier noun/adjective can be inserted inside a separable verb
 * (e.g. 上 + 中文 + 课, 看 + 汉语 + 书, 吃 + 中国 + 菜).
 */
export function doesModifierMatchSeparable(sepWord, modWord) {
  if (!sepWord?.hanzi || !modWord?.hanzi) return false;
  if (!(sepWord.isSeparable || sepWord.linguistics?.isSeparable)) return false;
  const parts = sepWord.sepParts || sepWord.linguistics?.sepParts;
  if (!Array.isArray(parts) || parts.length !== 2) return false;
  if (modWord.hanzi === sepWord.hanzi) return false;

  const [v1, v2] = parts;
  if (v2 === '课' && hasFeature(modWord, 'language')) return true;
  if (v2 === '书' && hasAnyFeature(modWord, ['language', 'country'])) return true;
  if (v2 === '饭' && hasFeature(modWord, 'country')) return true;
  if (v2 === '歌' && hasAnyFeature(modWord, ['language', 'country'])) return true;
  if (v2 === '话' && hasFeature(modWord, 'language')) return true;
  if (v1 === '吃' && v2 === '饭' && modWord.hanzi === '好') return false;
  return false;
}

/**
 * Splits a 2-3 character separable verb into V1 and V2 with matched syllable pinyin.
 */
export function splitSeparableVerbParts(sepWord) {
  const parts = sepWord?.sepParts || sepWord?.linguistics?.sepParts;
  if (!Array.isArray(parts) || parts.length !== 2) return null;
  const [rawV1, rawV2] = parts;
  const v1 = String(rawV1 || '');
  const v2 = String(rawV2 || '');
  if (!v1 || !v2) return null;
  const syllables = String(sepWord?.pinyin || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const v1Len = Array.from(v1).length;
  let v1Pinyin = '';
  let v2Pinyin = '';

  if (syllables.length >= v1Len + 1) {
    v1Pinyin = syllables.slice(0, v1Len).join(' ');
    v2Pinyin = syllables.slice(v1Len).join(' ');
  } else {
    // Fallback heuristic if pinyin has no spaces
    v1Pinyin = sepWord.pinyin || '';
    v2Pinyin = '';
  }

  return { v1, v2, v1Pinyin, v2Pinyin };
}

// ============================================================================
// TOKEN & RESULT BUILDERS
// ============================================================================

function makeToken({
  id,
  role,
  hanzi,
  pinyin = '',
  english = '',
  pos = 'word',
  isTarget = false,
  isBlankCandidate = true,
  sourceWord = null
}) {
  return {
    id,
    role,
    hanzi,
    pinyin: String(pinyin || '').trim(),
    english: String(english || '').trim(),
    pos,
    isTarget: Boolean(isTarget),
    isBlankCandidate: Boolean(isBlankCandidate),
    sourceWord
  };
}

function tokenFromWord(word, role, idx, { isTarget = false, isBlankCandidate = true } = {}) {
  const safeWord = word && typeof word === 'object' ? word : { hanzi: '', pinyin: '', meaning: '' };
  const safeHanzi = String(safeWord.hanzi || '');
  return makeToken({
    id: `tok_${role}_${idx}_${safeHanzi}`,
    role,
    hanzi: safeHanzi,
    pinyin: safeWord.pinyin || '',
    english: String(safeWord.meaning || safeWord.english || '').split(/[;/]/)[0].trim(),
    pos: getWordPos(safeWord),
    isTarget,
    isBlankCandidate,
    sourceWord: safeWord.sourceWord || safeWord
  });
}

function buildResult({
  schema,
  tokens = [],
  punctuation = '。',
  english = '',
  acceptedVariants = [],
  distractorTokens = []
}) {
  const safeTokens = Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  const hanzi = `${safeTokens.map((t) => t.hanzi || '').join('')}${punctuation}`;
  const pinyin = safeTokens
    .map((t) => t.pinyin)
    .filter(Boolean)
    .join(' ');
  const variants = Array.from(
    new Set([hanzi, ...(Array.isArray(acceptedVariants) ? acceptedVariants.filter(Boolean) : [])])
  );

  return {
    tokens: safeTokens,
    hanzi,
    pinyin,
    english: String(english || ''),
    acceptedVariants: variants,
    grammarPoint: {
      id: schema?.id || 'unknown',
      hskLevel: schema?.hskLevel || 1,
      title: schema?.title || 'Grammar Pattern',
      ruleSummary: schema?.ruleSummary || ''
    },
    distractorTokens: Array.isArray(distractorTokens) ? distractorTokens : []
  };
}

function buildDistractors(list = []) {
  return list.map((item, idx) => ({
    id: `dist_${idx}_${item.hanzi}`,
    hanzi: item.hanzi,
    pinyin: item.pinyin || '',
    reason: item.reason || 'Grammatical distractor'
  }));
}

function realizeVerbObjectEnglish(verbWord, objWord, verbOpts = {}, objOpts = {}) {
  const verbEn = realizeEnglishVerb(verbWord.enGloss || verbWord.meaning || verbWord.hanzi, verbOpts);
  const objEn =
    getWordPos(objWord) === 'place'
      ? realizeGoPlaceEnglish(objWord)
      : realizeEnglishNoun(objWord.enGloss || objWord.meaning || objWord.hanzi, objOpts);
  // Avoid double "to" ("been to to China" / "go to home")
  if (verbEn.endsWith(' to') && objEn.startsWith('to ')) {
    return `${verbEn} ${objEn.slice(3)}`;
  }
  if (verbEn.endsWith(' to') && (objEn === 'home' || objEn === 'here' || objEn === 'there')) {
    return `${verbEn.slice(0, -3)} ${objEn}`;
  }
  return `${verbEn} ${objEn}`;
}

// ============================================================================
// 32 TYPED BILINGUAL GRAMMAR SCHEMAS (HSK 1 + FORWARD-GATED HSK 2)
// ============================================================================

const STANDARD_SUBJECT_SLOT = {
  role: 'subject',
  filter: (w) =>
    (getWordPos(w) === 'pron' &&
      hasFeature(w, 'human') &&
      !hasAnyFeature(w, ['interrogative', 'demonstrative'])) ||
    (getWordPos(w) === 'noun' && hasFeature(w, 'human'))
};

const SINGULAR_PRON_SLOT = {
  role: 'subject',
  filter: (w) =>
    getWordPos(w) === 'pron' &&
    hasFeature(w, 'human') &&
    !hasAnyFeature(w, ['interrogative', 'demonstrative'])
};

const PLURAL_SUBJECT_SLOT = {
  role: 'subject',
  filter: (w) =>
    getWordPos(w) === 'pron' &&
    hasFeature(w, 'human') &&
    hasFeature(w, 'plural')
};

const TRANSITIVE_VERB_SLOT = {
  role: 'verb',
  filter: (w) =>
    getWordPos(w) === 'verb' &&
    !(w.isSeparable || w.linguistics?.isSeparable) &&
    !['是', '有', '没有', '叫', '请'].includes(w.hanzi) &&
    !hasFeature(w, 'intransitive')
};

const OBJECT_FOR_VERB_SLOT = {
  role: 'object',
  filter: (w, chosen) => doesVerbMatchObject(chosen.verb, w)
};

const NUMBER_PRE_CL_SLOT = {
  role: 'number',
  // Enforce 两 instead of 二 before classifiers!
  filter: (w) =>
    getWordPos(w) === 'num' &&
    ['一', '两', '三', '四', '五', '六', '七', '八', '九', '十'].includes(w.hanzi)
};

const CLASSIFIER_SLOT = {
  role: 'classifier',
  filter: (w) =>
    getWordPos(w) === 'classifier' &&
    !['岁', '些', '元', '块'].includes(w.hanzi)
};

const NOUN_FOR_CL_SLOT = {
  role: 'noun',
  filter: (w, chosen) => doesClassifierMatchNoun(chosen.classifier, w)
};

const PLACE_SLOT = {
  role: 'place',
  filter: (w) =>
    getWordPos(w) === 'place' &&
    !hasAnyFeature(w, ['interrogative', 'location'])
};

const TIME_ANY_SLOT = {
  role: 'time',
  filter: (w) =>
    getWordPos(w) === 'time' &&
    hasAnyFeature(w, ['time_present', 'time_future', 'time_past', 'part_of_day', 'weekday', 'habitual'])
};

const TIME_PAST_SLOT = {
  role: 'timePast',
  filter: (w) => getWordPos(w) === 'time' && hasFeature(w, 'time_past')
};

const ADJ_FOR_SUBJ_SLOT = {
  role: 'adj',
  filter: (w, chosen) => doesAdjMatchSubject(w, chosen.subject || chosen.noun)
};

export const GRAMMAR_SCHEMAS = [
  // --------------------------------------------------------------------------
  // GROUP 1: CORE EQUATIVE & POSSESSION (1–6)
  // --------------------------------------------------------------------------
  {
    id: 'shi_identity',
    hskLevel: 1,
    title: 'Identity Statement (S + 是 + N)',
    ruleSummary: 'Use 是 (shì) to link a person/subject to a role, identity, or noun.',
    requiredParticles: ['是'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          getWordPos(w) === 'noun' &&
          hasFeature(w, 'human') &&
          w.hanzi !== chosen.subject?.hanzi
      }
    ],
    realize(slots, poolMap) {
      const shi = getParticleEntry('是', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const isPlural = subj.subjectType === '1pl' || subj.subjectType === '3pl';
      const nounEn = realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, {
        count: isPlural ? 2 : 1,
        indefinite: !isPlural
      });
      const verbEn = realizeEnglishVerb('be', { subjectType: subj.subjectType });

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(shi, 'particle', 1),
          tokenFromWord(slots.noun, 'noun', 2)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${verbEn} ${nounEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '很', pinyin: 'hěn', reason: 'Do not use 很 with noun identity 是' },
          { hanzi: '有', pinyin: 'yǒu', reason: '有 indicates possession, not identity' }
        ])
      });
    }
  },
  {
    id: 'shi_neg',
    hskLevel: 1,
    title: 'Negative Identity (S + 不是 + N)',
    ruleSummary: 'Place 不 (bù) directly before 是 (shì) to negate an identity statement.',
    requiredParticles: ['不', '是'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          getWordPos(w) === 'noun' &&
          hasFeature(w, 'human') &&
          w.hanzi !== chosen.subject?.hanzi
      }
    ],
    realize(slots, poolMap) {
      const bu = getParticleEntry('不', poolMap);
      const shi = getParticleEntry('是', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const isPlural = subj.subjectType === '1pl' || subj.subjectType === '3pl';
      const nounEn = realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, {
        count: isPlural ? 2 : 1,
        indefinite: !isPlural
      });
      const verbEn = realizeEnglishVerb('be', { subjectType: subj.subjectType, negated: true });

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(bu, 'negation', 1),
          tokenFromWord(shi, 'particle', 2),
          tokenFromWord(slots.noun, 'noun', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${verbEn} ${nounEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '没', pinyin: 'méi', reason: 'Negate 是 with 不, never 没' },
          { hanzi: '吗', pinyin: 'ma', reason: '吗 turns a statement into a question' }
        ])
      });
    }
  },
  {
    id: 'shi_ma',
    hskLevel: 1,
    title: 'Yes/No Identity Question (S + 是 + N + 吗)',
    ruleSummary: 'Add sentence-final 吗 (ma) to turn an S + 是 + N statement into a yes/no question.',
    requiredParticles: ['是', '吗'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          getWordPos(w) === 'noun' &&
          hasFeature(w, 'human') &&
          w.hanzi !== chosen.subject?.hanzi
      }
    ],
    realize(slots, poolMap) {
      const shi = getParticleEntry('是', poolMap);
      const ma = getParticleEntry('吗', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const isPlural = subj.subjectType === '1pl' || subj.subjectType === '3pl';
      const nounEn = realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, {
        count: isPlural ? 2 : 1,
        indefinite: !isPlural
      });
      const beForm = getBeForm(subj.subjectType, 'present');

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(shi, 'particle', 1),
          tokenFromWord(slots.noun, 'noun', 2),
          tokenFromWord(ma, 'question_particle', 3)
        ],
        punctuation: '？',
        english: capitalizeSentence(`${beForm} ${subj.text} ${nounEn}`, '?'),
        distractorTokens: buildDistractors([
          { hanzi: '呢', pinyin: 'ne', reason: 'Use 吗 for full yes/no questions' },
          { hanzi: '了', pinyin: 'le', reason: '了 marks completion, not a yes/no question' }
        ])
      });
    }
  },
  {
    id: 'you_possession',
    hskLevel: 1,
    title: 'Possession with Classifier (S + 有 + Num + CL + N)',
    ruleSummary: 'Use 有 (yǒu) + Number + Measure Word (量词) + Noun. Always use 两 (liǎng) instead of 二 before a classifier.',
    requiredParticles: ['有'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      NUMBER_PRE_CL_SLOT,
      CLASSIFIER_SLOT,
      NOUN_FOR_CL_SLOT
    ],
    realize(slots, poolMap) {
      const you = getParticleEntry('有', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const haveEn = realizeEnglishVerb('have', { subjectType: subj.subjectType });
      const phraseEn = realizeClassifierPhraseEnglish(slots.number, slots.classifier, slots.noun);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(you, 'verb', 1),
          tokenFromWord(slots.number, 'number', 2),
          tokenFromWord(slots.classifier, 'classifier', 3),
          tokenFromWord(slots.noun, 'noun', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${haveEn} ${phraseEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '二', pinyin: 'èr', reason: 'Use 两, not 二, before a measure word' },
          { hanzi: '是', pinyin: 'shì', reason: 'Use 有 for possession, not 是' }
        ])
      });
    }
  },
  {
    id: 'you_neg',
    hskLevel: 1,
    title: 'Negative Possession (S + 没有 + N)',
    ruleSummary: 'Always negate 有 (yǒu) with 没 (méi) → 没有 (méiyǒu), never 不有.',
    requiredParticles: ['没有'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          getWordPos(w) === 'noun' &&
          w.hanzi !== chosen.subject?.hanzi &&
          hasAnyFeature(w, ['object', 'food', 'drink', 'animal', 'human', 'money', 'readable', 'device'])
      }
    ],
    realize(slots, poolMap) {
      const meiyou = getParticleEntry('没有', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const negHaveEn = realizeEnglishVerb('have', { subjectType: subj.subjectType, negated: true });
      const nounEn = realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, {
        count: 1,
        indefinite: true
      });

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(meiyou, 'neg_verb', 1),
          tokenFromWord(slots.noun, 'noun', 2)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${negHaveEn} ${nounEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '不', pinyin: 'bù', reason: 'Never use 不 to negate 有' },
          { hanzi: '了', pinyin: 'le', reason: 'Avoid adding 了 to negated 没有' }
        ])
      });
    }
  },
  {
    id: 'de_possessive',
    hskLevel: 1,
    title: 'Possessive Description (Pron + 的 + N + 很 + Adj)',
    ruleSummary: 'Link a possessor and noun with 的 (de), then describe it with 很 (hěn) + Adjective.',
    requiredParticles: ['的', '很'],
    slots: [
      SINGULAR_PRON_SLOT,
      {
        role: 'noun',
        filter: (w) =>
          getWordPos(w) === 'noun' &&
          hasAnyFeature(w, ['human', 'object', 'food', 'drink', 'animal', 'readable', 'wearable'])
      },
      {
        role: 'adj',
        filter: (w, chosen) => doesAdjMatchSubject(w, chosen.noun)
      }
    ],
    realize(slots, poolMap) {
      const de = getParticleEntry('的', poolMap);
      const hen = getParticleEntry('很', poolMap);
      const poss = realizeSubjectEnglish(slots.subject).possessive;
      const nounEn = realizeEnglishNoun(slots.noun.enGloss || slots.noun.meaning, { count: 1 });
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'possessor', 0),
          tokenFromWord(de, 'particle', 1),
          tokenFromWord(slots.noun, 'noun', 2),
          tokenFromWord(hen, 'adverb', 3),
          tokenFromWord(slots.adj, 'adj', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${poss} ${nounEn} is very ${adjEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '是', pinyin: 'shì', reason: 'Do not use 是 before a simple adjective predicate' },
          { hanzi: '了', pinyin: 'le', reason: '很 + Adj does not require 了' }
        ])
      });
    }
  },

  // --------------------------------------------------------------------------
  // GROUP 2: ADJECTIVES & MODALS (7–14)
  // --------------------------------------------------------------------------
  {
    id: 'adj_hen',
    hskLevel: 1,
    title: 'Adjective Predicate (S + 很 + Adj)',
    ruleSummary: 'Mandarin links a subject and adjective with 很 (hěn) rather than 是.',
    requiredParticles: ['很'],
    slots: [
      {
        role: 'subject',
        filter: (w) =>
          (getWordPos(w) === 'pron' &&
            hasFeature(w, 'human') &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative'])) ||
          (getWordPos(w) === 'noun' && !hasAnyFeature(w, ['interrogative', 'demonstrative']))
      },
      ADJ_FOR_SUBJ_SLOT
    ],
    realize(slots, poolMap) {
      const hen = getParticleEntry('很', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const beForm = getBeForm(subj.subjectType, 'present');
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(hen, 'adverb', 1),
          tokenFromWord(slots.adj, 'adj', 2)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${beForm} very ${adjEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '是', pinyin: 'shì', reason: 'Avoid 是 before adjectives; use 很' },
          { hanzi: '没', pinyin: 'méi', reason: '很 is a degree adverb, not negation' }
        ])
      });
    }
  },
  {
    id: 'adj_neg',
    hskLevel: 1,
    title: 'Negated Adjective (S + 不 + Adj)',
    ruleSummary: 'Place 不 (bù) before an adjective to negate a quality or state.',
    requiredParticles: ['不'],
    slots: [
      {
        role: 'subject',
        filter: (w) =>
          (getWordPos(w) === 'pron' &&
            hasFeature(w, 'human') &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative'])) ||
          (getWordPos(w) === 'noun' && !hasAnyFeature(w, ['interrogative', 'demonstrative']))
      },
      ADJ_FOR_SUBJ_SLOT
    ],
    realize(slots, poolMap) {
      const bu = getParticleEntry('不', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const beForm = getBeForm(subj.subjectType, 'present');
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(bu, 'negation', 1),
          tokenFromWord(slots.adj, 'adj', 2)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${beForm} not ${adjEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '没', pinyin: 'méi', reason: 'Negate adjectives with 不, not 没' },
          { hanzi: '是', pinyin: 'shì', reason: 'Do not insert 是 before an adjective' }
        ])
      });
    }
  },
  {
    id: 'adj_tai_le',
    hskLevel: 1,
    title: 'Exclamative太...了 (N + 太 + Adj + 了)',
    ruleSummary: 'Frame an adjective with 太 (tài) ... 了 (le) to express "too / extremely [Adj]!".',
    requiredParticles: ['太', '了'],
    slots: [
      {
        role: 'noun',
        filter: (w) =>
          (getWordPos(w) === 'noun' || getWordPos(w) === 'place') &&
          !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location'])
      },
      ADJ_FOR_SUBJ_SLOT
    ],
    realize(slots, poolMap) {
      const tai = getParticleEntry('太', poolMap);
      const le = getParticleEntry('了', poolMap);
      const subj = realizeSubjectEnglish(slots.noun);
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.noun, 'noun', 0),
          tokenFromWord(tai, 'adverb', 1),
          tokenFromWord(slots.adj, 'adj', 2),
          tokenFromWord(le, 'particle', 3)
        ],
        punctuation: '！',
        english: capitalizeSentence(`${subj.text} is so ${adjEn}`, '!'),
        distractorTokens: buildDistractors([
          { hanzi: '很', pinyin: 'hěn', reason: '太...了 expresses exclamation rather than plain 很' },
          { hanzi: '吗', pinyin: 'ma', reason: '太...了 ends with 了, not 吗' }
        ])
      });
    }
  },
  {
    id: 'modal_hui',
    hskLevel: 1,
    title: 'Learned Ability (S + 会 + V + O)',
    ruleSummary: 'Use 会 (huì) before a verb to express a learned skill ("know how to / can").',
    requiredParticles: ['会'],
    slots: [STANDARD_SUBJECT_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const hui = getParticleEntry('会', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, modal: 'can' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(hui, 'modal', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '了', pinyin: 'le', reason: 'Learned ability 会 does not take completion 了' },
          { hanzi: '很', pinyin: 'hěn', reason: 'Do not insert 很 before action verbs' }
        ])
      });
    }
  },
  {
    id: 'modal_xiang',
    hskLevel: 1,
    title: 'Desire / Intention (S + 想 + V + O)',
    ruleSummary: 'Place 想 (xiǎng) before a verb phrase to express "would like to / want to".',
    requiredParticles: ['想'],
    slots: [STANDARD_SUBJECT_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const xiang = getParticleEntry('想', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, modal: 'want to' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(xiang, 'modal', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '是', pinyin: 'shì', reason: 'Use modal 想 directly before the verb' },
          { hanzi: '在', pinyin: 'zài', reason: '在 marks location/progressive, not desire' }
        ])
      });
    }
  },
  {
    id: 'modal_neng',
    hskLevel: 1,
    title: 'Capability / Possibility (S + 能 + V + O)',
    ruleSummary: 'Use 能 (néng) before a verb to express physical ability or situational possibility.',
    requiredParticles: ['能'],
    slots: [STANDARD_SUBJECT_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const neng = getParticleEntry('能', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, modal: 'can' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(neng, 'modal', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '没', pinyin: 'méi', reason: 'Modal 能 is negated with 不, not 没' },
          { hanzi: '了', pinyin: 'le', reason: 'Avoid adding 了 after modal 能' }
        ])
      });
    }
  },
  {
    id: 'modal_yao',
    hskLevel: 1,
    title: 'Strong Will / Future Plan (S + 要 + V + O)',
    ruleSummary: 'Use 要 (yào) before a verb to express a firm wish, plan, or need.',
    requiredParticles: ['要'],
    slots: [STANDARD_SUBJECT_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const yao = getParticleEntry('要', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, modal: 'want to' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(yao, 'modal', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '吗', pinyin: 'ma', reason: 'This is a statement, not a question' },
          { hanzi: '很', pinyin: 'hěn', reason: 'Do not put 很 before 要 + Verb' }
        ])
      });
    }
  },
  {
    id: 'modal_keyi_q',
    hskLevel: 1,
    title: 'Polite Permission Question (S + 可以 + V + O + 吗)',
    ruleSummary: 'Combine 可以 (kěyǐ) with sentence-final 吗 (ma) to politely ask for permission.',
    requiredParticles: ['可以', '吗'],
    slots: [SINGULAR_PRON_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const keyi = getParticleEntry('可以', poolMap);
      const ma = getParticleEntry('吗', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voBase = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: '1pl' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(keyi, 'modal', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3),
          tokenFromWord(ma, 'question_particle', 4)
        ],
        punctuation: '？',
        english: capitalizeSentence(`may ${subj.text} ${voBase}`, '?'),
        distractorTokens: buildDistractors([
          { hanzi: '呢', pinyin: 'ne', reason: 'Permission questions use 吗, not 呢' },
          { hanzi: '吧', pinyin: 'ba', reason: '吧 makes a suggestion rather than asking permission' }
        ])
      });
    }
  },

  // --------------------------------------------------------------------------
  // GROUP 3: TIME, LOCATION & SERIAL VERBS (15–20)
  // --------------------------------------------------------------------------
  {
    id: 'time_action',
    hskLevel: 1,
    title: 'Time-Before-Verb (S + Time + V + O)',
    ruleSummary: 'Time expressions always precede the verb: either S + Time + V + O or Time + S + V + O.',
    requiredParticles: [],
    slots: [STANDARD_SUBJECT_SLOT, TIME_ANY_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots) {
      const subj = realizeSubjectEnglish(slots.subject);
      const isPast = hasFeature(slots.time, 'time_past');
      const timeEn = realizeTimeEnglish(slots.time);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: isPast ? 'past' : 'present' },
        { count: 1 }
      );

      const altVariant = `${slots.time.hanzi}${slots.subject.hanzi}${slots.verb.hanzi}${slots.object.hanzi}。`;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.time, 'time', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} ${timeEn}`, '.'),
        acceptedVariants: [altVariant],
        distractorTokens: buildDistractors([
          { hanzi: '在', pinyin: 'zài', reason: 'Do not put 在 before time words like 今天/明天' },
          { hanzi: '很', pinyin: 'hěn', reason: 'Action verbs do not take 很' }
        ])
      });
    }
  },
  {
    id: 'zai_location_action',
    hskLevel: 1,
    title: 'Location-Before-Verb (S + 在 + Place + V + O)',
    ruleSummary: 'In Mandarin, where an action happens (在 + Place) comes BEFORE the verb, never at the end.',
    requiredParticles: ['在'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      PLACE_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) && !['去', '来', '回', '住'].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const zai = getParticleEntry('在', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const placeEn = realizeLocationPreposition(slots.place);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(zai, 'prep', 1),
          tokenFromWord(slots.place, 'place', 2),
          tokenFromWord(slots.verb, 'verb', 3),
          tokenFromWord(slots.object, 'object', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} ${placeEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '去', pinyin: 'qù', reason: '在 marks static location where the action happens' },
          { hanzi: '是', pinyin: 'shì', reason: 'Use 在 + Place, not 是 + Place' }
        ])
      });
    }
  },
  {
    id: 'time_place_action',
    hskLevel: 1,
    title: 'Golden Word Order (S + Time + 在 + Place + V + O)',
    ruleSummary: 'Follow Mandarin Golden Word Order: Subject → Time → Location (在 + Place) → Verb → Object.',
    requiredParticles: ['在'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      TIME_ANY_SLOT,
      PLACE_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) && !['去', '来', '回', '住'].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const zai = getParticleEntry('在', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const isPast = hasFeature(slots.time, 'time_past');
      const timeEn = realizeTimeEnglish(slots.time);
      const placeEn = realizeLocationPreposition(slots.place);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: isPast ? 'past' : 'present' },
        { count: 1 }
      );

      const altVariant = `${slots.time.hanzi}${slots.subject.hanzi}在${slots.place.hanzi}${slots.verb.hanzi}${slots.object.hanzi}。`;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.time, 'time', 1),
          tokenFromWord(zai, 'prep', 2),
          tokenFromWord(slots.place, 'place', 3),
          tokenFromWord(slots.verb, 'verb', 4),
          tokenFromWord(slots.object, 'object', 5)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} ${placeEn} ${timeEn}`, '.'),
        acceptedVariants: [altVariant],
        distractorTokens: buildDistractors([
          { hanzi: '的', pinyin: 'de', reason: 'Do not place 的 between place and verb' },
          { hanzi: '了', pinyin: 'le', reason: 'Keep standard Time → Place → Verb order' }
        ])
      });
    }
  },
  {
    id: 'serial_qu_place_v',
    hskLevel: 1,
    title: 'Serial Verb Purpose (S + 去 + Place + V + O)',
    ruleSummary: 'Express "go to [Place] to [Verb]" in chronological order: S + 去 + Place + V + O (no word for "to").',
    requiredParticles: ['去'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      PLACE_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) && !['去', '来', '回', '住'].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const qu = getParticleEntry('去', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const goEn = realizeEnglishVerb('go', { subjectType: subj.subjectType });
      const destEn = realizeGoPlaceEnglish(slots.place);
      const voBase = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: '1pl' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(qu, 'motion_verb', 1),
          tokenFromWord(slots.place, 'place', 2),
          tokenFromWord(slots.verb, 'verb', 3),
          tokenFromWord(slots.object, 'object', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${goEn} ${destEn} to ${voBase}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '在', pinyin: 'zài', reason: 'Use 去 for movement to a destination, not 在' },
          { hanzi: '的', pinyin: 'de', reason: 'Serial verbs connect directly without 的' }
        ])
      });
    }
  },
  {
    id: 'existential_place_you',
    hskLevel: 1,
    title: 'Existential Location (Place + Loc + 有 + Num + CL + N)',
    ruleSummary: 'State what exists in a place with Place + Position (里面/前面/后面/上面/下面) + 有 + Num + CL + N.',
    requiredParticles: ['有'],
    slots: [
      PLACE_SLOT,
      {
        role: 'location',
        filter: (w) => hasFeature(w, 'location')
      },
      NUMBER_PRE_CL_SLOT,
      CLASSIFIER_SLOT,
      NOUN_FOR_CL_SLOT
    ],
    realize(slots, poolMap) {
      const you = getParticleEntry('有', poolMap);
      const nVal = NUMBER_VALUES[slots.number?.hanzi] ?? 1;
      const beExist = nVal === 1 ? 'there is' : 'there are';
      const phraseEn = realizeClassifierPhraseEnglish(slots.number, slots.classifier, slots.noun);
      const placeEn = realizePlaceEnglish(slots.place);
      const locEn = realizeTimeEnglish(slots.location);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.place, 'place', 0),
          tokenFromWord(slots.location, 'location', 1),
          tokenFromWord(you, 'verb', 2),
          tokenFromWord(slots.number, 'number', 3),
          tokenFromWord(slots.classifier, 'classifier', 4),
          tokenFromWord(slots.noun, 'noun', 5)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${beExist} ${phraseEn} ${locEn} ${placeEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '是', pinyin: 'shì', reason: 'Use 有 for existential "there is/are"' },
          { hanzi: '二', pinyin: 'èr', reason: 'Use 两 instead of 二 before a classifier' }
        ])
      });
    }
  },
  {
    id: 'suggestion_ba',
    hskLevel: 1,
    title: 'Group Suggestion (我们 + V + O + 吧)',
    ruleSummary: 'Add sentence-final 吧 (ba) after 我们 + Verb + Object to make a friendly suggestion ("Let\'s...").',
    requiredParticles: ['我们', '吧'],
    slots: [TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const women = getParticleEntry('我们', poolMap);
      const ba = getParticleEntry('吧', poolMap);
      const voBase = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: '1pl' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(women, 'subject', 0),
          tokenFromWord(slots.verb, 'verb', 1),
          tokenFromWord(slots.object, 'object', 2),
          tokenFromWord(ba, 'particle', 3)
        ],
        punctuation: '！',
        english: capitalizeSentence(`let's ${voBase}`, '!'),
        distractorTokens: buildDistractors([
          { hanzi: '吗', pinyin: 'ma', reason: '吗 asks a question; 吧 makes a suggestion' },
          { hanzi: '呢', pinyin: 'ne', reason: 'Use 吧 for "Let\'s..." suggestions' }
        ])
      });
    }
  },

  // --------------------------------------------------------------------------
  // GROUP 4: ASPECT, QUESTIONS & SEPARABLE VERBS (21–30)
  // --------------------------------------------------------------------------
  {
    id: 'progressive_zhengzai',
    hskLevel: 1,
    title: 'Ongoing Action (S + 正在 + V + O + 呢)',
    ruleSummary: 'Frame an active verb with 正在 (zhèngzài) ... 呢 (ne) to show an action happening right now.',
    requiredParticles: ['正在', '呢'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'verb',
        filter: (w) => TRANSITIVE_VERB_SLOT.filter(w) && !hasFeature(w, 'stative')
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const zhengzai = getParticleEntry('正在', poolMap);
      const ne = getParticleEntry('呢', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: 'progressive' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(zhengzai, 'aspect', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3),
          tokenFromWord(ne, 'particle', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} right now`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '了', pinyin: 'le', reason: 'Ongoing 正在...呢 cannot combine with completion 了' },
          { hanzi: '吗', pinyin: 'ma', reason: 'Use 呢 to soften progressive statements' }
        ])
      });
    }
  },
  {
    id: 'completed_le_obj',
    hskLevel: 1,
    title: 'Completed Action with Quantity (S + TimePast + V + 了 + Num + CL + N)',
    ruleSummary: 'Attach 了 (le) immediately after the verb for a completed past action with a quantified object.',
    requiredParticles: ['了'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      TIME_PAST_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) &&
          ['吃', '喝', '买', '看', '读', '写'].includes(w.hanzi)
      },
      NUMBER_PRE_CL_SLOT,
      CLASSIFIER_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          doesClassifierMatchNoun(chosen.classifier, w) && doesVerbMatchObject(chosen.verb, w)
      }
    ],
    realize(slots, poolMap) {
      const le = getParticleEntry('了', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const timeEn = realizeTimeEnglish(slots.timePast);
      const verbPast = realizeEnglishVerb(slots.verb.enGloss || slots.verb.meaning, {
        subjectType: subj.subjectType,
        tense: 'past'
      });
      const phraseEn = realizeClassifierPhraseEnglish(slots.number, slots.classifier, slots.noun);

      const altVariant = `${slots.timePast.hanzi}${slots.subject.hanzi}${slots.verb.hanzi}了${slots.number.hanzi}${slots.classifier.hanzi}${slots.noun.hanzi}。`;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.timePast, 'time', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(le, 'aspect', 3),
          tokenFromWord(slots.number, 'number', 4),
          tokenFromWord(slots.classifier, 'classifier', 5),
          tokenFromWord(slots.noun, 'noun', 6)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${verbPast} ${phraseEn} ${timeEn}`, '.'),
        acceptedVariants: [altVariant],
        distractorTokens: buildDistractors([
          { hanzi: '没', pinyin: 'méi', reason: 'Affirmative completed actions use 了, not 没' },
          { hanzi: '二', pinyin: 'èr', reason: 'Use 两 instead of 二 before a classifier' }
        ])
      });
    }
  },
  {
    id: 'past_neg_mei',
    hskLevel: 1,
    title: 'Past Negation (S + TimePast + 没 + V + O)',
    ruleSummary: 'Negate past events with 没 (méi) before the verb—never use 不 for past actions and drop 了.',
    requiredParticles: ['没'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      TIME_PAST_SLOT,
      {
        role: 'verb',
        filter: (w) => TRANSITIVE_VERB_SLOT.filter(w) && !hasFeature(w, 'stative')
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const mei = getParticleEntry('没', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const timeEn = realizeTimeEnglish(slots.timePast);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: 'past', negated: true },
        { count: 1 }
      );

      const altVariant = `${slots.timePast.hanzi}${slots.subject.hanzi}没${slots.verb.hanzi}${slots.object.hanzi}。`;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.timePast, 'time', 1),
          tokenFromWord(mei, 'negation', 2),
          tokenFromWord(slots.verb, 'verb', 3),
          tokenFromWord(slots.object, 'object', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} ${timeEn}`, '.'),
        acceptedVariants: [altVariant],
        distractorTokens: buildDistractors([
          { hanzi: '不', pinyin: 'bù', reason: 'Use 没 (not 不) to negate past events' },
          { hanzi: '了', pinyin: 'le', reason: 'Drop completion 了 when negating with 没' }
        ])
      });
    }
  },
  {
    id: 'a_not_a_verb',
    hskLevel: 1,
    title: 'A-not-A Verb Question (S + V + 不 + V + O)',
    ruleSummary: 'Form a direct yes/no question by repeating the verb around 不 (V不V). Do NOT add 吗.',
    requiredParticles: ['不'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) && Array.from(w.hanzi || '').length === 1
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const bu = getParticleEntry('不', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const doForm = getDoForm(subj.subjectType, 'present');
      const voBase = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: '1pl' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.verb, 'verb', 1),
          tokenFromWord(bu, 'negation', 2),
          tokenFromWord(slots.verb, 'verb_repeat', 3),
          tokenFromWord(slots.object, 'object', 4)
        ],
        punctuation: '？',
        english: capitalizeSentence(`${doForm} ${subj.text} ${voBase}`, '?'),
        distractorTokens: buildDistractors([
          { hanzi: '吗', pinyin: 'ma', reason: 'Never combine A-not-A questions with 吗' },
          { hanzi: '没', pinyin: 'méi', reason: 'Present A-not-A uses V不V' }
        ])
      });
    }
  },
  {
    id: 'a_not_a_adj',
    hskLevel: 1,
    title: 'A-not-A Adjective Question (N + Adj + 不 + Adj)',
    ruleSummary: 'Repeat a single-character adjective around 不 (Adj不Adj) to ask "Is it [Adj] or not?". Never add 吗 or 很.',
    requiredParticles: ['不'],
    slots: [
      {
        role: 'noun',
        filter: (w) =>
          (getWordPos(w) === 'noun' || getWordPos(w) === 'place') &&
          !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location'])
      },
      {
        role: 'adj',
        filter: (w, chosen) =>
          doesAdjMatchSubject(w, chosen.noun) && Array.from(w.hanzi || '').length === 1
      }
    ],
    realize(slots, poolMap) {
      const bu = getParticleEntry('不', poolMap);
      const subj = realizeSubjectEnglish(slots.noun);
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.noun, 'noun', 0),
          tokenFromWord(slots.adj, 'adj', 1),
          tokenFromWord(bu, 'negation', 2),
          tokenFromWord(slots.adj, 'adj_repeat', 3)
        ],
        punctuation: '？',
        english: capitalizeSentence(`is ${subj.text} ${adjEn}`, '?'),
        distractorTokens: buildDistractors([
          { hanzi: '吗', pinyin: 'ma', reason: 'Never add 吗 to an A-not-A question' },
          { hanzi: '很', pinyin: 'hěn', reason: 'Drop 很 inside Adj不Adj questions' }
        ])
      });
    }
  },
  {
    id: 'verb_yixia',
    hskLevel: 1,
    title: 'Brief / Casual Action (S + V + 一下 + O)',
    ruleSummary: 'Place 一下 (yīxià) after a verb to soften the tone or mean "briefly / give it a try".',
    requiredParticles: ['一下'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) &&
          ['看', '听', '问', '读', '写', '找', '等', '买'].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const yixia = getParticleEntry('一下', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType },
        { count: 1, definite: true }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.verb, 'verb', 1),
          tokenFromWord(yixia, 'complement', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} briefly ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '一个', pinyin: 'yīgè', reason: 'Use 一下 after verbs, not noun classifier 一个' },
          { hanzi: '很', pinyin: 'hěn', reason: '一下 follows the verb directly' }
        ])
      });
    }
  },
  {
    id: 'double_obj_gei',
    hskLevel: 1,
    title: 'Polite Double Object (请 + 给 + Pron + Num + CL + N)',
    ruleSummary: 'Use 请给 + Recipient + Quantity + Noun for polite requests ("Please give me a cup of tea").',
    requiredParticles: ['请', '给'],
    slots: [
      {
        role: 'recipient',
        filter: (w) =>
          getWordPos(w) === 'pron' &&
          hasFeature(w, 'human') &&
          ['我', '我们', '他', '她'].includes(w.hanzi)
      },
      NUMBER_PRE_CL_SLOT,
      CLASSIFIER_SLOT,
      {
        role: 'noun',
        filter: (w, chosen) =>
          doesClassifierMatchNoun(chosen.classifier, w) &&
          hasAnyFeature(w, ['food', 'drink', 'object', 'readable', 'buyable'])
      }
    ],
    realize(slots, poolMap) {
      const qing = getParticleEntry('请', poolMap);
      const gei = getParticleEntry('给', poolMap);
      const recMap = { 我: 'me', 我们: 'us', 他: 'him', 她: 'her' };
      const recEn = recMap[slots.recipient.hanzi] || 'me';
      const phraseEn = realizeClassifierPhraseEnglish(slots.number, slots.classifier, slots.noun);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(qing, 'polite', 0),
          tokenFromWord(gei, 'verb', 1),
          tokenFromWord(slots.recipient, 'recipient', 2),
          tokenFromWord(slots.number, 'number', 3),
          tokenFromWord(slots.classifier, 'classifier', 4),
          tokenFromWord(slots.noun, 'noun', 5)
        ],
        punctuation: '。',
        english: capitalizeSentence(`please give ${recEn} ${phraseEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '二', pinyin: 'èr', reason: 'Use 两 instead of 二 before a classifier' },
          { hanzi: '的', pinyin: 'de', reason: 'Double-object 给 does not take 的' }
        ])
      });
    }
  },
  {
    id: 'scope_dou',
    hskLevel: 1,
    title: 'Inclusive Scope Adverb (PluralS + 都 + V + O)',
    ruleSummary: 'The adverb 都 (dōu, "all / both") always stands AFTER the plural subject and BEFORE the verb.',
    requiredParticles: ['都'],
    slots: [PLURAL_SUBJECT_SLOT, TRANSITIVE_VERB_SLOT, OBJECT_FOR_VERB_SLOT],
    realize(slots, poolMap) {
      const dou = getParticleEntry('都', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(dou, 'adverb', 1),
          tokenFromWord(slots.verb, 'verb', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} all ${voEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '很', pinyin: 'hěn', reason: '都 expresses "all/both" before verbs' },
          { hanzi: '了', pinyin: 'le', reason: 'Habitual 都 statements do not require 了' }
        ])
      });
    }
  },
  {
    id: 'separable_le',
    hskLevel: 1,
    title: 'Separable Verb with 了 (S + TimePast + V1 + 了 + V2)',
    ruleSummary: 'Separable verbs (离合词 like 上课, 睡觉, 吃饭) split apart to insert 了 between V1 and V2 (上了课, 睡了觉).',
    requiredParticles: ['了'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      TIME_PAST_SLOT,
      {
        role: 'separableVerb',
        filter: (w) =>
          Boolean(w.isSeparable || w.linguistics?.isSeparable) &&
          Array.isArray(w.sepParts || w.linguistics?.sepParts) &&
          (w.sepParts || w.linguistics?.sepParts).length === 2
      }
    ],
    realize(slots, poolMap) {
      const le = getParticleEntry('了', poolMap);
      const parts = splitSeparableVerbParts(slots.separableVerb);
      const subj = realizeSubjectEnglish(slots.subject);
      const timeEn = realizeTimeEnglish(slots.timePast);
      const pastEn = realizeEnglishVerb(
        slots.separableVerb.enGloss || slots.separableVerb.meaning,
        { subjectType: subj.subjectType, tense: 'past' }
      );

      const altVariant = `${slots.timePast.hanzi}${slots.subject.hanzi}${parts.v1}了${parts.v2}。`;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.timePast, 'time', 1),
          makeToken({
            id: `tok_sep_v1_2_${parts.v1}`,
            role: 'sep_v1',
            hanzi: parts.v1,
            pinyin: parts.v1Pinyin,
            english: pastEn,
            pos: 'verb',
            isBlankCandidate: true,
            sourceWord: slots.separableVerb
          }),
          tokenFromWord(le, 'aspect', 3),
          makeToken({
            id: `tok_sep_v2_4_${parts.v2}`,
            role: 'sep_v2',
            hanzi: parts.v2,
            pinyin: parts.v2Pinyin,
            english: '',
            pos: 'noun',
            isBlankCandidate: true,
            sourceWord: slots.separableVerb
          })
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${pastEn} ${timeEn}`, '.'),
        acceptedVariants: [altVariant],
        distractorTokens: buildDistractors([
          { hanzi: '不', pinyin: 'bù', reason: 'Completed past separable verbs split with 了' },
          { hanzi: '没', pinyin: 'méi', reason: 'Affirmative past uses 了 inside V1 + 了 + V2' }
        ])
      });
    }
  },
  {
    id: 'separable_modifier',
    hskLevel: 1,
    title: 'Separable Verb with Modifier (S + V1 + Mod + V2)',
    ruleSummary: 'Insert modifiers directly INSIDE separable verbs (离合词): 上中文课 (not *上课中文), 看汉语书 (not *看书汉语).',
    requiredParticles: [],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'separableVerb',
        filter: (w) =>
          Boolean(w.isSeparable || w.linguistics?.isSeparable) &&
          Array.isArray(w.sepParts || w.linguistics?.sepParts) &&
          (w.sepParts || w.linguistics?.sepParts).length === 2
      },
      {
        role: 'modifier',
        filter: (w, chosen) => doesModifierMatchSeparable(chosen.separableVerb, w)
      }
    ],
    realize(slots) {
      const parts = splitSeparableVerbParts(slots.separableVerb);
      const subj = realizeSubjectEnglish(slots.subject);
      const modEn = realizeEnglishNoun(slots.modifier.enGloss || slots.modifier.meaning, { count: 1 });

      const v2Map = {
        课: 'class',
        书: 'books',
        饭: 'food',
        歌: 'songs',
        话: ''
      };
      const v1VerbMap = {
        上: 'attend',
        下: 'finish',
        看: 'read',
        读: 'read',
        吃: 'eat',
        做: 'cook',
        唱: 'sing',
        说: 'speak'
      };
      const verbBase = v1VerbMap[parts.v1] || 'do';
      const verbEn = realizeEnglishVerb(verbBase, { subjectType: subj.subjectType });
      const objTail = v2Map[parts.v2] ? `${modEn} ${v2Map[parts.v2]}` : modEn;

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          makeToken({
            id: `tok_sep_v1_1_${parts.v1}`,
            role: 'sep_v1',
            hanzi: parts.v1,
            pinyin: parts.v1Pinyin,
            english: verbBase,
            pos: 'verb',
            isBlankCandidate: true,
            sourceWord: slots.separableVerb
          }),
          tokenFromWord(slots.modifier, 'modifier', 2),
          makeToken({
            id: `tok_sep_v2_3_${parts.v2}`,
            role: 'sep_v2',
            hanzi: parts.v2,
            pinyin: parts.v2Pinyin,
            english: v2Map[parts.v2] || parts.v2,
            pos: 'noun',
            isBlankCandidate: true,
            sourceWord: slots.separableVerb
          })
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${verbEn} ${objTail}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '的', pinyin: 'de', reason: 'Short language/country modifiers fit directly inside V1 + Mod + V2' },
          { hanzi: '很', pinyin: 'hěn', reason: 'Do not place 很 before an action verb' }
        ])
      });
    }
  },

  // --------------------------------------------------------------------------
  // GROUP 5: HSK 2 FORWARD-GATED SCHEMAS (31–32)
  // --------------------------------------------------------------------------
  {
    id: 'compare_bi',
    hskLevel: 2,
    title: 'Comparison with 比 (A + 比 + B + Adj)',
    ruleSummary: 'Compare two nouns using A + 比 (bǐ) + B + Adjective. Do NOT insert 很 before the adjective.',
    requiredParticles: ['比'],
    slots: [
      {
        role: 'nounA',
        filter: (w) =>
          (getWordPos(w) === 'noun' || getWordPos(w) === 'place') &&
          !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location'])
      },
      {
        role: 'nounB',
        filter: (w, chosen) =>
          w.hanzi !== chosen.nounA?.hanzi &&
          getWordPos(w) === getWordPos(chosen.nounA) &&
          !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location'])
      },
      {
        role: 'adj',
        filter: (w, chosen) =>
          doesAdjMatchSubject(w, chosen.nounA) && doesAdjMatchSubject(w, chosen.nounB)
      }
    ],
    realize(slots, poolMap) {
      const bi = getParticleEntry('比', poolMap);
      const aEn = realizeSubjectEnglish(slots.nounA).text;
      const bEn = realizeSubjectEnglish(slots.nounB).text;
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.nounA, 'compare_a', 0),
          tokenFromWord(bi, 'prep', 1),
          tokenFromWord(slots.nounB, 'compare_b', 2),
          tokenFromWord(slots.adj, 'adj', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${aEn} is more ${adjEn} than ${bEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '很', pinyin: 'hěn', reason: 'Never use 很 inside an A + 比 + B + Adj comparison' },
          { hanzi: '是', pinyin: 'shì', reason: 'Use 比 directly without 是' }
        ])
      });
    }
  },
  {
    id: 'experiential_guo',
    hskLevel: 2,
    title: 'Past Experience with 过 (S + V + 过 + O)',
    ruleSummary: 'Attach 过 (guo) right after the verb to express life experience ("have ever done X").',
    requiredParticles: ['过'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) &&
          ['去', '吃', '喝', '看', '读', '买', '学', '学习'].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const guo = getParticleEntry('过', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: 'experiential' },
        { count: 1 }
      );

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(slots.verb, 'verb', 1),
          tokenFromWord(guo, 'aspect', 2),
          tokenFromWord(slots.object, 'object', 3)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${voEn} before`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '了', pinyin: 'le', reason: '过 expresses past life experience, distinct from 了' },
          { hanzi: '在', pinyin: 'zài', reason: '在 marks ongoing actions, not past experience' }
        ])
      });
    }
  },

  // --------------------------------------------------------------------------
  // GROUP 6: HSK 2–3 FORWARD-GATED COMPLEX & STRUCTURAL SCHEMAS (33–38)
  // --------------------------------------------------------------------------
  {
    id: 'cause_yinwei_suoyi',
    hskLevel: 2,
    title: 'Cause & Effect (因为 ... 所以 ...)',
    ruleSummary:
      'Pair 因为 (yīnwèi, because) + Cause with 所以 (suǒyǐ, therefore) + Result to link cause and effect.',
    requiredParticles: ['因为', '所以'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'causeAdj',
        filter: (w, chosen) => Boolean(chosen?.subject) && doesAdjMatchSubject(w, chosen.subject)
      },
      TRANSITIVE_VERB_SLOT,
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const yinwei = getParticleEntry('因为', poolMap);
      const suoyi = getParticleEntry('所以', poolMap);
      if (!yinwei || !suoyi || !slots?.subject || !slots?.causeAdj || !slots?.verb || !slots?.object) {
        return null;
      }
      const hen = getParticleEntry('很', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const beEn = getBeForm(subj.subjectType, 'present');
      const adjEn = realizeAdjEnglish(slots.causeAdj);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: 'present' },
        { count: 1 }
      );

      const clause1Tokens = [
        tokenFromWord(yinwei, 'conj', 0),
        tokenFromWord(slots.subject, 'subject', 1),
        ...(hen ? [tokenFromWord(hen, 'adv', 2)] : []),
        tokenFromWord(slots.causeAdj, 'adj', 3)
      ];
      const clause2Tokens = [
        tokenFromWord(suoyi, 'conj', 4),
        tokenFromWord(slots.subject, 'subject_2', 5),
        tokenFromWord(slots.verb, 'verb', 6),
        tokenFromWord(slots.object, 'object', 7)
      ];
      const commaVariant = `${clause1Tokens.map((t) => t.hanzi).join('')}，${clause2Tokens
        .map((t) => t.hanzi)
        .join('')}。`;

      return buildResult({
        schema: this,
        tokens: [...clause1Tokens, ...clause2Tokens],
        punctuation: '。',
        english: capitalizeSentence(`Because ${subj.text} ${beEn} ${adjEn}, ${subj.text} ${voEn}`, '.'),
        acceptedVariants: [commaVariant],
        distractorTokens: buildDistractors([
          { hanzi: '但是', pinyin: 'dànshì', reason: '因为 pairs with 所以 (cause/effect), not 但是' },
          { hanzi: '虽然', pinyin: 'suīrán', reason: 'Use 因为 to introduce a reason/cause' }
        ])
      });
    }
  },
  {
    id: 'concession_suiran_danshi',
    hskLevel: 2,
    title: 'Concession (虽然 ... 但是 ...)',
    ruleSummary:
      'Contrast two clauses with 虽然 (suīrán, although) + Clause 1 and 但是 (dànshì, but) + Clause 2. Mandarin keeps both conjunctions together.',
    requiredParticles: ['虽然', '但是'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'adj',
        filter: (w, chosen) => Boolean(chosen?.subject) && doesAdjMatchSubject(w, chosen.subject)
      },
      TRANSITIVE_VERB_SLOT,
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const suiran = getParticleEntry('虽然', poolMap);
      const danshi = getParticleEntry('但是', poolMap);
      if (!suiran || !danshi || !slots?.subject || !slots?.adj || !slots?.verb || !slots?.object) {
        return null;
      }
      const hen = getParticleEntry('很', poolMap);
      const subj = realizeSubjectEnglish(slots.subject);
      const beEn = getBeForm(subj.subjectType, 'present');
      const adjEn = realizeAdjEnglish(slots.adj);
      const voEn = realizeVerbObjectEnglish(
        slots.verb,
        slots.object,
        { subjectType: subj.subjectType, tense: 'present' },
        { count: 1 }
      );

      const clause1Tokens = [
        tokenFromWord(suiran, 'conj', 0),
        tokenFromWord(slots.subject, 'subject', 1),
        ...(hen ? [tokenFromWord(hen, 'adv', 2)] : []),
        tokenFromWord(slots.adj, 'adj', 3)
      ];
      const clause2Tokens = [
        tokenFromWord(danshi, 'conj', 4),
        tokenFromWord(slots.subject, 'subject_2', 5),
        tokenFromWord(slots.verb, 'verb', 6),
        tokenFromWord(slots.object, 'object', 7)
      ];
      const commaVariant = `${clause1Tokens.map((t) => t.hanzi).join('')}，${clause2Tokens
        .map((t) => t.hanzi)
        .join('')}。`;

      return buildResult({
        schema: this,
        tokens: [...clause1Tokens, ...clause2Tokens],
        punctuation: '。',
        english: capitalizeSentence(`Although ${subj.text} ${beEn} ${adjEn}, ${subj.text} ${voEn}`, '.'),
        acceptedVariants: [commaVariant],
        distractorTokens: buildDistractors([
          { hanzi: '所以', pinyin: 'suǒyǐ', reason: '虽然 pairs with 但是 (contrast), not 所以' },
          { hanzi: '因为', pinyin: 'yīnwèi', reason: 'Use 虽然 for "although", not 因为' }
        ])
      });
    }
  },
  {
    id: 'additive_budan_erqie',
    hskLevel: 3,
    title: 'Not Only ... But Also (S + 不但 ... 而且 ...)',
    ruleSummary:
      'Add a second, stronger quality with Subject + 不但 (búdàn) + Adj1 + 而且 (érqiě) + Adj2.',
    requiredParticles: ['不但', '而且'],
    slots: [
      {
        role: 'subject',
        filter: (w) =>
          (getWordPos(w) === 'pron' &&
            hasFeature(w, 'human') &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative'])) ||
          (getWordPos(w) === 'noun' &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location']))
      },
      {
        role: 'adj1',
        filter: (w, chosen) => Boolean(chosen?.subject) && doesAdjMatchSubject(w, chosen.subject)
      },
      {
        role: 'adj2',
        filter: (w, chosen) =>
          Boolean(chosen?.subject && chosen?.adj1) &&
          w.hanzi !== chosen.adj1.hanzi &&
          doesAdjMatchSubject(w, chosen.subject)
      }
    ],
    realize(slots, poolMap) {
      const budan = getParticleEntry('不但', poolMap);
      const erqie = getParticleEntry('而且', poolMap);
      if (!budan || !erqie || !slots?.subject || !slots?.adj1 || !slots?.adj2) {
        return null;
      }
      const subj = realizeSubjectEnglish(slots.subject);
      const beEn = getBeForm(subj.subjectType, 'present');
      const adj1En = realizeAdjEnglish(slots.adj1);
      const adj2En = realizeAdjEnglish(slots.adj2);

      const part1Tokens = [
        tokenFromWord(slots.subject, 'subject', 0),
        tokenFromWord(budan, 'conj', 1),
        tokenFromWord(slots.adj1, 'adj1', 2)
      ];
      const part2Tokens = [
        tokenFromWord(erqie, 'conj', 3),
        tokenFromWord(slots.adj2, 'adj2', 4)
      ];
      const commaVariant = `${part1Tokens.map((t) => t.hanzi).join('')}，${part2Tokens
        .map((t) => t.hanzi)
        .join('')}。`;

      return buildResult({
        schema: this,
        tokens: [...part1Tokens, ...part2Tokens],
        punctuation: '。',
        english: capitalizeSentence(
          `${subj.text} ${beEn} not only ${adj1En}, but also ${adj2En}`,
          '.'
        ),
        acceptedVariants: [commaVariant],
        distractorTokens: buildDistractors([
          { hanzi: '但是', pinyin: 'dànshì', reason: '不但 pairs with 而且 to add qualities, not 但是' },
          { hanzi: '虽然', pinyin: 'suīrán', reason: 'Use 不但 ... 而且 for "not only ... but also"' }
        ])
      });
    }
  },
  {
    id: 'gradual_yuelaiyue',
    hskLevel: 2,
    title: 'Gradual Change (S + 越来越 + Adj)',
    ruleSummary:
      'Express steady change over time using Subject + 越来越 (yuè lái yuè, more and more) + Adjective. Do NOT add 很 before the adjective.',
    requiredParticles: ['越来越'],
    slots: [
      {
        role: 'subject',
        filter: (w) =>
          (getWordPos(w) === 'pron' &&
            hasFeature(w, 'human') &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative'])) ||
          ((getWordPos(w) === 'noun' || getWordPos(w) === 'place') &&
            !hasAnyFeature(w, ['interrogative', 'demonstrative', 'location']))
      },
      {
        role: 'adj',
        filter: (w, chosen) => Boolean(chosen?.subject) && doesAdjMatchSubject(w, chosen.subject)
      }
    ],
    realize(slots, poolMap) {
      const yuelaiyue = getParticleEntry('越来越', poolMap);
      if (!yuelaiyue || !slots?.subject || !slots?.adj) return null;
      const subj = realizeSubjectEnglish(slots.subject);
      const beEn = getBeForm(subj.subjectType, 'present');
      const adjEn = realizeAdjEnglish(slots.adj);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.subject, 'subject', 0),
          tokenFromWord(yuelaiyue, 'adv', 1),
          tokenFromWord(slots.adj, 'adj', 2)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${subj.text} ${beEn} getting more and more ${adjEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '很', pinyin: 'hěn', reason: 'Never insert 很 between 越来越 and the adjective' },
          { hanzi: '比', pinyin: 'bǐ', reason: '越来越 shows gradual change over time, not A vs B comparison' }
        ])
      });
    }
  },
  {
    id: 'ba_disposal',
    hskLevel: 3,
    title: 'Disposal Structure with 把 (S + 把 + Obj + V + 了/完)',
    ruleSummary:
      'Highlight how an action handles a specific object: Subject + 把 (bǎ) + Object + Action Verb + 了 (or 完). Never use static verbs like 是, 有, or 喜欢.',
    requiredParticles: ['把', '了'],
    slots: [
      STANDARD_SUBJECT_SLOT,
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) &&
          [
            '吃',
            '喝',
            '看',
            '读',
            '写',
            '买',
            '做',
            '拿',
            '放',
            '洗',
            '关',
            '开',
            '用',
            '卖',
            '借',
            '还',
            '带',
            '送',
            '学',
            '学习'
          ].includes(w.hanzi)
      },
      OBJECT_FOR_VERB_SLOT
    ],
    realize(slots, poolMap) {
      const ba = getParticleEntry('把', poolMap);
      const le = getParticleEntry('了', poolMap);
      if (!ba || !le || !slots?.subject || !slots?.verb || !slots?.object) return null;

      const wan = getParticleEntry('完', poolMap);
      const canUseWan =
        Boolean(wan) &&
        ['吃', '喝', '看', '读', '写', '做', '洗', '用', '学', '学习'].includes(slots.verb.hanzi);

      const subj = realizeSubjectEnglish(slots.subject);
      const objEn = realizeEnglishNoun(slots.object.enGloss || slots.object.meaning || slots.object.hanzi, {
        count: 1,
        definite: true
      });
      const pastEn = realizeEnglishVerb(slots.verb.enGloss || slots.verb.meaning || slots.verb.hanzi, {
        subjectType: subj.subjectType,
        tense: 'past'
      });
      const gerundEn = realizeVerbGerundEnglish(slots.verb);

      const tokens = canUseWan
        ? [
            tokenFromWord(slots.subject, 'subject', 0),
            tokenFromWord(ba, 'prep', 1),
            tokenFromWord(slots.object, 'object', 2),
            tokenFromWord(slots.verb, 'verb', 3),
            tokenFromWord(wan, 'complement', 4),
            tokenFromWord(le, 'aspect', 5)
          ]
        : [
            tokenFromWord(slots.subject, 'subject', 0),
            tokenFromWord(ba, 'prep', 1),
            tokenFromWord(slots.object, 'object', 2),
            tokenFromWord(slots.verb, 'verb', 3),
            tokenFromWord(le, 'aspect', 4)
          ];

      const simpleLeVariant = `${slots.subject.hanzi}把${slots.object.hanzi}${slots.verb.hanzi}了。`;
      const englishSentence = canUseWan
        ? `${subj.text} finished ${gerundEn} ${objEn}`
        : `${subj.text} ${pastEn} ${objEn}`;

      return buildResult({
        schema: this,
        tokens,
        punctuation: '。',
        english: capitalizeSentence(englishSentence, '.'),
        acceptedVariants: [simpleLeVariant],
        distractorTokens: buildDistractors([
          { hanzi: '被', pinyin: 'bèi', reason: '把 puts the doer first; 被 introduces passive voice' },
          { hanzi: '不', pinyin: 'bù', reason: 'Completed 把 actions require 了 or a result complement like 完' }
        ])
      });
    }
  },
  {
    id: 'bei_passive',
    hskLevel: 3,
    title: 'Passive Voice with 被 (Obj + 被 + Agent + V + 了)',
    ruleSummary:
      'Form passive sentences with Affected Object + 被 (bèi, by) + Agent + Action Verb + 了.',
    requiredParticles: ['被', '了'],
    slots: [
      {
        role: 'agent',
        filter: STANDARD_SUBJECT_SLOT.filter
      },
      {
        role: 'verb',
        filter: (w) =>
          TRANSITIVE_VERB_SLOT.filter(w) &&
          ['吃', '喝', '看', '读', '写', '买', '做', '拿', '用', '卖', '借', '带', '送', '洗'].includes(
            w.hanzi
          )
      },
      {
        role: 'object',
        filter: (w, chosen) =>
          Boolean(chosen?.verb && chosen?.agent) &&
          w.hanzi !== chosen.agent.hanzi &&
          !hasFeature(w, 'human') &&
          doesVerbMatchObject(chosen.verb, w)
      }
    ],
    realize(slots, poolMap) {
      const bei = getParticleEntry('被', poolMap);
      const le = getParticleEntry('了', poolMap);
      if (!bei || !le || !slots?.object || !slots?.agent || !slots?.verb) return null;

      const objEn = realizeEnglishNoun(slots.object.enGloss || slots.object.meaning || slots.object.hanzi, {
        count: 1,
        definite: true
      });
      const agentEn = realizeAgentObjectEnglish(slots.agent);
      const ppEn = realizeVerbParticipleEnglish(slots.verb);

      return buildResult({
        schema: this,
        tokens: [
          tokenFromWord(slots.object, 'object', 0),
          tokenFromWord(bei, 'prep', 1),
          tokenFromWord(slots.agent, 'agent', 2),
          tokenFromWord(slots.verb, 'verb', 3),
          tokenFromWord(le, 'aspect', 4)
        ],
        punctuation: '。',
        english: capitalizeSentence(`${objEn} was ${ppEn} by ${agentEn}`, '.'),
        distractorTokens: buildDistractors([
          { hanzi: '把', pinyin: 'bǎ', reason: '被 marks passive voice (Obj + 被 + Agent); 把 puts the agent first' },
          { hanzi: '比', pinyin: 'bǐ', reason: '被 marks passive voice, not comparison' }
        ])
      });
    }
  }
];
