// ============================================================================
// MANDARIN PHONETICS & IPA STUDIO DATA (21 INITIALS, 36 FINALS, ALLOPHONES & SANDBOX)
// Wired to PINYIN_TONE_HANZI_MAP & resolveSyllableToneHanzi for authentic 4-tone Hanzi TTS
// ============================================================================

import {
  PINYIN_TONE_HANZI_MAP,
  MANDARIN_PHONOTACTIC_TABLE,
  isValidMandarinSyllable,
  registerCourseWordsForPhonetics,
  findHanziInCourseWords,
  applyToneMarkToPinyin,
  resolveSyllableToneHanzi,
  QUIZ_ATTESTED_4_TONE_SYLLABLES
} from './pinyinToneHanziMap.ts';
import { UNIT_1_WORDS } from './curriculumData.js';

// Seed course words fallback with built-in curriculum
registerCourseWordsForPhonetics(UNIT_1_WORDS);

export {
  PINYIN_TONE_HANZI_MAP,
  MANDARIN_PHONOTACTIC_TABLE,
  isValidMandarinSyllable,
  registerCourseWordsForPhonetics,
  findHanziInCourseWords,
  applyToneMarkToPinyin,
  resolveSyllableToneHanzi,
  QUIZ_ATTESTED_4_TONE_SYLLABLES
};

