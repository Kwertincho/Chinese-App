// ============================================================================
// MANDARIN PHONETICS & IPA STUDIO DATA (21 INITIALS, 36 FINALS, ALLOPHONES & SANDBOX)
// ============================================================================

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
        repPinyin: 'pà',
        repHanzi: '怕',
        repIpa: '[pʰä˥˩]',
        repMeaning: 'to fear'
      },
      {
        pinyin: 'm',
        ipa: '[m]',
        manner: 'Bilabial Nasal',
        aspiration: 'Voiced Nasal',
        callOut: 'Same as English "m" in "mother".',
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
        repPinyin: 'dà',
        repHanzi: '大',
        repIpa: '[tä˥˩]',
        repMeaning: 'big'
      },
      {
        pinyin: 't',
        ipa: '[tʰ]',
        manner: 'Aspirated Alveolar Stop',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "t" in English "top" with a strong puff of air [ʰ].',
        repPinyin: 'tā',
        repHanzi: '他',
        repIpa: '[tʰä˥]',
        repMeaning: 'he / him'
      },
      {
        pinyin: 'n',
        ipa: '[n]',
        manner: 'Alveolar Nasal',
        aspiration: 'Voiced Nasal',
        callOut: 'Like "n" in "nine". Can take both u (nù) and ü (nǚ).',
        repPinyin: 'ná',
        repHanzi: '拿',
        repIpa: '[nä˧˥]',
        repMeaning: 'to hold / take'
      },
      {
        pinyin: 'l',
        ipa: '[l]',
        manner: 'Alveolar Lateral Approximant',
        aspiration: 'Voiced Lateral',
        callOut: 'Light "l" as in "leaf" with tongue tip on ridge. Can take u and ü.',
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
        repPinyin: 'zì',
        repHanzi: '字',
        repIpa: '[tsɹ̩˥˩]',
        repMeaning: 'character'
      },
      {
        pinyin: 'c',
        ipa: '[tsʰ]',
        manner: 'Aspirated Dental Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "ts" in "tsunami" with a strong burst of air [ʰ].',
        repPinyin: 'cì',
        repHanzi: '次',
        repIpa: '[tsʰɹ̩˥˩]',
        repMeaning: 'time / order'
      },
      {
        pinyin: 's',
        ipa: '[s]',
        manner: 'Voiceless Dental Fricative',
        aspiration: 'Fricative',
        callOut: 'Crisp "s" as in "sun" with tongue tip near upper teeth.',
        repPinyin: 'sì',
        repHanzi: '四',
        repIpa: '[sɹ̩˥˩]',
        repMeaning: 'four'
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
        repPinyin: 'zhī',
        repHanzi: '知',
        repIpa: '[tʂʐ̩˥]',
        repMeaning: 'to know'
      },
      {
        pinyin: 'ch',
        ipa: '[tʂʰ]',
        manner: 'Aspirated Retroflex Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Tongue tip curled back with a strong puff of air [ʰ], like "ch" in "church".',
        repPinyin: 'chī',
        repHanzi: '吃',
        repIpa: '[tʂʰʐ̩˥]',
        repMeaning: 'to eat'
      },
      {
        pinyin: 'sh',
        ipa: '[ʂ]',
        manner: 'Voiceless Retroflex Fricative',
        aspiration: 'Fricative',
        callOut: 'Tongue curled back, producing a deeper "sh" sound than English "ship".',
        repPinyin: 'shì',
        repHanzi: '是',
        repIpa: '[ʂʐ̩˥˩]',
        repMeaning: 'to be / yes'
      },
      {
        pinyin: 'r',
        ipa: '[ʐ~ɻ]',
        manner: 'Voiced Retroflex Approximant / Fricative',
        aspiration: 'Voiced',
        callOut: 'Tongue curled back like "r" in American "run" with slight buzz [ʐ]. Lips unrounded!',
        repPinyin: 'rì',
        repHanzi: '日',
        repIpa: '[ʐ̩˥˩]',
        repMeaning: 'sun / day'
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
        repPinyin: 'jī',
        repHanzi: '机',
        repIpa: '[tɕi˥]',
        repMeaning: 'machine'
      },
      {
        pinyin: 'q',
        ipa: '[tɕʰ]',
        manner: 'Aspirated Palatal Affricate',
        aspiration: 'Strongly Aspirated',
        callOut: 'Same flat palatal tongue position as "j", but with a sharp puff of air [ʰ] ("chee").',
        repPinyin: 'qī',
        repHanzi: '七',
        repIpa: '[tɕʰi˥]',
        repMeaning: 'seven'
      },
      {
        pinyin: 'x',
        ipa: '[ɕ]',
        manner: 'Voiceless Palatal Fricative',
        aspiration: 'Fricative',
        callOut: 'Hissing palatal "sh" made with tongue tip tucked behind lower teeth ("shee").',
        repPinyin: 'xī',
        repHanzi: '西',
        repIpa: '[ɕi˥]',
        repMeaning: 'west'
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
        repPinyin: 'gē',
        repHanzi: '哥',
        repIpa: '[kɤ˥]',
        repMeaning: 'older brother'
      },
      {
        pinyin: 'k',
        ipa: '[kʰ]',
        manner: 'Aspirated Velar Stop',
        aspiration: 'Strongly Aspirated',
        callOut: 'Like "k" in English "kite" with a strong puff of air [ʰ].',
        repPinyin: 'kē',
        repHanzi: '科',
        repIpa: '[kʰɤ˥]',
        repMeaning: 'branch / science'
      },
      {
        pinyin: 'h',
        ipa: '[x]',
        manner: 'Voiceless Velar Fricative',
        aspiration: 'Velar Fricative',
        callOut: 'Slight rasp at the back of the throat [x] (stronger than English "h", softer than Bach).',
        repPinyin: 'hē',
        repHanzi: '喝',
        repIpa: '[xɤ˥]',
        repMeaning: 'to drink'
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
          { pinyin: 'bǐ', hanzi: '笔', ipa: '[pi˨˩˦]', meaning: 'pen' },
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
        repPinyin: 'mā',
        repHanzi: '妈',
        repIpa: '[mä˥]',
        repMeaning: 'mother'
      },
      {
        pinyin: 'o',
        ipa: '[u̯ɔ]',
        note: 'After bilabials (b, p, m, f), has an automatic labial glide [u̯ɔ] (bō, pō, mō, fō).',
        repPinyin: 'mō',
        repHanzi: '摸',
        repIpa: '[mu̯ɔ˥]',
        repMeaning: 'to touch'
      },
      {
        pinyin: 'e',
        ipa: '[ɤ] / [z̩] / [ʐ̩]',
        note: 'Unrounded mid-back [ɤ] in open syllables (gē, hē).',
        repPinyin: 'gē',
        repHanzi: '哥',
        repIpa: '[kɤ˥]',
        repMeaning: 'older brother'
      },
      {
        pinyin: 'i',
        ipa: '[i] / [z̩] / [ʐ̩]',
        note: 'High front [i] after b/p/m/d/t/n/l/j/q/x; apical buzz after z/c/s & zh/ch/sh/r.',
        repPinyin: 'nǐ',
        repHanzi: '你',
        repIpa: '[ni˨˩˦]',
        repMeaning: 'you'
      },
      {
        pinyin: 'u',
        ipa: '[u]',
        note: 'High back rounded vowel ("oo"). Standalone written as wu.',
        repPinyin: 'shū',
        repHanzi: '书',
        repIpa: '[ʂu˥]',
        repMeaning: 'book'
      },
      {
        pinyin: 'ü',
        ipa: '[y]',
        note: 'High front rounded vowel ([i] tongue + [u] lips). Written "u" after j, q, x, y.',
        repPinyin: 'nǚ',
        repHanzi: '女',
        repIpa: '[ny˨˩˦]',
        repMeaning: 'female'
      },
      {
        pinyin: 'er',
        ipa: '[ɑɻ]',
        note: 'Standalone retroflex vowel syllable (儿 ér, 二 èr).',
        repPinyin: 'èr',
        repHanzi: '二',
        repIpa: '[ɑɻ˥˩]',
        repMeaning: 'two'
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
        repPinyin: 'ài',
        repHanzi: '爱',
        repIpa: '[ai̯˥˩]',
        repMeaning: 'love'
      },
      {
        pinyin: 'ei',
        ipa: '[ei̯]',
        note: 'Close-mid [e] gliding to [i], like "ay" in "day".',
        repPinyin: 'běi',
        repHanzi: '北',
        repIpa: '[pei̯˨˩˦]',
        repMeaning: 'north'
      },
      {
        pinyin: 'ao',
        ipa: '[ɑu̯]',
        note: 'Back [ɑ] gliding to rounded [u̯], like "ow" in "now".',
        repPinyin: 'hǎo',
        repHanzi: '好',
        repIpa: '[xɑu̯˨˩˦]',
        repMeaning: 'good'
      },
      {
        pinyin: 'ou',
        ipa: '[ou̯]',
        note: 'Mid-back [o] gliding to [u̯], like "oh" in "go".',
        repPinyin: 'zǒu',
        repHanzi: '走',
        repIpa: '[tsou̯˨˩˦]',
        repMeaning: 'walk / go'
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
        note: 'Front [a] + alveolar [-n], as in kàn (看).',
        repPinyin: 'kàn',
        repHanzi: '看',
        repIpa: '[kʰan˥˩]',
        repMeaning: 'to look'
      },
      {
        pinyin: 'en',
        ipa: '[ən]',
        note: 'Central schwa [ə] + alveolar [-n], like "taken".',
        repPinyin: 'rén',
        repHanzi: '人',
        repIpa: '[ʐən˧˥]',
        repMeaning: 'person'
      },
      {
        pinyin: 'in',
        ipa: '[in]',
        note: 'High front [i] + alveolar [-n], like "keen".',
        repPinyin: 'xīn',
        repHanzi: '心',
        repIpa: '[ɕin˥]',
        repMeaning: 'heart'
      },
      {
        pinyin: 'ün',
        ipa: '[yn]',
        note: 'Front rounded [y] + [-n]. Written as "un" after j, q, x, y (jūn, qún, yún).',
        repPinyin: 'yún',
        repHanzi: '云',
        repIpa: '[yn˧˥]',
        repMeaning: 'cloud'
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
        repPinyin: 'máng',
        repHanzi: '忙',
        repIpa: '[mɑŋ˧˥]',
        repMeaning: 'busy'
      },
      {
        pinyin: 'eng',
        ipa: '[əŋ]',
        note: 'Central schwa [ə] + velar [-ŋ]. After b, p, m, f often labialized.',
        repPinyin: 'lěng',
        repHanzi: '冷',
        repIpa: '[ləŋ˨˩˦]',
        repMeaning: 'cold'
      },
      {
        pinyin: 'ing',
        ipa: '[iŋ]',
        note: 'High front [i] + velar [-ŋ] (sometimes with a tiny schwa transition [iəŋ]).',
        repPinyin: 'tīng',
        repHanzi: '听',
        repIpa: '[tʰiŋ˥]',
        repMeaning: 'to listen'
      },
      {
        pinyin: 'ong',
        ipa: '[ʊŋ]',
        note: 'Rounded back [ʊ] + velar [-ŋ] (dōng, zhōng, gōng).',
        repPinyin: 'zhōng',
        repHanzi: '中',
        repIpa: '[tʂʊŋ˥]',
        repMeaning: 'middle'
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
        repPinyin: 'jiā',
        repHanzi: '家',
        repIpa: '[tɕi̯ä˥]',
        repMeaning: 'home / family'
      },
      {
        pinyin: 'ie',
        ipa: '[i̯ɛ]',
        note: 'Palatal glide [i̯] + front [ɛ] (jiě, xiè; standalone written ye).',
        repPinyin: 'xiè',
        repHanzi: '谢',
        repIpa: '[ɕi̯ɛ˥˩]',
        repMeaning: 'thank'
      },
      {
        pinyin: 'iao',
        ipa: '[i̯ɑu̯]',
        note: 'Palatal glide [i̯] + [ɑu̯] (xiǎo, jiào; standalone written yao).',
        repPinyin: 'xiǎo',
        repHanzi: '小',
        repIpa: '[ɕi̯ɑu̯˨˩˦]',
        repMeaning: 'small'
      },
      {
        pinyin: 'iu (iou)',
        ipa: '[i̯ou̯]',
        note: 'Spelled "iu" after consonants, pronounced [i̯ou̯] (liù, jiǔ).',
        repPinyin: 'liù',
        repHanzi: '六',
        repIpa: '[li̯ou̯˥˩]',
        repMeaning: 'six'
      },
      {
        pinyin: 'ian',
        ipa: '[i̯ɛn]',
        note: 'Vowel "a" raises to [ɛ] between [i̯] and [-n] (tiān, jiàn, miàn).',
        repPinyin: 'tiān',
        repHanzi: '天',
        repIpa: '[tʰi̯ɛn˥]',
        repMeaning: 'sky / day'
      },
      {
        pinyin: 'iang',
        ipa: '[i̯ɑŋ]',
        note: 'Palatal glide [i̯] + back [ɑŋ] (xiǎng, liǎng).',
        repPinyin: 'xiǎng',
        repHanzi: '想',
        repIpa: '[ɕi̯ɑŋ˨˩˦]',
        repMeaning: 'to think / want'
      },
      {
        pinyin: 'iong',
        ipa: '[i̯ʊŋ]',
        note: 'Palatal-labial glide + velar [-ŋ] (xióng, qióng; standalone yong).',
        repPinyin: 'yòng',
        repHanzi: '用',
        repIpa: '[i̯ʊŋ˥˩]',
        repMeaning: 'to use'
      },
      {
        pinyin: 'ua',
        ipa: '[u̯ä]',
        note: 'Labial glide [u̯] + [ä] (huā, guā, shuō; standalone wa).',
        repPinyin: 'huā',
        repHanzi: '花',
        repIpa: '[xu̯ä˥]',
        repMeaning: 'flower'
      },
      {
        pinyin: 'uo',
        ipa: '[u̯ɔ]',
        note: 'Labial glide [u̯] + [ɔ] (guó, shuō, duō; standalone wo).',
        repPinyin: 'guó',
        repHanzi: '国',
        repIpa: '[ku̯ɔ˧˥]',
        repMeaning: 'country'
      },
      {
        pinyin: 'uai',
        ipa: '[u̯ai̯]',
        note: 'Labial glide [u̯] + [ai̯] (kuài, shuài; standalone wai).',
        repPinyin: 'kuài',
        repHanzi: '快',
        repIpa: '[kʰu̯ai̯˥˩]',
        repMeaning: 'fast'
      },
      {
        pinyin: 'ui (uei)',
        ipa: '[u̯ei̯]',
        note: 'Spelled "ui" after consonants, pronounced [u̯ei̯] (shuǐ, duì, huí).',
        repPinyin: 'shuǐ',
        repHanzi: '水',
        repIpa: '[ʂu̯ei̯˨˩˦]',
        repMeaning: 'water'
      },
      {
        pinyin: 'uan',
        ipa: '[u̯an]',
        note: 'Labial glide [u̯] + front [an] (guān, huān; standalone wan).',
        repPinyin: 'guān',
        repHanzi: '关',
        repIpa: '[ku̯an˥]',
        repMeaning: 'to close'
      },
      {
        pinyin: 'un (uen)',
        ipa: '[u̯ən]',
        note: 'Spelled "un" after d/t/n/l/g/k/h/z/c/s/zh/ch/sh/r, pronounced [u̯ən] (wèn, chūn).',
        repPinyin: 'wèn',
        repHanzi: '问',
        repIpa: '[u̯ən˥˩]',
        repMeaning: 'to ask'
      },
      {
        pinyin: 'uang',
        ipa: '[u̯ɑŋ]',
        note: 'Labial glide [u̯] + back [ɑŋ] (chuáng, huáng; standalone wang).',
        repPinyin: 'chuáng',
        repHanzi: '床',
        repIpa: '[tʂʰu̯ɑŋ˧˥]',
        repMeaning: 'bed'
      },
      {
        pinyin: 'üe',
        ipa: '[y̯ɛ]',
        note: 'Front rounded glide [y̯] + [ɛ]. Written "ue" after j, q, x, y (xué, yuè) and "üe" after n, l (lüè).',
        repPinyin: 'xué',
        repHanzi: '学',
        repIpa: '[ɕy̯ɛ˧˥]',
        repMeaning: 'to study'
      },
      {
        pinyin: 'üan',
        ipa: '[y̯ɛn]',
        note: 'Front rounded glide [y̯] + raised [ɛn]. Written "uan" after j, q, x, y (yuǎn, quán, xuǎn).',
        repPinyin: 'yuǎn',
        repHanzi: '远',
        repIpa: '[y̯ɛn˨˩˦]',
        repMeaning: 'far'
      }
    ]
  }
];