export const MANDARIN_INITIAL_GROUPS = [
  {
    id: 'bilabial',
    groupTitle: 'Bilabial (双唇音)',
    placeDescription: 'Both lips pressed together, then released.',
    initials: [
      {
        pinyin: 'b',
        ipa: '[p]',
        manner: 'Unaspirated Voiceless Stop',
        aspiration: 'Unaspirated (0 VOT)',
        callOut: 'Like "p" in English "spin" (no puff of air).',
        repInitial: 'b',
        repFinal: 'a',
        repPinyin: 'bā',
        repHanzi: '八',
        repIpa: '[pä˥]',
        repMeaning: 'eight'
      },
      {
        pinyin: 'p',
        ipa: '[pʰ]',
        manner: 'Aspirated Voiceless Stop',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "p" in English "pin" with a strong puff of air [ʰ].',
        repInitial: 'p',
        repFinal: 'o',
        repPinyin: 'pō',
        repHanzi: '坡',
        repIpa: '[pʰu̯ɔ˥]',
        repMeaning: 'slope / grandmother / impossible / break'
      },
      {
        pinyin: 'm',
        ipa: '[m]',
        manner: 'Bilabial Nasal',
        aspiration: 'Voiced Nasal',
        callOut: 'Same as English "m" in "mother".',
        repInitial: 'm',
        repFinal: 'a',
        repPinyin: 'mā',
        repHanzi: '妈',
        repIpa: '[mä˥]',
        repMeaning: 'mother'
      }
    ]
  },
  {
    id: 'labiodental',
    groupTitle: 'Labiodental (唇齿音)',
    placeDescription: 'Upper teeth lightly touching the lower lip.',
    initials: [
      {
        pinyin: 'f',
        ipa: '[f]',
        manner: 'Voiceless Fricative',
        aspiration: 'Fricative',
        callOut: 'Same as English "f" in "fast". Combines with u, a, o (never e).',
        repInitial: 'f',
        repFinal: 'a',
        repPinyin: 'fā',
        repHanzi: '发',
        repIpa: '[fä˥]',
        repMeaning: 'to send / emit'
      }
    ]
  },
  {
    id: 'alveolar',
    groupTitle: 'Alveolar & Dental Sibilant (舌尖音)',
    placeDescription: 'Tongue tip against the upper alveolar ridge or back of upper teeth.',
    initials: [
      {
        pinyin: 'd',
        ipa: '[t]',
        manner: 'Unaspirated Alveolar Stop',
        aspiration: 'Unaspirated (0 VOT)',
        callOut: 'Like "t" in English "stop" (unaspirated, crisp release).',
        repInitial: 'd',
        repFinal: 'a',
        repPinyin: 'dā',
        repHanzi: '搭',
        repIpa: '[tä˥]',
        repMeaning: 'build / answer / hit / big'
      },
      {
        pinyin: 't',
        ipa: '[tʰ]',
        manner: 'Aspirated Alveolar Stop',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "t" in English "top" with a strong puff of air [ʰ].',
        repInitial: 't',
        repFinal: 'i',
        repPinyin: 'tī',
        repHanzi: '踢',
        repIpa: '[tʰi˥]',
        repMeaning: 'kick / topic / body / replace'
      },
      {
        pinyin: 'n',
        ipa: '[n]',
        manner: 'Alveolar Nasal',
        aspiration: 'Voiced Nasal',
        callOut: 'Like "n" in "nine". Can take both u (nù) and ü (nǚ).',
        repInitial: 'n',
        repFinal: 'i',
        repPinyin: 'nī',
        repHanzi: '妮',
        repIpa: '[ni˥]',
        repMeaning: 'girl / mud / you / contrary'
      },
      {
        pinyin: 'l',
        ipa: '[l]',
        manner: 'Alveolar Lateral Approximant',
        aspiration: 'Voiced Lateral',
        callOut: 'Light "l" as in "leaf" with tongue tip on ridge. Can take u and ü.',
        repInitial: 'l',
        repFinal: 'a',
        repPinyin: 'lā',
        repHanzi: '拉',
        repIpa: '[lä˥]',
        repMeaning: 'to pull'
      },
      {
        pinyin: 'z',
        ipa: '[ts]',
        manner: 'Unaspirated Dental Affricate',
        aspiration: 'Unaspirated',
        callOut: 'Like "ds" in "kids" or "ts" in "cats" without aspiration.',
        repInitial: 'z',
        repFinal: 'uo',
        repPinyin: 'zuō',
        repHanzi: '作',
        repIpa: '[tsu̯ɔ˥]',
        repMeaning: 'do / yesterday / left / sit'
      },
      {
        pinyin: 'c',
        ipa: '[tsʰ]',
        manner: 'Aspirated Dental Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "ts" in "tsunami" with a strong burst of air [ʰ].',
        repInitial: 'c',
        repFinal: 'i',
        repPinyin: 'cī',
        repHanzi: '疵',
        repIpa: '[tsʰɹ̩˥]',
        repMeaning: 'flaw / word / this / sequence'
      },
      {
        pinyin: 's',
        ipa: '[s]',
        manner: 'Voiceless Dental Fricative',
        aspiration: 'Fricative',
        callOut: 'Crisp "s" as in "sun" with tongue tip near upper teeth.',
        repInitial: 's',
        repFinal: 'ui',
        repPinyin: 'suī',
        repHanzi: '虽',
        repIpa: '[su̯ei̯˥]',
        repMeaning: 'although / follow / marrow / year'
      }
    ]
  },
  {
    id: 'retroflex',
    groupTitle: 'Retroflex (翘舌音 / 舌尖后音)',
    placeDescription: 'Tongue tip curled back toward the hard palate (post-alveolar).',
    initials: [
      {
        pinyin: 'zh',
        ipa: '[tʂ]',
        manner: 'Unaspirated Retroflex Affricate',
        aspiration: 'Unaspirated',
        callOut: 'Curl tongue tip slightly back; unaspirated like "j" in "jerk" with no voice.',
        repInitial: 'zh',
        repFinal: 'i',
        repPinyin: 'zhī',
        repHanzi: '知',
        repIpa: '[tʂʐ̩˥]',
        repMeaning: 'to know / straight / paper / ambition'
      },
      {
        pinyin: 'ch',
        ipa: '[tʂʰ]',
        manner: 'Aspirated Retroflex Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Tongue tip curled back with a strong puff of air [ʰ], like "ch" in "church".',
        repInitial: 'ch',
        repFinal: 'i',
        repPinyin: 'chī',
        repHanzi: '吃',
        repIpa: '[tʂʰʐ̩˥]',
        repMeaning: 'to eat / pool / ruler / wing'
      },
      {
        pinyin: 'sh',
        ipa: '[ʂ]',
        manner: 'Voiceless Retroflex Fricative',
        aspiration: 'Fricative',
        callOut: 'Tongue curled back, producing a deeper "sh" sound than English "ship".',
        repInitial: 'sh',
        repFinal: 'i',
        repPinyin: 'shī',
        repHanzi: '诗',
        repIpa: '[ʂʐ̩˥]',
        repMeaning: 'poem / ten / history / be'
      },
      {
        pinyin: 'r',
        ipa: '[ʐ~ɻ]',
        manner: 'Voiced Retroflex Approximant / Fricative',
        aspiration: 'Voiced',
        callOut: 'Tongue curled back like "r" in American "run" with slight buzz [ʐ]. Lips unrounded!',
        repInitial: 'r',
        repFinal: 'ang',
        repPinyin: 'rāng',
        repHanzi: '嚷',
        repIpa: '[ʐɑŋ˥]',
        repMeaning: 'shout / pulp / soil / let'
      }
    ]
  },
  {
    id: 'alveolopalatal',
    groupTitle: 'Alveolopalatal (舌面音)',
    placeDescription: 'Tongue blade raised flat against the hard palate; tip tucked behind lower teeth. ONLY combines with i and ü!',
    initials: [
      {
        pinyin: 'j',
        ipa: '[tɕ]',
        manner: 'Unaspirated Palatal Affricate',
        aspiration: 'Unaspirated',
        callOut: 'Tongue tip down behind lower teeth; middle of tongue high like "jee" (unaspirated).',
        repInitial: 'j',
        repFinal: 'i',
        repPinyin: 'jī',
        repHanzi: '机',
        repIpa: '[tɕi˥]',
        repMeaning: 'machine / urgent / how many / record'
      },
      {
        pinyin: 'q',
        ipa: '[tɕʰ]',
        manner: 'Aspirated Palatal Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Same flat palatal tongue position as "j", but with a sharp puff of air [ʰ] ("chee").',
        repInitial: 'q',
        repFinal: 'i',
        repPinyin: 'qī',
        repHanzi: '七',
        repIpa: '[tɕʰi˥]',
        repMeaning: 'seven / neat / rise / air'
      },
      {
        pinyin: 'x',
        ipa: '[ɕ]',
        manner: 'Voiceless Palatal Fricative',
        aspiration: 'Fricative',
        callOut: 'Hissing palatal "sh" made with tongue tip tucked behind lower teeth ("shee").',
        repInitial: 'x',
        repFinal: 'i',
        repPinyin: 'xī',
        repHanzi: '西',
        repIpa: '[ɕi˥]',
        repMeaning: 'west / practice / wash / thin'
      }
    ]
  },
  {
    id: 'velar',
    groupTitle: 'Velar (舌根音)',
    placeDescription: 'Back of the tongue raised against the soft palate (velum).',
    initials: [
      {
        pinyin: 'g',
        ipa: '[k]',
        manner: 'Unaspirated Velar Stop',
        aspiration: 'Unaspirated (0 VOT)',
        callOut: 'Like "k" in English "sky" (unaspirated, voiceless).',
        repInitial: 'g',
        repFinal: 'e',
        repPinyin: 'gē',
        repHanzi: '哥',
        repIpa: '[kɤ˥]',
        repMeaning: 'older brother / grid / Ge / classifier'
      },
      {
        pinyin: 'k',
        ipa: '[kʰ]',
        manner: 'Aspirated Velar Stop',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "k" in English "kite" with a strong puff of air [ʰ].',
        repInitial: 'k',
        repFinal: 'e',
        repPinyin: 'kē',
        repHanzi: '科',
        repIpa: '[kʰɤ˥]',
        repMeaning: 'science / cough / can / lesson'
      },
      {
        pinyin: 'h',
        ipa: '[x]',
        manner: 'Voiceless Velar Fricative',
        aspiration: 'Velar Fricative',
        callOut: 'Slight rasp at the back of the throat [x] (stronger than English "h", softer than Bach).',
        repInitial: 'h',
        repFinal: 'uo',
        repPinyin: 'huō',
        repHanzi: '豁',
        repIpa: '[xu̯ɔ˥]',
        repMeaning: 'open / live / fire / or'
      }
    ]
  }
];

export const MANDARIN_ALLOPHONE_SPOTLIGHTS = [
  {
    id: 'allophone_e',
    letter: 'e',
    title: 'The 4 Contextual Sounds of Pinyin "e"',
    summary: 'Pinyin "e" changes its vowel height and backness dramatically depending on neighboring sounds:',
    variants: [
      {
        context: 'Open Syllable (e)',
        ipa: '[ɤ]',
        desc: 'Close-mid back unrounded vowel (smile while saying a back "uh/oh").',
        examples: [
          { pinyin: 'gē', hanzi: '哥', ipa: '[kɤ˥]', meaning: 'brother' },
          { pinyin: 'hē', hanzi: '喝', ipa: '[xɤ˥]', meaning: 'drink' },
          { pinyin: 'zhè', hanzi: '这', ipa: '[tʂɤ˥˩]', meaning: 'this' }
        ]
      },
      {
        context: 'Before Nasal (-en / -eng)',
        ipa: '[ə]',
        desc: 'Relaxed mid-central schwa, like "e" in English "taken".',
        examples: [
          { pinyin: 'gēn', hanzi: '跟', ipa: '[kən˥]', meaning: 'with' },
          { pinyin: 'shēng', hanzi: '生', ipa: '[ʂəŋ˥]', meaning: 'born' },
          { pinyin: 'rén', hanzi: '人', ipa: '[ʐən˧˥]', meaning: 'person' }
        ]
      },
      {
        context: 'After Palatal Medial (-ie / -üe)',
        ipa: '[ɛ]',
        desc: 'Open-mid front vowel, like "e" in English "yes" or "bet".',
        examples: [
          { pinyin: 'jiě', hanzi: '姐', ipa: '[tɕi̯ɛ˨˩˦]', meaning: 'older sister' },
          { pinyin: 'xué', hanzi: '学', ipa: '[ɕy̯ɛ˧˥]', meaning: 'study' },
          { pinyin: 'yuè', hanzi: '月', ipa: '[ɥɛ˥˩]', meaning: 'moon / month' }
        ]
      },
      {
        context: 'Neutral Tone Suffix (le / de / ne)',
        ipa: '[ə]',
        desc: 'Short, unstressed central schwa.',
        examples: [
          { pinyin: 'le', hanzi: '了', ipa: '[lə]', meaning: 'aspect particle' },
          { pinyin: 'de', hanzi: '的', ipa: '[tə]', meaning: 'possessive' }
        ]
      }
    ]
  },
  {
    id: 'allophone_a',
    letter: 'a',
    title: 'The 4 Contextual Allophones of Pinyin "a"',
    summary: 'Pinyin "a" shifts forward or backward depending on the coda (-n vs. -ng) and medial (i-/ü-):',
    variants: [
      {
        context: 'Open Syllable (a / ia / ua)',
        ipa: '[ä]',
        desc: 'Open central unrounded vowel ("ah").',
        examples: [
          { pinyin: 'mā', hanzi: '妈', ipa: '[mä˥]', meaning: 'mother' },
          { pinyin: 'jiā', hanzi: '家', ipa: '[tɕi̯ä˥]', meaning: 'home' }
        ]
      },
      {
        context: 'Front Coda (-an / -ai / -uan)',
        ipa: '[a]',
        desc: 'Open front unrounded vowel pulled toward the front teeth.',
        examples: [
          { pinyin: 'kàn', hanzi: '看', ipa: '[kʰan˥˩]', meaning: 'look' },
          { pinyin: 'bái', hanzi: '白', ipa: '[pai̯˧˥]', meaning: 'white' }
        ]
      },
      {
        context: 'Palatal Raised (-ian / -üan)',
        ipa: '[ɛ]',
        desc: 'Sandwiched between [i]/[y] and [-n], "a" raises to [ɛ] (sounds like "yen").',
        examples: [
          { pinyin: 'tiān', hanzi: '天', ipa: '[tʰi̯ɛn˥]', meaning: 'sky / day' },
          { pinyin: 'jiàn', hanzi: '见', ipa: '[tɕi̯ɛn˥˩]', meaning: 'see' },
          { pinyin: 'quán', hanzi: '全', ipa: '[tɕʰy̯ɛn˧˥]', meaning: 'whole' }
        ]
      },
      {
        context: 'Back Coda (-ang / -ao / -uang)',
        ipa: '[ɑ]',
        desc: 'Deep open back vowel like "a" in "father".',
        examples: [
          { pinyin: 'bāng', hanzi: '帮', ipa: '[pɑŋ˥]', meaning: 'help' },
          { pinyin: 'hǎo', hanzi: '好', ipa: '[xɑu̯˨˩˦]', meaning: 'good' }
        ]
      }
    ]
  },
  {
    id: 'allophone_i',
    letter: 'i',
    title: 'High Front [i] vs. Apical Buzzing Vowels [z̩] & [ʐ̩]',
    summary: 'Pinyin "i" represents three completely different sounds depending on the preceding consonant:',
    variants: [
      {
        context: 'Standard Palatal / Labial / Alveolar (b, p, m, d, t, n, l, j, q, x)',
        ipa: '[i]',
        desc: 'True high front vowel like "ee" in "see".',
        examples: [
          { pinyin: 'bǐ', hanzi: '比', ipa: '[pi˨˩˦]', meaning: 'compare' },
          { pinyin: 'nǐ', hanzi: '你', ipa: '[ni˨˩˦]', meaning: 'you' },
          { pinyin: 'qī', hanzi: '七', ipa: '[tɕʰi˥]', meaning: 'seven' }
        ]
      },
      {
        context: 'After Dental Sibilants (z, c, s)',
        ipa: '[z̩] / [ɹ̩]',
        desc: 'Dental apical vowel — hold the tongue position of z/c/s and buzz the vocal cords (NEVER say "zee").',
        examples: [
          { pinyin: 'zì', hanzi: '字', ipa: '[tsɹ̩˥˩]', meaning: 'character' },
          { pinyin: 'cì', hanzi: '次', ipa: '[tsʰɹ̩˥˩]', meaning: 'time' },
          { pinyin: 'sì', hanzi: '四', ipa: '[sɹ̩˥˩]', meaning: 'four' }
        ]
      },
      {
        context: 'After Retroflexes (zh, ch, sh, r)',
        ipa: '[ʐ̩] / [ɻ̩]',
        desc: 'Retroflex apical vowel — keep the tongue curled back from zh/ch/sh/r and voice a syllabic buzz.',
        examples: [
          { pinyin: 'zhī', hanzi: '知', ipa: '[tʂʐ̩˥]', meaning: 'know' },
          { pinyin: 'chī', hanzi: '吃', ipa: '[tʂʰʐ̩˥]', meaning: 'eat' },
          { pinyin: 'shì', hanzi: '是', ipa: '[ʂʐ̩˥˩]', meaning: 'is / be' },
          { pinyin: 'rì', hanzi: '日', ipa: '[ʐ̩˥˩]', meaning: 'day / sun' }
        ]
      }
    ]
  },
  {
    id: 'allophone_u_v',
    letter: 'u / ü',
    title: 'Back Rounded [u] vs. Front Rounded [y] (Spelling Rule)',
    summary: 'How to pronounce ü [y] and recognize when Pinyin hides the umlaut dots:',
    variants: [
      {
        context: 'Back Rounded Vowel (u)',
        ipa: '[u]',
        desc: 'Back of tongue raised + rounded lips ("oo" in "food").',
        examples: [
          { pinyin: 'shū', hanzi: '书', ipa: '[ʂu˥]', meaning: 'book' },
          { pinyin: 'lù', hanzi: '路', ipa: '[lu˥˩]', meaning: 'road' }
        ]
      },
      {
        context: 'Front Rounded Vowel (ü after n, l)',
        ipa: '[y]',
        desc: 'Say [i] ("ee") with your tongue high in front, then tightly round your lips. Dots kept in nǚ and lǜ.',
        examples: [
          { pinyin: 'nǚ', hanzi: '女', ipa: '[ny˨˩˦]', meaning: 'female' },
          { pinyin: 'lǜ', hanzi: '绿', ipa: '[ly˥˩]', meaning: 'green' }
        ]
      },
      {
        context: 'Hidden Umlaut after j, q, x, y (ju, qu, xu, yu)',
        ipa: '[y]',
        desc: 'Because j, q, x, y can NEVER take [u], Pinyin drops the two dots on ü — so ju, qu, xu, yu are ALWAYS pronounced [y]!',
        examples: [
          { pinyin: 'qù', hanzi: '去', ipa: '[tɕʰy˥˩]', meaning: 'to go' },
          { pinyin: 'xué', hanzi: '学', ipa: '[ɕy̯ɛ˧˥]', meaning: 'to study' },
          { pinyin: 'yú', hanzi: '鱼', ipa: '[y˧˥]', meaning: 'fish' }
        ]
      }
    ]
  }
];