// ============================================================================
// COMBINATION SANDBOX ENGINE (INITIAL + FINAL -> IPA + 4-TONE CHARACTERS)
// ============================================================================

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
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ao', 'ou',
  'an', 'en', 'ang', 'eng', 'ong',
  'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong',
  'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang',
  'üe', 'üan', 'ün'
];

// Curated dictionary of common Mandarin syllables with 4-tone characters & meanings
export const SYLLABLE_4_TONE_BANK = {
  a: {
    tones: [
      { tone: 1, pinyin: 'ā', hanzi: '阿', meaning: 'prefix ā-' },
      { tone: 2, pinyin: 'á', hanzi: '啊', meaning: 'what? (rising)' },
      { tone: 3, pinyin: 'ǎ', hanzi: '啊', meaning: 'huh?' },
      { tone: 4, pinyin: 'à', hanzi: '啊', meaning: 'ah! (realization)' }
    ]
  },
  ba: {
    tones: [
      { tone: 1, pinyin: 'bā', hanzi: '八', meaning: 'eight' },
      { tone: 2, pinyin: 'bá', hanzi: '拔', meaning: 'to pull out' },
      { tone: 3, pinyin: 'bǎ', hanzi: '把', meaning: 'to hold / grasp' },
      { tone: 4, pinyin: 'bà', hanzi: '爸', meaning: 'dad / father' }
    ]
  },
  pa: {
    tones: [
      { tone: 1, pinyin: 'pā', hanzi: '趴', meaning: 'lie on stomach' },
      { tone: 2, pinyin: 'pá', hanzi: '爬', meaning: 'to climb' },
      { tone: 3, pinyin: 'pǎ', hanzi: '帕', meaning: 'kerchief' },
      { tone: 4, pinyin: 'pà', hanzi: '怕', meaning: 'to fear' }
    ]
  },
  ma: {
    tones: [
      { tone: 1, pinyin: 'mā', hanzi: '妈', meaning: 'mother' },
      { tone: 2, pinyin: 'má', hanzi: '麻', meaning: 'hemp / numb' },
      { tone: 3, pinyin: 'mǎ', hanzi: '马', meaning: 'horse' },
      { tone: 4, pinyin: 'mà', hanzi: '骂', meaning: 'to scold' }
    ]
  },
  fa: {
    tones: [
      { tone: 1, pinyin: 'fā', hanzi: '发', meaning: 'to send / emit' },
      { tone: 2, pinyin: 'fá', hanzi: '罚', meaning: 'to punish' },
      { tone: 3, pinyin: 'fǎ', hanzi: '法', meaning: 'law / method' },
      { tone: 4, pinyin: 'fà', hanzi: '发', meaning: 'hair (fà)' }
    ]
  },
  da: {
    tones: [
      { tone: 1, pinyin: 'dā', hanzi: '搭', meaning: 'to build / take' },
      { tone: 2, pinyin: 'dá', hanzi: '答', meaning: 'to answer' },
      { tone: 3, pinyin: 'dǎ', hanzi: '打', meaning: 'to hit / play' },
      { tone: 4, pinyin: 'dà', hanzi: '大', meaning: 'big / large' }
    ]
  },
  ta: {
    tones: [
      { tone: 1, pinyin: 'tā', hanzi: '他', meaning: 'he / him' },
      { tone: 2, pinyin: 'tá', hanzi: '达', meaning: 'reach' },
      { tone: 3, pinyin: 'tǎ', hanzi: '塔', meaning: 'pagoda / tower' },
      { tone: 4, pinyin: 'tà', hanzi: '踏', meaning: 'to step on' }
    ]
  },
  na: {
    tones: [
      { tone: 1, pinyin: 'nā', hanzi: '那', meaning: 'surname Na' },
      { tone: 2, pinyin: 'ná', hanzi: '拿', meaning: 'to take / hold' },
      { tone: 3, pinyin: 'nǎ', hanzi: '哪', meaning: 'which / where' },
      { tone: 4, pinyin: 'nà', hanzi: '那', meaning: 'that' }
    ]
  },
  la: {
    tones: [
      { tone: 1, pinyin: 'lā', hanzi: '拉', meaning: 'to pull' },
      { tone: 2, pinyin: 'lá', hanzi: '划', meaning: 'to slash' },
      { tone: 3, pinyin: 'lǎ', hanzi: '喇', meaning: 'horn (lǎba)' },
      { tone: 4, pinyin: 'là', hanzi: '辣', meaning: 'spicy' }
    ]
  },
  ga: {
    tones: [
      { tone: 1, pinyin: 'gā', hanzi: '咖', meaning: 'curry (gālí)' },
      { tone: 2, pinyin: 'gá', hanzi: '嘎', meaning: 'quack' },
      { tone: 3, pinyin: 'gǎ', hanzi: '尕', meaning: 'little' },
      { tone: 4, pinyin: 'gà', hanzi: '尬', meaning: 'awkward' }
    ]
  },
  ka: {
    tones: [
      { tone: 1, pinyin: 'kā', hanzi: '咖', meaning: 'coffee (kāfēi)' },
      { tone: 2, pinyin: 'ká', hanzi: '咳', meaning: 'cough up' },
      { tone: 3, pinyin: 'kǎ', hanzi: '卡', meaning: 'card / block' },
      { tone: 4, pinyin: 'kà', hanzi: '喀', meaning: 'click sound' }
    ]
  },
  ha: {
    tones: [
      { tone: 1, pinyin: 'hā', hanzi: '哈', meaning: 'haha / breathe' },
      { tone: 2, pinyin: 'há', hanzi: '蛤', meaning: 'toad' },
      { tone: 3, pinyin: 'hǎ', hanzi: '哈', meaning: 'bent (hǎyāo)' },
      { tone: 4, pinyin: 'hà', hanzi: '哈', meaning: 'aha!' }
    ]
  },
  zha: {
    tones: [
      { tone: 1, pinyin: 'zhā', hanzi: '扎', meaning: 'to prick' },
      { tone: 2, pinyin: 'zhá', hanzi: '炸', meaning: 'deep-fry' },
      { tone: 3, pinyin: 'zhǎ', hanzi: '眨', meaning: 'to blink' },
      { tone: 4, pinyin: 'zhà', hanzi: '炸', meaning: 'to explode' }
    ]
  },
  cha: {
    tones: [
      { tone: 1, pinyin: 'chā', hanzi: '差', meaning: 'difference' },
      { tone: 2, pinyin: 'chá', hanzi: '茶', meaning: 'tea' },
      { tone: 3, pinyin: 'chǎ', hanzi: '叉', meaning: 'spread' },
      { tone: 4, pinyin: 'chà', hanzi: '差', meaning: 'lacking / bad' }
    ]
  },
  sha: {
    tones: [
      { tone: 1, pinyin: 'shā', hanzi: '沙', meaning: 'sand' },
      { tone: 2, pinyin: 'shá', hanzi: '啥', meaning: 'what (colloq.)' },
      { tone: 3, pinyin: 'shǎ', hanzi: '傻', meaning: 'silly' },
      { tone: 4, pinyin: 'shà', hanzi: '厦', meaning: 'mansion' }
    ]
  },
  bo: {
    tones: [
      { tone: 1, pinyin: 'bō', hanzi: '波', meaning: 'wave' },
      { tone: 2, pinyin: 'bó', hanzi: '伯', meaning: 'uncle' },
      { tone: 3, pinyin: 'bǒ', hanzi: '跛', meaning: 'lame' },
      { tone: 4, pinyin: 'bò', hanzi: '薄', meaning: 'peppermint' }
    ]
  },
  po: {
    tones: [
      { tone: 1, pinyin: 'pō', hanzi: '坡', meaning: 'slope' },
      { tone: 2, pinyin: 'pó', hanzi: '婆', meaning: 'grandmother' },
      { tone: 3, pinyin: 'pǒ', hanzi: '颇', meaning: 'quite / rather' },
      { tone: 4, pinyin: 'pò', hanzi: '破', meaning: 'broken' }
    ]
  },
  mo: {
    tones: [
      { tone: 1, pinyin: 'mō', hanzi: '摸', meaning: 'to touch' },
      { tone: 2, pinyin: 'mó', hanzi: '磨', meaning: 'to rub / grind' },
      { tone: 3, pinyin: 'mǒ', hanzi: '抹', meaning: 'to wipe' },
      { tone: 4, pinyin: 'mò', hanzi: '末', meaning: 'end / tip' }
    ]
  },
  fo: {
    tones: [
      { tone: 1, pinyin: 'fō', hanzi: '佛', meaning: 'sound fo1' },
      { tone: 2, pinyin: 'fó', hanzi: '佛', meaning: 'Buddha' },
      { tone: 3, pinyin: 'fǒ', hanzi: '否', meaning: 'negate' },
      { tone: 4, pinyin: 'fò', hanzi: '佛', meaning: 'tone 4 drill' }
    ]
  },
  ge: {
    tones: [
      { tone: 1, pinyin: 'gē', hanzi: '哥', meaning: 'older brother' },
      { tone: 2, pinyin: 'gé', hanzi: '格', meaning: 'grid / pattern' },
      { tone: 3, pinyin: 'gě', hanzi: '葛', meaning: 'surname Ge' },
      { tone: 4, pinyin: 'gè', hanzi: '个', meaning: 'general classifier' }
    ]
  },
  ke: {
    tones: [
      { tone: 1, pinyin: 'kē', hanzi: '科', meaning: 'science / branch' },
      { tone: 2, pinyin: 'ké', hanzi: '壳', meaning: 'shell' },
      { tone: 3, pinyin: 'kě', hanzi: '渴', meaning: 'thirsty' },
      { tone: 4, pinyin: 'kè', hanzi: '课', meaning: 'lesson / class' }
    ]
  },
  he: {
    tones: [
      { tone: 1, pinyin: 'hē', hanzi: '喝', meaning: 'to drink' },
      { tone: 2, pinyin: 'hé', hanzi: '和', meaning: 'and / harmony' },
      { tone: 3, pinyin: 'hě', hanzi: '喝', meaning: 'tone 3 drill' },
      { tone: 4, pinyin: 'hè', hanzi: '贺', meaning: 'congratulate' }
    ]
  },
  de: {
    tones: [
      { tone: 1, pinyin: 'dē', hanzi: '得', meaning: 'must (dēi)' },
      { tone: 2, pinyin: 'dé', hanzi: '德', meaning: 'virtue / Germany' },
      { tone: 3, pinyin: 'dě', hanzi: '得', meaning: 'tone 3 drill' },
      { tone: 4, pinyin: 'dè', hanzi: '的', meaning: 'target' }
    ]
  },
  te: {
    tones: [
      { tone: 1, pinyin: 'tē', hanzi: '特', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'té', hanzi: '疼', meaning: 'ache' },
      { tone: 3, pinyin: 'tě', hanzi: '特', meaning: 'tone 3 drill' },
      { tone: 4, pinyin: 'tè', hanzi: '特', meaning: 'special' }
    ]
  },
  zhe: {
    tones: [
      { tone: 1, pinyin: 'zhē', hanzi: '遮', meaning: 'to cover' },
      { tone: 2, pinyin: 'zhé', hanzi: '折', meaning: 'to fold' },
      { tone: 3, pinyin: 'zhě', hanzi: '者', meaning: 'person who' },
      { tone: 4, pinyin: 'zhè', hanzi: '这', meaning: 'this' }
    ]
  },
  che: {
    tones: [
      { tone: 1, pinyin: 'chē', hanzi: '车', meaning: 'car / vehicle' },
      { tone: 2, pinyin: 'ché', hanzi: '扯', meaning: 'pull' },
      { tone: 3, pinyin: 'chě', hanzi: '扯', meaning: 'to tear / chat' },
      { tone: 4, pinyin: 'chè', hanzi: '彻', meaning: 'thorough' }
    ]
  },
  she: {
    tones: [
      { tone: 1, pinyin: 'shē', hanzi: '奢', meaning: 'luxury' },
      { tone: 2, pinyin: 'shé', hanzi: '舌', meaning: 'tongue / snake' },
      { tone: 3, pinyin: 'shě', hanzi: '舍', meaning: 'give up' },
      { tone: 4, pinyin: 'shè', hanzi: '社', meaning: 'society' }
    ]
  },
  re: {
    tones: [
      { tone: 1, pinyin: 'rē', hanzi: '热', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'ré', hanzi: '人', meaning: 'person' },
      { tone: 3, pinyin: 'rě', hanzi: '惹', meaning: 'provoke' },
      { tone: 4, pinyin: 'rè', hanzi: '热', meaning: 'hot' }
    ]
  },
  bi: {
    tones: [
      { tone: 1, pinyin: 'bī', hanzi: '逼', meaning: 'to force' },
      { tone: 2, pinyin: 'bí', hanzi: '鼻', meaning: 'nose' },
      { tone: 3, pinyin: 'bǐ', hanzi: '笔', meaning: 'pen / compare' },
      { tone: 4, pinyin: 'bì', hanzi: '必', meaning: 'must' }
    ]
  },
  pi: {
    tones: [
      { tone: 1, pinyin: 'pī', hanzi: '批', meaning: 'batch / criticize' },
      { tone: 2, pinyin: 'pí', hanzi: '皮', meaning: 'skin / leather' },
      { tone: 3, pinyin: 'pǐ', hanzi: '匹', meaning: 'measure for horses' },
      { tone: 4, pinyin: 'pì', hanzi: '辟', meaning: 'open up' }
    ]
  },
  mi: {
    tones: [
      { tone: 1, pinyin: 'mī', hanzi: '咪', meaning: 'meow / smile' },
      { tone: 2, pinyin: 'mí', hanzi: '迷', meaning: 'fan / lost' },
      { tone: 3, pinyin: 'mǐ', hanzi: '米', meaning: 'rice / meter' },
      { tone: 4, pinyin: 'mì', hanzi: '密', meaning: 'secret / dense' }
    ]
  },
  di: {
    tones: [
      { tone: 1, pinyin: 'dī', hanzi: '低', meaning: 'low' },
      { tone: 2, pinyin: 'dí', hanzi: '敌', meaning: 'enemy' },
      { tone: 3, pinyin: 'dǐ', hanzi: '底', meaning: 'bottom' },
      { tone: 4, pinyin: 'dì', hanzi: '弟', meaning: 'younger brother' }
    ]
  },
  ti: {
    tones: [
      { tone: 1, pinyin: 'tī', hanzi: '踢', meaning: 'to kick' },
      { tone: 2, pinyin: 'tí', hanzi: '题', meaning: 'question / topic' },
      { tone: 3, pinyin: 'tǐ', hanzi: '体', meaning: 'body' },
      { tone: 4, pinyin: 'tì', hanzi: '替', meaning: 'replace' }
    ]
  },
  ni: {
    tones: [
      { tone: 1, pinyin: 'nī', hanzi: '妮', meaning: 'girl' },
      { tone: 2, pinyin: 'ní', hanzi: '泥', meaning: 'mud' },
      { tone: 3, pinyin: 'nǐ', hanzi: '你', meaning: 'you' },
      { tone: 4, pinyin: 'nì', hanzi: '逆', meaning: 'contrary' }
    ]
  },
  li: {
    tones: [
      { tone: 1, pinyin: 'lī', hanzi: '哩', meaning: 'mile' },
      { tone: 2, pinyin: 'lí', hanzi: '离', meaning: 'leave / away' },
      { tone: 3, pinyin: 'lǐ', hanzi: '里', meaning: 'inside' },
      { tone: 4, pinyin: 'lì', hanzi: '力', meaning: 'power / strength' }
    ]
  },
  ji: {
    tones: [
      { tone: 1, pinyin: 'jī', hanzi: '机', meaning: 'machine / chicken' },
      { tone: 2, pinyin: 'jí', hanzi: '急', meaning: 'urgent' },
      { tone: 3, pinyin: 'jǐ', hanzi: '几', meaning: 'how many' },
      { tone: 4, pinyin: 'jì', hanzi: '记', meaning: 'remember / record' }
    ]
  },
  qi: {
    tones: [
      { tone: 1, pinyin: 'qī', hanzi: '七', meaning: 'seven' },
      { tone: 2, pinyin: 'qí', hanzi: '骑', meaning: 'to ride' },
      { tone: 3, pinyin: 'qǐ', hanzi: '起', meaning: 'to rise / get up' },
      { tone: 4, pinyin: 'qì', hanzi: '气', meaning: 'air / anger' }
    ]
  },
  xi: {
    tones: [
      { tone: 1, pinyin: 'xī', hanzi: '西', meaning: 'west' },
      { tone: 2, pinyin: 'xí', hanzi: '习', meaning: 'practice' },
      { tone: 3, pinyin: 'xǐ', hanzi: '洗', meaning: 'to wash / like' },
      { tone: 4, pinyin: 'xì', hanzi: '细', meaning: 'fine / thin' }
    ]
  },
  zhi: {
    tones: [
      { tone: 1, pinyin: 'zhī', hanzi: '知', meaning: 'to know' },
      { tone: 2, pinyin: 'zhí', hanzi: '直', meaning: 'straight' },
      { tone: 3, pinyin: 'zhǐ', hanzi: '只', meaning: 'only / paper' },
      { tone: 4, pinyin: 'zhì', hanzi: '至', meaning: 'arrive / most' }
    ]
  },
  chi: {
    tones: [
      { tone: 1, pinyin: 'chī', hanzi: '吃', meaning: 'to eat' },
      { tone: 2, pinyin: 'chí', hanzi: '迟', meaning: 'late' },
      { tone: 3, pinyin: 'chǐ', hanzi: '尺', meaning: 'ruler / tooth' },
      { tone: 4, pinyin: 'chì', hanzi: '翅', meaning: 'wing' }
    ]
  },
  shi: {
    tones: [
      { tone: 1, pinyin: 'shī', hanzi: '师', meaning: 'teacher / master' },
      { tone: 2, pinyin: 'shí', hanzi: '十', meaning: 'ten / time' },
      { tone: 3, pinyin: 'shǐ', hanzi: '始', meaning: 'begin' },
      { tone: 4, pinyin: 'shì', hanzi: '是', meaning: 'to be / yes' }
    ]
  },
  ri: {
    tones: [
      { tone: 1, pinyin: 'rī', hanzi: '日', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'rí', hanzi: '日', meaning: 'tone 2 drill' },
      { tone: 3, pinyin: 'rǐ', hanzi: '日', meaning: 'tone 3 drill' },
      { tone: 4, pinyin: 'rì', hanzi: '日', meaning: 'sun / day' }
    ]
  },
  zi: {
    tones: [
      { tone: 1, pinyin: 'zī', hanzi: '资', meaning: 'capital / resource' },
      { tone: 2, pinyin: 'zí', hanzi: '词', meaning: 'word' },
      { tone: 3, pinyin: 'zǐ', hanzi: '子', meaning: 'child / son' },
      { tone: 4, pinyin: 'zì', hanzi: '字', meaning: 'written character' }
    ]
  },
  ci: {
    tones: [
      { tone: 1, pinyin: 'cī', hanzi: '疵', meaning: 'flaw' },
      { tone: 2, pinyin: 'cí', hanzi: '词', meaning: 'word / lyrics' },
      { tone: 3, pinyin: 'cǐ', hanzi: '此', meaning: 'this' },
      { tone: 4, pinyin: 'cì', hanzi: '次', meaning: 'time / sequence' }
    ]
  },
  si: {
    tones: [
      { tone: 1, pinyin: 'sī', hanzi: '思', meaning: 'to think / silk' },
      { tone: 2, pinyin: 'sí', hanzi: '词', meaning: 'tone 2 drill' },
      { tone: 3, pinyin: 'sǐ', hanzi: '死', meaning: 'to die' },
      { tone: 4, pinyin: 'sì', hanzi: '四', meaning: 'four' }
    ]
  },
  bu: {
    tones: [
      { tone: 1, pinyin: 'bū', hanzi: '逋', meaning: 'flee' },
      { tone: 2, pinyin: 'bú', hanzi: '不', meaning: 'not (before 4th tone)' },
      { tone: 3, pinyin: 'bǔ', hanzi: '补', meaning: 'to mend / supplement' },
      { tone: 4, pinyin: 'bù', hanzi: '不', meaning: 'no / not' }
    ]
  },
  pu: {
    tones: [
      { tone: 1, pinyin: 'pū', hanzi: '铺', meaning: 'to spread' },
      { tone: 2, pinyin: 'pú', hanzi: '葡', meaning: 'grape' },
      { tone: 3, pinyin: 'pǔ', hanzi: '普', meaning: 'universal / common' },
      { tone: 4, pinyin: 'pù', hanzi: '铺', meaning: 'shop / store' }
    ]
  },
  mu: {
    tones: [
      { tone: 1, pinyin: 'mū', hanzi: '模', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'mú', hanzi: '模', meaning: 'mold / pattern' },
      { tone: 3, pinyin: 'mǔ', hanzi: '母', meaning: 'mother / female' },
      { tone: 4, pinyin: 'mù', hanzi: '木', meaning: 'tree / wood / eye' }
    ]
  },
  fu: {
    tones: [
      { tone: 1, pinyin: 'fū', hanzi: '夫', meaning: 'husband / man' },
      { tone: 2, pinyin: 'fú', hanzi: '服', meaning: 'clothes / serve' },
      { tone: 3, pinyin: 'fǔ', hanzi: '府', meaning: 'mansion / seat' },
      { tone: 4, pinyin: 'fù', hanzi: '父', meaning: 'father / rich' }
    ]
  },
  du: {
    tones: [
      { tone: 1, pinyin: 'dū', hanzi: '都', meaning: 'capital / all' },
      { tone: 2, pinyin: 'dú', hanzi: '读', meaning: 'to read' },
      { tone: 3, pinyin: 'dǔ', hanzi: '堵', meaning: 'to block' },
      { tone: 4, pinyin: 'dù', hanzi: '度', meaning: 'degree / pass' }
    ]
  },
  tu: {
    tones: [
      { tone: 1, pinyin: 'tū', hanzi: '突', meaning: 'sudden' },
      { tone: 2, pinyin: 'tú', hanzi: '图', meaning: 'map / picture' },
      { tone: 3, pinyin: 'tǔ', hanzi: '土', meaning: 'earth / soil' },
      { tone: 4, pinyin: 'tù', hanzi: '兔', meaning: 'rabbit' }
    ]
  },
  nu: {
    tones: [
      { tone: 1, pinyin: 'nū', hanzi: '奴', meaning: 'tone 1' },
      { tone: 2, pinyin: 'nú', hanzi: '奴', meaning: 'servant' },
      { tone: 3, pinyin: 'nǔ', hanzi: '努', meaning: 'strive (nǔlì)' },
      { tone: 4, pinyin: 'nù', hanzi: '怒', meaning: 'angry' }
    ]
  },
  lu: {
    tones: [
      { tone: 1, pinyin: 'lū', hanzi: '撸', meaning: 'roll up' },
      { tone: 2, pinyin: 'lú', hanzi: '炉', meaning: 'stove' },
      { tone: 3, pinyin: 'lǔ', hanzi: '鲁', meaning: 'Shandong' },
      { tone: 4, pinyin: 'lù', hanzi: '路', meaning: 'road / path' }
    ]
  },
  gu: {
    tones: [
      { tone: 1, pinyin: 'gū', hanzi: '姑', meaning: 'aunt' },
      { tone: 2, pinyin: 'gú', hanzi: '骨', meaning: 'bone' },
      { tone: 3, pinyin: 'gǔ', hanzi: '古', meaning: 'ancient' },
      { tone: 4, pinyin: 'gù', hanzi: '故', meaning: 'story / reason' }
    ]
  },
  ku: {
    tones: [
      { tone: 1, pinyin: 'kū', hanzi: '哭', meaning: 'to cry' },
      { tone: 2, pinyin: 'kú', hanzi: '苦', meaning: 'tone 2' },
      { tone: 3, pinyin: 'kǔ', hanzi: '苦', meaning: 'bitter / hard' },
      { tone: 4, pinyin: 'kù', hanzi: '裤', meaning: 'trousers / cool' }
    ]
  },
  hu: {
    tones: [
      { tone: 1, pinyin: 'hū', hanzi: '呼', meaning: 'call / exhale' },
      { tone: 2, pinyin: 'hú', hanzi: '湖', meaning: 'lake' },
      { tone: 3, pinyin: 'hǔ', hanzi: '虎', meaning: 'tiger' },
      { tone: 4, pinyin: 'hù', hanzi: '护', meaning: 'protect' }
    ]
  },
  zhu: {
    tones: [
      { tone: 1, pinyin: 'zhū', hanzi: '猪', meaning: 'pig' },
      { tone: 2, pinyin: 'zhú', hanzi: '竹', meaning: 'bamboo' },
      { tone: 3, pinyin: 'zhǔ', hanzi: '主', meaning: 'host / main' },
      { tone: 4, pinyin: 'zhù', hanzi: '住', meaning: 'to live / stay' }
    ]
  },
  chu: {
    tones: [
      { tone: 1, pinyin: 'chū', hanzi: '出', meaning: 'go out' },
      { tone: 2, pinyin: 'chú', hanzi: '厨', meaning: 'kitchen' },
      { tone: 3, pinyin: 'chǔ', hanzi: '楚', meaning: 'clear (qīngchu)' },
      { tone: 4, pinyin: 'chù', hanzi: '处', meaning: 'place' }
    ]
  },
  shu: {
    tones: [
      { tone: 1, pinyin: 'shū', hanzi: '书', meaning: 'book' },
      { tone: 2, pinyin: 'shú', hanzi: '熟', meaning: 'ripe / familiar' },
      { tone: 3, pinyin: 'shǔ', hanzi: '数', meaning: 'to count' },
      { tone: 4, pinyin: 'shù', hanzi: '树', meaning: 'tree / number' }
    ]
  },
  nü: {
    tones: [
      { tone: 1, pinyin: 'nǖ', hanzi: '女', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'nǘ', hanzi: '女', meaning: 'tone 2 drill' },
      { tone: 3, pinyin: 'nǚ', hanzi: '女', meaning: 'woman / female' },
      { tone: 4, pinyin: 'nǜ', hanzi: '恧', meaning: 'ashamed' }
    ]
  },
  lü: {
    tones: [
      { tone: 1, pinyin: 'lǖ', hanzi: '绿', meaning: 'tone 1 drill' },
      { tone: 2, pinyin: 'lǘ', hanzi: '驴', meaning: 'donkey' },
      { tone: 3, pinyin: 'lǚ', hanzi: '旅', meaning: 'travel (lǚyóu)' },
      { tone: 4, pinyin: 'lǜ', hanzi: '绿', meaning: 'green' }
    ]
  },
  ju: {
    tones: [
      { tone: 1, pinyin: 'jū', hanzi: '居', meaning: 'reside' },
      { tone: 2, pinyin: 'jú', hanzi: '橘', meaning: 'tangerine' },
      { tone: 3, pinyin: 'jǔ', hanzi: '举', meaning: 'to lift / raise' },
      { tone: 4, pinyin: 'jù', hanzi: '句', meaning: 'sentence' }
    ]
  },
  qu: {
    tones: [
      { tone: 1, pinyin: 'qū', hanzi: '区', meaning: 'district / area' },
      { tone: 2, pinyin: 'qú', hanzi: '渠', meaning: 'canal' },
      { tone: 3, pinyin: 'qǔ', hanzi: '取', meaning: 'fetch / song' },
      { tone: 4, pinyin: 'qù', hanzi: '去', meaning: 'to go' }
    ]
  },
  xu: {
    tones: [
      { tone: 1, pinyin: 'xū', hanzi: '需', meaning: 'to need' },
      { tone: 2, pinyin: 'xú', hanzi: '徐', meaning: 'slow / gentle' },
      { tone: 3, pinyin: 'xǔ', hanzi: '许', meaning: 'allow / perhaps' },
      { tone: 4, pinyin: 'xù', hanzi: '续', meaning: 'continue' }
    ]
  },
  yu: {
    tones: [
      { tone: 1, pinyin: 'yū', hanzi: '迂', meaning: 'winding' },
      { tone: 2, pinyin: 'yú', hanzi: '鱼', meaning: 'fish' },
      { tone: 3, pinyin: 'yǔ', hanzi: '雨', meaning: 'rain / language' },
      { tone: 4, pinyin: 'yù', hanzi: '玉', meaning: 'jade / meet' }
    ]
  },
  xue: {
    tones: [
      { tone: 1, pinyin: 'xuē', hanzi: '靴', meaning: 'boots' },
      { tone: 2, pinyin: 'xué', hanzi: '学', meaning: 'to study / learn' },
      { tone: 3, pinyin: 'xuě', hanzi: '雪', meaning: 'snow' },
      { tone: 4, pinyin: 'xuè', hanzi: '血', meaning: 'blood' }
    ]
  },
  tian: {
    tones: [
      { tone: 1, pinyin: 'tiān', hanzi: '天', meaning: 'sky / day' },
      { tone: 2, pinyin: 'tián', hanzi: '甜', meaning: 'sweet / field' },
      { tone: 3, pinyin: 'tiǎn', hanzi: '舔', meaning: 'to lick' },
      { tone: 4, pinyin: 'tiàn', hanzi: '掭', meaning: 'dip brush' }
    ]
  },
  jian: {
    tones: [
      { tone: 1, pinyin: 'jiān', hanzi: '间', meaning: 'room / between' },
      { tone: 2, pinyin: 'jián', hanzi: '前', meaning: 'front' },
      { tone: 3, pinyin: 'jiǎn', hanzi: '简', meaning: 'simple / cut' },
      { tone: 4, pinyin: 'jiàn', hanzi: '见', meaning: 'to see / meet' }
    ]
  },
  shui: {
    tones: [
      { tone: 1, pinyin: 'shuī', hanzi: '吹', meaning: 'blow' },
      { tone: 2, pinyin: 'shuí', hanzi: '谁', meaning: 'who' },
      { tone: 3, pinyin: 'shuǐ', hanzi: '水', meaning: 'water' },
      { tone: 4, pinyin: 'shuì', hanzi: '睡', meaning: 'to sleep' }
    ]
  },
  guo: {
    tones: [
      { tone: 1, pinyin: 'guō', hanzi: '锅', meaning: 'pot / wok' },
      { tone: 2, pinyin: 'guó', hanzi: '国', meaning: 'country / nation' },
      { tone: 3, pinyin: 'guǒ', hanzi: '果', meaning: 'fruit / result' },
      { tone: 4, pinyin: 'guò', hanzi: '过', meaning: 'to pass / cross' }
    ]
  },
  hao: {
    tones: [
      { tone: 1, pinyin: 'hāo', hanzi: '蒿', meaning: 'wormwood' },
      { tone: 2, pinyin: 'háo', hanzi: '毫', meaning: 'fine hair' },
      { tone: 3, pinyin: 'hǎo', hanzi: '好', meaning: 'good / well' },
      { tone: 4, pinyin: 'hào', hanzi: '号', meaning: 'number / date' }
    ]
  },
  zhong: {
    tones: [
      { tone: 1, pinyin: 'zhōng', hanzi: '中', meaning: 'middle / China' },
      { tone: 2, pinyin: 'zhóng', hanzi: '虫', meaning: 'insect' },
      { tone: 3, pinyin: 'zhǒng', hanzi: '种', meaning: 'seed / kind' },
      { tone: 4, pinyin: 'zhòng', hanzi: '重', meaning: 'heavy / important' }
    ]
  }
};