export const MANDARIN_FINAL_GROUPS = [
  {
    id: 'simple',
    groupTitle: 'Simple Finals (单韵母 — Monophthongs)',
    description: 'Single pure vowel nuclei (plus the retroflex -er syllable).',
    finals: [
      {
        pinyin: 'a',
        ipa: '[ä]',
        note: 'Open central vowel. Wide mouth opening.',
        repInitial: 'm',
        repFinal: 'a',
        repPinyin: 'mā',
        repHanzi: '妈',
        repIpa: '[mä˥]',
        repMeaning: 'mother'
      },
      {
        pinyin: 'o',
        ipa: '[u̯ɔ]',
        note: 'After bilabials (b, p, m, f), has an automatic labial glide [u̯ɔ] (bō, pō, mō, fō).',
        repInitial: 'b',
        repFinal: 'o',
        repPinyin: 'bō',
        repHanzi: '波',
        repIpa: '[pu̯ɔ˥]',
        repMeaning: 'wave'
      },
      {
        pinyin: 'e',
        ipa: '[ɤ] / [z̩] / [ʐ̩]',
        note: 'Unrounded mid-back [ɤ] in open syllables (gē, hē).',
        repInitial: 'g',
        repFinal: 'e',
        repPinyin: 'gē',
        repHanzi: '哥',
        repIpa: '[kɤ˥]',
        repMeaning: 'older brother'
      },
      {
        pinyin: 'i',
        ipa: '[i] / [z̩] / [ʐ̩]',
        note: 'High front [i] after b/p/m/d/t/n/l/j/q/x; apical buzz after z/c/s & zh/ch/sh/r.',
        repInitial: 'b',
        repFinal: 'i',
        repPinyin: 'bī',
        repHanzi: '逼',
        repIpa: '[pi˥]',
        repMeaning: 'force / nose / compare / must'
      },
      {
        pinyin: 'u',
        ipa: '[u]',
        note: 'High back rounded vowel ("oo"). Standalone written as wu.',
        repInitial: 'd',
        repFinal: 'u',
        repPinyin: 'dū',
        repHanzi: '都',
        repIpa: '[tu˥]',
        repMeaning: 'capital / read / block / degree'
      },
      {
        pinyin: 'ü',
        ipa: '[y]',
        note: 'High front rounded vowel ([i] tongue + [u] lips). Written "u" after j, q, x, y.',
        repInitial: '∅',
        repFinal: 'ü',
        repPinyin: 'yū',
        repHanzi: '迂',
        repIpa: '[y˥]',
        repMeaning: 'winding / fish / rain / jade'
      },
      {
        pinyin: 'er',
        ipa: '[ɑɻ]',
        note: 'Standalone retroflex vowel syllable (儿 ér, 耳 ěr, 二 èr).',
        repInitial: '∅',
        repFinal: 'er',
        repPinyin: 'èr',
        repHanzi: '二',
        repIpa: '[ɑɻ˥˩]',
        repMeaning: 'son / ear / two'
      }
    ]
  },
  {
    id: 'compound',
    groupTitle: 'Compound Finals (复韵母 — Diphthongs)',
    description: 'Smooth vowel glides from a primary nucleus toward a high target (-i or -u/-o).',
    finals: [
      {
        pinyin: 'ai',
        ipa: '[ai̯]',
        note: 'Front [a] gliding toward [i], like "eye".',
        repInitial: 'b',
        repFinal: 'ai',
        repPinyin: 'bāi',
        repHanzi: '掰',
        repIpa: '[pai̯˥]',
        repMeaning: 'break / white / hundred / bow'
      },
      {
        pinyin: 'ei',
        ipa: '[ei̯]',
        note: 'Close-mid [e] gliding to [i], like "ay" in "day".',
        repInitial: 'f',
        repFinal: 'ei',
        repPinyin: 'fēi',
        repHanzi: '飞',
        repIpa: '[fei̯˥]',
        repMeaning: 'fly / fat / bandit / fee'
      },
      {
        pinyin: 'ao',
        ipa: '[ɑu̯]',
        note: 'Back [ɑ] gliding to rounded [u̯], like "ow" in "now".',
        repInitial: 'b',
        repFinal: 'ao',
        repPinyin: 'bāo',
        repHanzi: '包',
        repIpa: '[pɑu̯˥]',
        repMeaning: 'bag / hail / full / report'
      },
      {
        pinyin: 'ou',
        ipa: '[ou̯]',
        note: 'Mid-back [o] gliding to [u̯], like "oh" in "go".',
        repInitial: 'zh',
        repFinal: 'ou',
        repPinyin: 'zhōu',
        repHanzi: '周',
        repIpa: '[tʂou̯˥]',
        repMeaning: 'week / axle / elbow / day'
      }
    ]
  },
  {
    id: 'front_nasal',
    groupTitle: 'Front Nasal Finals (-n 前鼻韵母)',
    description: 'Ends with alveolar nasal [-n] (tongue tip touches behind upper teeth).',
    finals: [
      {
        pinyin: 'an',
        ipa: '[an]',
        note: 'Front [a] + alveolar [-n], as in fān / fàn (翻 / 饭).',
        repInitial: 'f',
        repFinal: 'an',
        repPinyin: 'fān',
        repHanzi: '翻',
        repIpa: '[fan˥]',
        repMeaning: 'turn /烦 /反 / meal'
      },
      {
        pinyin: 'en',
        ipa: '[ən]',
        note: 'Central schwa [ə] + alveolar [-n], like "taken".',
        repInitial: 'f',
        repFinal: 'en',
        repPinyin: 'fēn',
        repHanzi: '分',
        repIpa: '[fən˥]',
        repMeaning: 'divide / tomb / powder / share'
      },
      {
        pinyin: 'in',
        ipa: '[in]',
        note: 'High front [i] + alveolar [-n], like "keen".',
        repInitial: 'p',
        repFinal: 'in',
        repPinyin: 'pīn',
        repHanzi: '拼',
        repIpa: '[pʰin˥]',
        repMeaning: 'spell / poor / item / hire'
      },
      {
        pinyin: 'ün',
        ipa: '[yn]',
        note: 'Front rounded [y] + [-n]. Written as "un" after j, q, x, y (jūn, qún, yún).',
        repInitial: '∅',
        repFinal: 'ün',
        repPinyin: 'yūn',
        repHanzi: '晕',
        repIpa: '[yn˥]',
        repMeaning: 'dizzy / cloud / allow / luck'
      }
    ]
  },
  {
    id: 'back_nasal',
    groupTitle: 'Back Nasal Finals (-ng 后鼻韵母)',
    description: 'Ends with velar nasal [-ŋ] (back of tongue raised, mouth stays slightly open).',
    finals: [
      {
        pinyin: 'ang',
        ipa: '[ɑŋ]',
        note: 'Deep back [ɑ] + velar [-ŋ]. More open and resonant than -an.',
        repInitial: 'f',
        repFinal: 'ang',
        repPinyin: 'fāng',
        repHanzi: '方',
        repIpa: '[fɑŋ˥]',
        repMeaning: 'square / room / visit / put'
      },
      {
        pinyin: 'eng',
        ipa: '[əŋ]',
        note: 'Central schwa [ə] + velar [-ŋ]. After b, p, m, f often labialized.',
        repInitial: 'f',
        repFinal: 'eng',
        repPinyin: 'fēng',
        repHanzi: '风',
        repIpa: '[fəŋ˥]',
        repMeaning: 'wind / meet / satire / offer'
      },
      {
        pinyin: 'ing',
        ipa: '[iŋ]',
        note: 'High front [i] + velar [-ŋ] (sometimes with a tiny schwa transition [iəŋ]).',
        repInitial: 'q',
        repFinal: 'ing',
        repPinyin: 'qīng',
        repHanzi: '轻',
        repIpa: '[tɕʰiŋ˥]',
        repMeaning: 'light / feeling / please / celebrate'
      },
      {
        pinyin: 'ong',
        ipa: '[ʊŋ]',
        note: 'Rounded back [ʊ] + velar [-ŋ] (dōng, tōng, zhōng, gōng).',
        repInitial: 't',
        repFinal: 'ong',
        repPinyin: 'tōng',
        repHanzi: '通',
        repIpa: '[tʰʊŋ˥]',
        repMeaning: 'through / same / unite / pain'
      }
    ]
  },
  {
    id: 'medials',
    groupTitle: 'Medial i- / u- / ü- Finals (介音韵母)',
    description: 'Starts with a high glide [i̯], [u̯], or [y̯] before the main vowel and coda.',
    finals: [
      {
        pinyin: 'ia',
        ipa: '[i̯ä]',
        note: 'Palatal glide [i̯] + open [ä] (jiā, xià; standalone written ya).',
        repInitial: 'j',
        repFinal: 'ia',
        repPinyin: 'jiā',
        repHanzi: '家',
        repIpa: '[tɕi̯ä˥]',
        repMeaning: 'home / clip / false / price'
      },
      {
        pinyin: 'ie',
        ipa: '[i̯ɛ]',
        note: 'Palatal glide [i̯] + front [ɛ] (jiě, xiè; standalone written ye).',
        repInitial: 'j',
        repFinal: 'ie',
        repPinyin: 'jiē',
        repHanzi: '接',
        repIpa: '[tɕi̯ɛ˥]',
        repMeaning: 'receive / festival / sister / borrow'
      },
      {
        pinyin: 'iao',
        ipa: '[i̯ɑu̯]',
        note: 'Palatal glide [i̯] + [ɑu̯] (xiǎo, jiào; standalone written yao).',
        repInitial: 'j',
        repFinal: 'iao',
        repPinyin: 'jiāo',
        repHanzi: '教',
        repIpa: '[tɕi̯ɑu̯˥]',
        repMeaning: 'teach / chew / foot / call'
      },
      {
        pinyin: 'iu (iou)',
        ipa: '[i̯ou̯]',
        note: 'Spelled "iu" after consonants, pronounced [i̯ou̯] (liù, jiǔ).',
        repInitial: 'l',
        repFinal: 'iu',
        repPinyin: 'liū',
        repHanzi: '溜',
        repIpa: '[li̯ou̯˥]',
        repMeaning: 'slide / flow / willow / six'
      },
      {
        pinyin: 'ian',
        ipa: '[i̯ɛn]',
        note: 'Vowel "a" raises to [ɛ] between [i̯] and [-n] (tiān, qián, jiàn, miàn).',
        repInitial: 'q',
        repFinal: 'ian',
        repPinyin: 'qiān',
        repHanzi: '千',
        repIpa: '[tɕʰi̯ɛn˥]',
        repMeaning: 'thousand / money / shallow / owe'
      },
      {
        pinyin: 'iang',
        ipa: '[i̯ɑŋ]',
        note: 'Palatal glide [i̯] + back [ɑŋ] (xiǎng, liǎng).',
        repInitial: 'x',
        repFinal: 'iang',
        repPinyin: 'xiāng',
        repHanzi: '香',
        repIpa: '[ɕi̯ɑŋ˥]',
        repMeaning: 'fragrant / detail / think / toward'
      },
      {
        pinyin: 'iong',
        ipa: '[i̯ʊŋ]',
        note: 'Palatal-labial glide + velar [-ŋ] (xióng, qióng; standalone yong).',
        repInitial: '∅',
        repFinal: 'iong',
        repPinyin: 'yōng',
        repHanzi: '拥',
        repIpa: '[i̯ʊŋ˥]',
        repMeaning: 'embrace / murmur / forever / use'
      },
      {
        pinyin: 'ua',
        ipa: '[u̯ä]',
        note: 'Labial glide [u̯] + [ä] (huā, guā; standalone wa).',
        repInitial: '∅',
        repFinal: 'ua',
        repPinyin: 'wā',
        repHanzi: '蛙',
        repIpa: '[u̯ä˥]',
        repMeaning: 'frog / doll / tile / sock'
      },
      {
        pinyin: 'uo',
        ipa: '[u̯ɔ]',
        note: 'Labial glide [u̯] + [ɔ] (guó, shuō, duō; standalone wo).',
        repInitial: 'g',
        repFinal: 'uo',
        repPinyin: 'guō',
        repHanzi: '锅',
        repIpa: '[ku̯ɔ˥]',
        repMeaning: 'pot / country / fruit / pass'
      },
      {
        pinyin: 'uai',
        ipa: '[u̯ai̯]',
        note: 'Labial glide [u̯] + [ai̯] (kuài, guāi; standalone wai).',
        repInitial: 'ch',
        repFinal: 'uai',
        repPinyin: 'chuāi',
        repHanzi: '搋',
        repIpa: '[tʂʰu̯ai̯˥]',
        repMeaning: 'knead / fat / tuck / kick'
      },
      {
        pinyin: 'ui (uei)',
        ipa: '[u̯ei̯]',
        note: 'Spelled "ui" after consonants, pronounced [u̯ei̯] (shuǐ, duì, huí).',
        repInitial: 'h',
        repFinal: 'ui',
        repPinyin: 'huī',
        repHanzi: '灰',
        repIpa: '[xu̯ei̯˥]',
        repMeaning: 'ash / return / destroy / meet'
      },
      {
        pinyin: 'uan',
        ipa: '[u̯an]',
        note: 'Labial glide [u̯] + front [an] (guān, huān; standalone wan).',
        repInitial: 'h',
        repFinal: 'uan',
        repPinyin: 'huān',
        repHanzi: '欢',
        repIpa: '[xu̯an˥]',
        repMeaning: 'joyous / return / slow / change'
      },
      {
        pinyin: 'un (uen)',
        ipa: '[u̯ən]',
        note: 'Spelled "un" after d/t/n/l/g/k/h/z/c/s/zh/ch/sh/r, pronounced [u̯ən] (wèn, chūn).',
        repInitial: '∅',
        repFinal: 'un',
        repPinyin: 'wēn',
        repHanzi: '温',
        repIpa: '[u̯ən˥]',
        repMeaning: 'warm / text / kiss / ask'
      },
      {
        pinyin: 'uang',
        ipa: '[u̯ɑŋ]',
        note: 'Labial glide [u̯] + back [ɑŋ] (chuáng, huáng; standalone wang).',
        repInitial: 'h',
        repFinal: 'uang',
        repPinyin: 'huāng',
        repHanzi: '荒',
        repIpa: '[xu̯ɑŋ˥]',
        repMeaning: 'barren / yellow / lie / shake'
      },
      {
        pinyin: 'üe',
        ipa: '[y̯ɛ]',
        note: 'Front rounded glide [y̯] + [ɛ]. Written "ue" after j, q, x, y (xué, yuè) and "üe" after n, l (lüè).',
        repInitial: 'x',
        repFinal: 'üe',
        repPinyin: 'xuē',
        repHanzi: '靴',
        repIpa: '[ɕy̯ɛ˥]',
        repMeaning: 'boots / study / snow / blood'
      },
      {
        pinyin: 'üan',
        ipa: '[y̯ɛn]',
        note: 'Front rounded glide [y̯] + raised [ɛn]. Written "uan" after j, q, x, y (yuǎn, quán, xuǎn).',
        repInitial: 'q',
        repFinal: 'üan',
        repPinyin: 'quān',
        repHanzi: '圈',
        repIpa: '[tɕʰy̯ɛn˥]',
        repMeaning: 'circle / whole / dog / advise'
      }
    ]
  }
];

export const SANDBOX_INITIALS = [
  { id: '∅', label: '∅ (Zero)', ipa: '' },
  { id: 'b', label: 'b', ipa: 'p' },
  { id: 'p', label: 'p', ipa: 'pʰ' },
  { id: 'm', label: 'm', ipa: 'm' },
  { id: 'f', label: 'f', ipa: 'f' },
  { id: 'd', label: 'd', ipa: 't' },
  { id: 't', label: 't', ipa: 'tʰ' },
  { id: 'n', label: 'n', ipa: 'n' },
  { id: 'l', label: 'l', ipa: 'l' },
  { id: 'g', label: 'g', ipa: 'k' },
  { id: 'k', label: 'k', ipa: 'kʰ' },
  { id: 'h', label: 'h', ipa: 'x' },
  { id: 'j', label: 'j', ipa: 'tɕ' },
  { id: 'q', label: 'q', ipa: 'tɕʰ' },
  { id: 'x', label: 'x', ipa: 'ɕ' },
  { id: 'zh', label: 'zh', ipa: 'tʂ' },
  { id: 'ch', label: 'ch', ipa: 'tʂʰ' },
  { id: 'sh', label: 'sh', ipa: 'ʂ' },
  { id: 'r', label: 'r', ipa: 'ʐ' },
  { id: 'z', label: 'z', ipa: 'ts' },
  { id: 'c', label: 'c', ipa: 'tsʰ' },
  { id: 's', label: 's', ipa: 's' }
];