// Apply tone marks to any Pinyin syllable for Tones 1..4
const TONE_VOWEL_MAP = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
};

export function applyToneToSyllable(tonelessSyllable, toneNum = 1) {
  const idx = Math.max(0, Math.min(3, (Number(toneNum) || 1) - 1));
  const s = String(tonelessSyllable || '').toLowerCase();
  if (!s) return '';

  // Rule 1: 'a' or 'e' always takes the tone mark
  if (s.includes('a')) return s.replace('a', TONE_VOWEL_MAP.a[idx]);
  if (s.includes('e')) return s.replace('e', TONE_VOWEL_MAP.e[idx]);
  // Rule 2: 'ou' marks the 'o'
  if (s.includes('ou')) return s.replace('o', TONE_VOWEL_MAP.o[idx]);
  // Rule 3: Otherwise mark the last vowel in the syllable
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (TONE_VOWEL_MAP[ch]) {
      return s.slice(0, i) + TONE_VOWEL_MAP[ch][idx] + s.slice(i + 1);
    }
  }
  return s;
}

/**
 * Evaluate whether an Initial + Final combination is phonotactically valid in Standard Mandarin,
 * and return its orthographic Pinyin spelling, IPA transcription, phonotactic rule note, and 4 tones.
 */
export function combineInitialAndFinal(initialId, rawFinal) {
  const init = initialId === '∅' ? '' : initialId;
  const fin = rawFinal.replace(/\s*\(.*\)/, '').trim();

  // Phonotactic validation rules for Mandarin:
  // 1. Alveolopalatals (j, q, x) ONLY combine with i- and ü- finals!
  const isPalatal = ['j', 'q', 'x'].includes(init);
  const isIOrUmlautFinal =
    fin.startsWith('i') || fin.startsWith('ü');

  if (isPalatal && !isIOrUmlautFinal) {
    return {
      isValid: false,
      orthographicBase: `${init}+${fin}`,
      ipaBase: '—',
      phonotacticRule: `Phonotactic Constraint: Palatals (j, q, x) ONLY combine with high front vowels (i- and ü-). They never combine with "${fin}". Try j/q/x + i, ia, ie, iao, iu, ian, in, iang, ing, iong, ü, üe, üan, ün!`,
      tones: []
    };
  }

  // 2. Non-palatals (except n, l, and zero initial ∅) cannot combine with ü- finals
  if (fin.startsWith('ü') && !['∅', '', 'n', 'l', 'j', 'q', 'x'].includes(init)) {
    return {
      isValid: false,
      orthographicBase: `${init}+${fin}`,
      ipaBase: '—',
      phonotacticRule: `Phonotactic Constraint: Front rounded "${fin}" [y] only combines with Alveolopalatals (j, q, x), Alveolar liquids/nasals (n, l), or Zero Initial (yu-).`,
      tones: []
    };
  }

  // 3. Bilabials / Labiodental (b, p, m, f) do not combine with uo, ong, ia, ie, iang, iong, ua, uai, uan, un, uang
  if (['b', 'p', 'm', 'f'].includes(init)) {
    if (fin === 'e' && init !== 'm') {
      return {
        isValid: false,
        orthographicBase: `${init}+e`,
        ipaBase: '—',
        phonotacticRule: `Phonotactic Constraint: Labials (${init}) use final "o" [u̯ɔ] (${init}o) instead of unrounded "e" [ɤ] in Standard Mandarin.`,
        tones: []
      };
    }
    if (
      fin.startsWith('u') &&
      fin !== 'u'
    ) {
      return {
        isValid: false,
        orthographicBase: `${init}+${fin}`,
        ipaBase: '—',
        phonotacticRule: `Phonotactic Constraint: Labials (b, p, m, f) already use the lips, so they never take medial u- glides (${fin}). Only pure "-u" (${init}u) is valid.`,
        tones: []
      };
    }
    if (init === 'f' && (fin.startsWith('i') || fin === 'ai' || fin === 'ao' || fin === 'ang')) {
      return {
        isValid: false,
        orthographicBase: `f+${fin}`,
        ipaBase: '—',
        phonotacticRule: `Phonotactic Constraint: Labiodental "f" [f] never combines with palatal i- finals or "${fin}".`,
        tones: []
      };
    }
  }

  // 4. Velars (g, k, h), Retroflexes (zh, ch, sh, r), and Dental Sibilants (z, c, s) never combine with palatal i- (except apical 'i' for z/c/s/zh/ch/sh/r)
  if (['g', 'k', 'h', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(init)) {
    if (fin.startsWith('i') && !(fin === 'i' && ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(init))) {
      return {
        isValid: false,
        orthographicBase: `${init}+${fin}`,
        ipaBase: '—',
        phonotacticRule: `Phonotactic Constraint: "${init}" never combines with palatal medial i- finals ("${fin}"). Historically palatalized velars/sibilants merged into j, q, x!`,
        tones: []
      };
    }
  }

  // Compute orthographic Pinyin syllable
  let ortho = `${init}${fin}`;
  let spellingNote = 'Standard combination.';

  if (!init) {
    // Zero initial (y- / w-) spelling conventions
    if (fin === 'i') ortho = 'yi';
    else if (fin === 'in') ortho = 'yin';
    else if (fin === 'ing') ortho = 'ying';
    else if (fin.startsWith('i')) ortho = 'y' + fin.slice(1);
    else if (fin === 'u') ortho = 'wu';
    else if (fin.startsWith('u')) ortho = 'w' + fin.slice(1);
    else if (fin === 'ü') ortho = 'yu';
    else if (fin.startsWith('ü')) ortho = 'yu' + fin.slice(1);
    spellingNote = 'Zero initial (∅): Pinyin adds y- or w- orthographically when there is no initial consonant.';
  } else if (isPalatal && fin.startsWith('ü')) {
    ortho = init + 'u' + fin.slice(1);
    spellingNote = `Pinyin Orthography Rule: After ${init} (j, q, x), the umlaut dots on "${fin}" are dropped in writing ("${ortho}"), but the vowel is STILL pronounced front-rounded [y]!`;
  } else if (['n', 'l'].includes(init) && fin === 'ü') {
    ortho = `${init}ü`;
    spellingNote = `After "${init}", the two dots on "ü" MUST be kept to distinguish ${init}ǚ [y] from ${init}ǔ [u].`;
  }

  // Compute exact IPA base
  const initObj = SANDBOX_INITIALS.find((item) => item.id === (init || '∅'));
  const initIpa = initObj?.ipa || '';

  const finalIpaLookup = {
    a: 'ä',
    o: 'u̯ɔ',
    e: 'ɤ',
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
  const bankEntry = SYLLABLE_4_TONE_BANK[ortho] || SYLLABLE_4_TONE_BANK[`${init}${fin}`];

  // Fallback character generator for any valid syllable so Web Speech zh-CN speaks the right tone
  const tones = [1, 2, 3, 4].map((tNum, idx) => {
    const tonedPinyin = applyToneToSyllable(ortho, tNum);
    const fromBank = bankEntry?.tones?.[idx];
    return {
      tone: tNum,
      chaoNumber: ['55', '35', '214', '51'][idx],
      chaoContourLabel: ['1st (55 High Flat)', '2nd (35 Rising)', '3rd (214 Dipping)', '4th (51 Falling)'][idx],
      pinyin: fromBank?.pinyin || tonedPinyin,
      hanzi: fromBank?.hanzi || tonedPinyin,
      meaning: fromBank?.meaning || `Tone ${tNum} (${['55', '35', '214', '51'][idx]})`,
      ipa: `[${initIpa}${finIpa}${chaoLetters[idx]}]`
    };
  });

  return {
    isValid: true,
    orthographicBase: ortho,
    ipaBase,
    phonotacticRule: spellingNote,
    tones
  };
}