export const SANDBOX_FINALS = [
  'a', 'o', 'e', 'i', 'u', 'ü', 'er',
  'ai', 'ei', 'ao', 'ou',
  'an', 'en', 'ang', 'eng', 'ong',
  'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong',
  'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang',
  'üe', 'üan', 'ün'
];

/**
 * Look up the exact Simplified Chinese character for a syllable and tone.
 * NEVER falls back to "ba" (八/拔/把/爸); returns "" if no attested Hanzi exists.
 */
export function getSampleHanziForTone(syllableBase, toneNumber = 1) {
  const res = resolveSyllableToneHanzi(syllableBase, '', toneNumber);
  return res.hanzi || '';
}

/**
 * Evaluate whether an Initial + Final combination is phonotactically valid in Standard Mandarin
 * using isValidMandarinSyllable and resolveSyllableToneHanzi, and return its orthographic Pinyin
 * spelling, IPA transcription, phonotactic rule note, and 4 tones (including true tone gaps).
 */
export function combineInitialAndFinal(initialId, rawFinal, courseWords) {
  const init = initialId === '∅' ? '' : initialId;
  const fin = String(rawFinal || '').replace(/\s*\(.*\)/, '').trim();
  const isPairValid = isValidMandarinSyllable(initialId, fin);
  const baseCheck = resolveSyllableToneHanzi(initialId, fin, 1, courseWords);

  if (!isPairValid || !baseCheck.isPhonotacticallyValid) {
    let reason = `Invalid Mandarin Combination: Initial "${init || '∅'}" does not combine with final "-${fin}" in Standard Mandarin.`;
    if (fin === 'er' && init !== '') {
      reason = 'Phonotactic Constraint: Retroflex "er" [ɑɻ] (儿/耳/二) is a standalone syllable and never takes an initial consonant. Select "∅ (Zero)" + "-er"!';
    } else if (['z', 'c', 's'].includes(init) && ['ua', 'uai', 'uang', 'ueng'].includes(fin)) {
      reason = `Phonotactic Constraint: Dental sibilants (z, c, s) NEVER combine with "-${fin}" ("${init}${fin}" does not exist in Mandarin; only retroflex zh/ch/sh or velar g/k/h take "-${fin}").`;
    } else if (['j', 'q', 'x'].includes(init)) {
      reason = `Phonotactic Constraint: Palatals (j, q, x) ONLY combine with high front vowels (i- and ü-). They never combine with "-${fin}".`;
    } else if (fin.startsWith('ü') && !['', 'n', 'l', 'j', 'q', 'x'].includes(init)) {
      reason = `Phonotactic Constraint: Front rounded "-${fin}" [y] only combines with Alveolopalatals (j, q, x), Alveolar liquids/nasals (n, l), or Zero Initial (yu-).`;
    } else if (['b', 'p', 'm', 'f'].includes(init) && (fin === 'e' || (fin.startsWith('u') && fin !== 'u'))) {
      reason = `Phonotactic Constraint: Labials (b, p, m, f) never combine with "-${fin}" in Standard Mandarin (they use "-o" or pure "-u" instead).`;
    } else if (['d', 't', 'n', 'l'].includes(init) && ['ua', 'uai', 'uang'].includes(fin)) {
      reason = `Phonotactic Constraint: Alveolars (${init}) never combine with labial-velar glide "-${fin}" in Standard Mandarin.`;
    } else if (['g', 'k', 'h', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(init) && fin.startsWith('i') && fin !== 'i') {
      reason = `Phonotactic Constraint: "${init}" never combines with palatal medial i- finals ("-${fin}").`;
    }
    const disabledTones = [1, 2, 3, 4].map((tNum, idx) => ({
      tone: tNum,
      chaoNumber: ['55', '35', '214', '51'][idx],
      chaoContourLabel: [
        '1st (55 High Flat)',
        '2nd (35 Rising)',
        '3rd (214 Dipping)',
        '4th (51 Falling)'
      ][idx],
      pinyin: `${init || '∅'}+${fin}`,
      hanzi: '',
      isToneGap: true,
      isInvalid: true,
      meaning: 'Invalid Mandarin Combination',
      ipa: '—'
    }));

    return {
      isValid: false,
      orthographicBase: `${init || '∅'} + -${fin}`,
      ipaBase: '—',
      phonotacticRule: reason,
      tones: disabledTones
    };
  }

  let spellingNote = 'Standard Mandarin syllable combination.';
  if (!init) {
    spellingNote = 'Zero initial (∅): Pinyin uses y- or w- orthographically when a high vowel starts a syllable with no initial consonant.';
  } else if (['j', 'q', 'x'].includes(init) && fin.startsWith('ü')) {
    spellingNote = `Pinyin Orthography Rule: After ${init} (j, q, x), the umlaut dots on "${fin}" are omitted in writing ("${baseCheck.orthographicBase}"), but the vowel is STILL pronounced front-rounded [y]!`;
  } else if (['n', 'l'].includes(init) && fin.startsWith('ü')) {
    spellingNote = `Pinyin Orthography Rule: After "${init}", the two dots on "ü" are preserved (${baseCheck.orthographicBase}) to distinguish [y] from back rounded [u].`;
  }

  const initObj = SANDBOX_INITIALS.find((item) => item.id === (init || '∅'));
  const initIpa = initObj?.ipa || '';

  const finalIpaLookup = {
    a: 'ä',
    o: 'u̯ɔ',
    e: 'ɤ',
    er: 'ɑɻ',
    i: ['z', 'c', 's'].includes(init)
      ? 'ɹ̩'
      : ['zh', 'ch', 'sh', 'r'].includes(init)
      ? 'ʐ̩'
      : 'i',
    u: 'u',
    ü: 'y',
    ai: 'ai̯',
    ei: 'ei̯',
    ao: 'ɑu̯',
    ou: 'ou̯',
    an: 'an',
    en: 'ən',
    ang: 'ɑŋ',
    eng: 'əŋ',
    ong: 'ʊŋ',
    ia: 'i̯ä',
    ie: 'i̯ɛ',
    iao: 'i̯ɑu̯',
    iu: 'i̯ou̯',
    ian: 'i̯ɛn',
    in: 'in',
    iang: 'i̯ɑŋ',
    ing: 'iŋ',
    iong: 'i̯ʊŋ',
    ua: 'u̯ä',
    uo: 'u̯ɔ',
    uai: 'u̯ai̯',
    ui: 'u̯ei̯',
    uan: 'u̯an',
    un: 'u̯ən',
    uang: 'u̯ɑŋ',
    üe: 'y̯ɛ',
    üan: 'y̯ɛn',
    ün: 'yn'
  };

  const finIpa = finalIpaLookup[fin] || fin;
  const ipaBase = `[${initIpa}${finIpa}]`;
  const chaoLetters = ['˥', '˧˥', '˨˩˦', '˥˩'];

  const tones = [1, 2, 3, 4].map((tNum, idx) => {
    const resolved = resolveSyllableToneHanzi(initialId, fin, tNum, courseWords);
    return {
      tone: tNum,
      chaoNumber: ['55', '35', '214', '51'][idx],
      chaoContourLabel: [
        '1st (55 High Flat)',
        '2nd (35 Rising)',
        '3rd (214 Dipping)',
        '4th (51 Falling)'
      ][idx],
      pinyin: resolved.syllableDisplay,
      hanzi: resolved.hanzi,
      isToneGap: resolved.isToneGap,
      isInvalid: false,
      meaning: resolved.isToneGap
        ? 'Tone Gap in Mandarin'
        : `Character: ${resolved.hanzi}`,
      ipa: `[${initIpa}${finIpa}${chaoLetters[idx]}]`
    };
  });

  return {
    isValid: true,
    orthographicBase: baseCheck.orthographicBase,
    syllableKey: baseCheck.syllableKey,
    ipaBase,
    phonotacticRule: spellingNote,
    tones
  };
}
