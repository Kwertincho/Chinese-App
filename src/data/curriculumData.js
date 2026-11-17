// ============================================================================
// PLAYER LEVEL & TITLE RANKS (20-LEVEL PROGRESSIVE RPG CURVE)
// ============================================================================
export function xpNeededForNextLevel(level = 1) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  return 100 + (lv - 1) * 50;
}

export function computePlayerLevelProgress(totalXp = 0) {
  let remaining = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 1;
  let needed = xpNeededForNextLevel(level);

  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpNeededForNextLevel(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: needed,
    progressPercent: Math.min(100, Math.round((remaining / needed) * 100))
  };
}

export function getPlayerTitle(level = 1) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  switch (lv) {
    case 1:
      return 'Novice Initiate';
    case 2:
      return 'Brush Apprentice';
    case 3:
      return 'Ink Scribe';
    case 4:
      return 'Stroke Student';
    case 5:
      return 'Tone Disciple';
    case 6:
      return 'Paper Scholar';
    case 7:
      return 'Radical Seeker';
    case 8:
      return 'Junior Calligrapher';
    case 9:
      return 'Bamboo Chronicler';
    case 10:
      return 'Jade Adept';
    case 11:
      return 'Bronze Bell Keeper';
    case 12:
      return 'Pavilion Linguist';
    case 13:
      return 'Sandhi Tactician';
    case 14:
      return 'Imperial Archivist';
    case 15:
      return 'Senior Calligrapher';
    case 16:
      return 'Golden Brush Master';
    case 17:
      return 'Dragon Scholar';
    case 18:
      return "Jade Emperor's Scribe";
    case 19:
      return 'Celestial Sage';
    default:
      return 'Grandmaster of Hanzi';
  }
}

// ============================================================================
// CORE CURRICULUM DATA: DEFAULT COURSE UNIT 1 (ONLY 3 SAMPLE WORDS: 你好, 谢谢, 再见)
// ============================================================================
export const UNIT_1_WORDS = [
  {
    id: 'nihao',
    hanzi: '你好',
    chars: ['你', '好'],
    pinyin: 'nǐ hǎo',
    pinyinNum: 'ni3 hao3',
    pinyinNumeric: ['ni3 hao3', 'ni2 hao3', 'ni3hao3', 'ni2hao3'],
    pinyinToneless: 'ni hao',
    homophones: ['泥', '拟', '尼', '呢', '号', '好', '郝', '毫'],
    toneNote: '3rd tone + 3rd tone (spoken as 2nd + 3rd: ní hǎo)',
    meaning: 'Hello / How do you do',
    english: 'Hello / How do you do',
    literal: 'You (你) + Good (好)',
    strokeCount: 13,
    strokeBreakdown: '你 (7 strokes) + 好 (6 strokes)',
    example: '你好，很高兴认识你！ — Hello, nice to meet you!',
    exampleHanzi: '你好，很高兴认识你！',
    examplePinyin: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ!',
    exampleEnglish: 'Hello, nice to meet you!',
    usageTip: 'The universal Mandarin greeting used at any time of day.'
  },
  {
    id: 'xiexie',
    hanzi: '谢谢',
    chars: ['谢', '谢'],
    pinyin: 'xièxie',
    pinyinNum: 'xie4 xie5',
    pinyinNumeric: [
      'xie4xie',
      'xie4xie5',
      'xie4xie0',
      'xie4xie4',
      'xie4 xie',
      'xie4 xie5',
      'xie4 xie0',
      'xie4 xie4'
    ],
    pinyinToneless: 'xiexie',
    homophones: ['谢', '蟹', '泄', '卸', '械', '屑', '解', '写', '些'],
    toneNote: '4th tone + Neutral tone',
    meaning: 'Thank you / Thanks',
    english: 'Thank you / Thanks',
    literal: 'Thank (谢) + Thank (谢)',
    strokeCount: 24,
    strokeBreakdown: '谢 (12 strokes) + 谢 (12 strokes)',
    example: '谢谢你的帮助！ — Thank you for your help!',
    exampleHanzi: '谢谢你的帮助！',
    examplePinyin: 'Xièxie nǐ de bāngzhù!',
    exampleEnglish: 'Thank you for your help!',
    usageTip: 'Reduplicating the verb softens the tone and makes it polite and natural.'
  },
  {
    id: 'zaijian',
    hanzi: '再见',
    chars: ['再', '见'],
    pinyin: 'zàijiàn',
    pinyinNum: 'zai4 jian4',
    pinyinNumeric: ['zai4jian4', 'zai4 jian4'],
    pinyinToneless: 'zaijian',
    homophones: ['再', '在', '载', '宰', '见', '件', '健', '建', '剑', '间'],
    toneNote: '4th tone + 4th tone',
    meaning: 'Goodbye / See you again',
    english: 'Goodbye / See you again',
    literal: 'Again (再) + See (见)',
    strokeCount: 10,
    strokeBreakdown: '再 (6 strokes) + 见 (4 strokes)',
    example: '再见，明天见！ — Goodbye, see you tomorrow!',
    exampleHanzi: '再见，明天见！',
    examplePinyin: 'Zàijiàn, míngtiān jiàn!',
    exampleEnglish: 'Goodbye, see you tomorrow!',
    usageTip: 'Literally means "see you again" and works in both formal and casual settings.'
  }
];

export const DEFAULT_COURSES = [
  {
    id: 'course_default_unit1',
    courseName: 'Core Mandarin • Unit 1',
    sourceType: 'built-in',
    lessons: [
      {
        id: 'lesson_unit_1',
        title: 'Unit 1: Essential Greetings',
        words: UNIT_1_WORDS
      }
    ]
  }
];

export const DEFAULT_CUSTOM_DECKS = [
  {
    id: 'deck_custom_default',
    name: 'Custom Vocabulary',
    description: 'Personal vocabulary & phrases deck',
    words: [...UNIT_1_WORDS]
  }
];

export const SAMPLE_RAW_HSK_JSON = [
  {
    simplified: '你好',
    level: ['new-1', 'old-1'],
    forms: [
      {
        transcriptions: { pinyin: 'nǐ hǎo', numeric: 'ni3 hao3' },
        meanings: ['hello', 'hi', 'how do you do']
      }
    ]
  },
  {
    simplified: '谢谢',
    level: ['new-1', 'old-1'],
    forms: [
      {
        transcriptions: { pinyin: 'xièxie', numeric: 'xie4 xie5' },
        meanings: ['to thank', 'thanks', 'thank you']
      }
    ]
  },
  {
    simplified: '再见',
    level: ['new-1', 'old-1'],
    forms: [
      {
        transcriptions: { pinyin: 'zàijiàn', numeric: 'zai4 jian4' },
        meanings: ['goodbye', 'see you again']
      }
    ]
  },
  {
    simplified: '朋友',
    level: ['new-1', 'old-1'],
    forms: [
      {
        transcriptions: { pinyin: 'péngyou', numeric: 'peng2 you5' },
        meanings: ['friend', 'companion'],
        classifiers: ['个', '位']
      }
    ]
  },
  {
    simplified: '水',
    level: ['new-1', 'old-1'],
    forms: [
      {
        transcriptions: { pinyin: 'shuǐ', numeric: 'shui3' },
        meanings: ['water', 'liquid'],
        classifiers: ['杯', '瓶']
      }
    ]
  }
];

export const TONE_VOWEL_MAP = {
  ā: { base: 'a', tone: 1 },
  á: { base: 'a', tone: 2 },
  ǎ: { base: 'a', tone: 3 },
  à: { base: 'a', tone: 4 },
  ē: { base: 'e', tone: 1 },
  é: { base: 'e', tone: 2 },
  ě: { base: 'e', tone: 3 },
  è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 },
  í: { base: 'i', tone: 2 },
  ǐ: { base: 'i', tone: 3 },
  ì: { base: 'i', tone: 4 },
  ō: { base: 'o', tone: 1 },
  ó: { base: 'o', tone: 2 },
  ǒ: { base: 'o', tone: 3 },
  ò: { base: 'o', tone: 4 },
  ū: { base: 'u', tone: 1 },
  ú: { base: 'u', tone: 2 },
  ǔ: { base: 'u', tone: 3 },
  ù: { base: 'u', tone: 4 },
  ǖ: { base: 'ü', tone: 1 },
  ǘ: { base: 'ü', tone: 2 },
  ǚ: { base: 'ü', tone: 3 },
  ǜ: { base: 'ü', tone: 4 },
  ü: { base: 'ü', tone: 5 }
};

export const ADVANCED_MODE_UNLOCK_THRESHOLDS = {
  sentence_builder: 12,
  tone_sandhi_drill: 12,
  cloze: 25,
  blitz_match: 25,
  hsk_mock_exam: 40
};

export const MODALITY_META = {
  recognition: {
    label: 'Recognition',
    shortLabel: 'Recognition',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  meaning_mc: {
    label: 'Meaning Quiz',
    shortLabel: 'Meaning Quiz',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  writing: {
    label: 'Stroke Writing',
    shortLabel: 'Writing',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  listening: {
    label: 'Listening Dictation',
    shortLabel: 'Listening',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  speaking: {
    label: 'Oral Speaking',
    shortLabel: 'Speaking',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  sentence_builder: {
    label: 'Sentence Builder',
    shortLabel: 'Sentence',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  cloze: {
    label: 'Fill-in-the-Blank',
    shortLabel: 'Cloze',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  }
};

export const HETEROGENEOUS_PATTERNS = [
  {
    id: 'pattern_a',
    code: 'Pattern A',
    name: 'Foundational Split',
    tagline: 'Discovery → Progressive Calligraphy → Audio & Oral Mix → Unit Boss',
    stages: [
      {
        id: 1,
        title: 'Stage 1 • Discovery',
        shortTitle: '1. Discovery',
        subtitle: '3D Flippable Flashcards & Tone Contours',
        description: 'Explore Hanzi, Pinyin pitch contours, and context sentences.',
        iconName: 'Layers',
        accentColor: 'from-rose-500 to-red-600',
        nodeCategory: 'single',
        badgeText: 'Single-Skill • Cards',
        xpReward: 15,
        launchType: 'flashcards',
        allowedModalities: ['recognition']
      },
      {
        id: 2,
        title: 'Stage 2 • Calligraphy',
        shortTitle: '2. Calligraphy',
        subtitle: '3-Stage Progressive Stroke Order (Guided → Trace → Memory)',
        description: 'Master every character through Guided, Ghost Trace, and Blind Memory stages.',
        iconName: 'PenTool',
        accentColor: 'from-amber-500 to-orange-600',
        nodeCategory: 'single',
        badgeText: 'Single-Skill • 3-Stage Write',
        xpReward: 25,
        launchType: 'writing',
        allowedModalities: ['writing']
      },
      {
        id: 3,
        title: 'Stage 3 • Audio & Oral Mix',
        shortTitle: '3. Audio & Oral Mix',
        subtitle: 'Dynamic Listening Dictation + Speaking + Sentence Puzzle',
        description: 'Interleaves native listening dictation, oral pronunciation, and word order.',
        iconName: 'Headphones',
        accentColor: 'from-emerald-500 to-teal-600',
        nodeCategory: 'mix',
        badgeText: 'Multi-Skill Mix',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: ['listening', 'speaking', 'sentence_builder']
      },
      {
        id: 4,
        title: 'Stage 4 • Unit Boss',
        shortTitle: '4. Unit Boss',
        subtitle: 'Jade Dragon Guardian Battle (15s Timer • 3 Hearts)',
        description: 'Deplete the Boss HP bar before your 3 hearts or 15-second turn clock run out!',
        iconName: 'Trophy',
        accentColor: 'from-purple-600 to-indigo-700',
        nodeCategory: 'boss',
        badgeText: 'Boss Battle',
        xpReward: 45,
        launchType: 'boss',
        allowedModalities: ['recognition']
      }
    ]
  },
  {
    id: 'pattern_b',
    code: 'Pattern B',
    name: 'Ear-First Flow',
    tagline: 'Ear Training → Script & Meaning Mix → Oral Check → Unit Boss',
    stages: [
      {
        id: 1,
        title: 'Stage 1 • Ear Training',
        shortTitle: '1. Ear Training',
        subtitle: 'Native zh-CN Audio Dictation (Pinyin & Hanzi)',
        description: 'Train your ear first with 1.0x Normal and 0.5x Slow dictation.',
        iconName: 'Headphones',
        accentColor: 'from-emerald-500 to-teal-600',
        nodeCategory: 'single',
        badgeText: 'Single-Skill • Audio',
        xpReward: 15,
        launchType: 'dictation_only',
        allowedModalities: ['listening']
      },
      {
        id: 2,
        title: 'Stage 2 • Script & Meaning Mix',
        shortTitle: '2. Script & Meaning Mix',
        subtitle: 'Recognition + 3-Stage Stroke Writing + Sentence Builder',
        description: 'Dynamically mixes character recognition, 3-stage calligraphy, and sentence order.',
        iconName: 'Sparkles',
        accentColor: 'from-amber-500 to-rose-600',
        nodeCategory: 'mix',
        badgeText: '3-Skill Mix',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: ['recognition', 'writing', 'sentence_builder']
      },
      {
        id: 3,
        title: 'Stage 3 • Oral Check',
        shortTitle: '3. Oral Check',
        subtitle: 'Mandarin Speech Recognition & Tone Accuracy',
        description: 'Speak each word aloud in Mandarin for instant similarity scoring.',
        iconName: 'Mic',
        accentColor: 'from-sky-500 to-blue-600',
        nodeCategory: 'single',
        badgeText: 'Single-Skill • Voice',
        xpReward: 25,
        launchType: 'speaking_only',
        allowedModalities: ['speaking']
      },
      {
        id: 4,
        title: 'Stage 4 • Unit Boss',
        shortTitle: '4. Unit Boss',
        subtitle: 'Jade Dragon Guardian Battle (15s Timer • 3 Hearts)',
        description: 'Defeat the Unit Boss under time pressure to master this unit!',
        iconName: 'Trophy',
        accentColor: 'from-purple-600 to-indigo-700',
        nodeCategory: 'boss',
        badgeText: 'Boss Battle',
        xpReward: 45,
        launchType: 'boss',
        allowedModalities: ['recognition']
      }
    ]
  },
  {
    id: 'pattern_c',
    code: 'Pattern C',
    name: 'Interleaved Gauntlet',
    tagline: 'Recognition & Voice Mix → Writing & Dictation Mix → Full Gauntlet → Boss',
    stages: [
      {
        id: 1,
        title: 'Stage 1 • Recognition & Voice Mix',
        shortTitle: '1. Recog & Voice Mix',
        subtitle: 'Interleaved Flashcard Checks & Speaking Prompts',
        description: 'Alternates between visual meaning checks and spoken pronunciation.',
        iconName: 'Sparkles',
        accentColor: 'from-rose-500 to-sky-600',
        nodeCategory: 'mix',
        badgeText: '2-Skill Mix',
        xpReward: 15,
        launchType: 'mixed',
        allowedModalities: ['recognition', 'speaking']
      },
      {
        id: 2,
        title: 'Stage 2 • Writing & Dictation Mix',
        shortTitle: '2. Write & Dictation Mix',
        subtitle: '3-Stage Calligraphy + Pinyin/Hanzi Audio Dictation',
        description: 'Pairs 3-stage character stroke writing with audio transcription.',
        iconName: 'PenTool',
        accentColor: 'from-amber-500 to-emerald-600',
        nodeCategory: 'mix',
        badgeText: '2-Skill Mix',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: ['writing', 'listening']
      },
      {
        id: 3,
        title: 'Stage 3 • Full-Skill Gauntlet',
        shortTitle: '3. Full-Skill Gauntlet',
        subtitle: 'All 5 Modalities Randomized Across Words',
        description: 'Unpredictable gauntlet combining Recognition, Writing, Listening, Speaking & Sentences!',
        iconName: 'Flame',
        accentColor: 'from-fuchsia-600 to-rose-600',
        nodeCategory: 'gauntlet',
        badgeText: '5-Skill Gauntlet',
        xpReward: 25,
        launchType: 'mixed',
        allowedModalities: [
          'recognition',
          'writing',
          'listening',
          'speaking',
          'sentence_builder'
        ]
      },
      {
        id: 4,
        title: 'Stage 4 • Unit Boss',
        shortTitle: '4. Unit Boss',
        subtitle: 'Jade Dragon Guardian Battle (15s Timer • 3 Hearts)',
        description: 'Prove complete unit mastery against the Jade Dragon Guardian!',
        iconName: 'Trophy',
        accentColor: 'from-purple-600 to-indigo-700',
        nodeCategory: 'boss',
        badgeText: 'Boss Battle',
        xpReward: 45,
        launchType: 'boss',
        allowedModalities: ['recognition']
      }
    ]
  }
];

export const HANZI_WRITER_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';

export const KNOWN_CHARACTER_INFO = {
  你: { pinyin: 'nǐ', meaning: 'you (singular)', radical: '亻 (Person, 2 strokes)' },
  好: { pinyin: 'hǎo', meaning: 'good / well / fine', radical: '女 (Woman, 3 strokes)' },
  谢: { pinyin: 'xiè', meaning: 'to thank / apologize', radical: '讠 (Speech, 2 strokes)' },
  再: { pinyin: 'zài', meaning: 'again / once more', radical: '冂 (Borders, 2 strokes)' },
  见: { pinyin: 'jiàn', meaning: 'to see / meet', radical: '见 (See, 4 strokes)' },
  朋: { pinyin: 'péng', meaning: 'friend / peer', radical: '月 (Moon/Flesh, 4 strokes)' },
  友: { pinyin: 'yǒu', meaning: 'friend / companion', radical: '又 (Again/Hand, 2 strokes)' },
  学: { pinyin: 'xué', meaning: 'to study / learn', radical: '子 (Child, 3 strokes)' },
  习: { pinyin: 'xí', meaning: 'to practice / review', radical: '习 (Wings/Practice, 3 strokes)' },
  水: { pinyin: 'shuǐ', meaning: 'water / liquid', radical: '水 (Water, 4 strokes)' },
  茶: { pinyin: 'chá', meaning: 'tea / tea plant', radical: '艹 (Grass/Plant, 3 strokes)' },
  十: { pinyin: 'shí', meaning: 'ten / complete', radical: '十 (Ten, 2 strokes)' },
  工: { pinyin: 'gōng', meaning: 'work / labor', radical: '工 (Work, 3 strokes)' },
  干: { pinyin: 'gān', meaning: 'dry / stem / to do', radical: '干 (Dry, 3 strokes)' },
  王: { pinyin: 'wáng', meaning: 'king / monarch', radical: '王 (Jade/King, 4 strokes)' },
  人: { pinyin: 'rén', meaning: 'person / human', radical: '人 (Person, 2 strokes)' },
  八: { pinyin: 'bā', meaning: 'eight', radical: '八 (Eight, 2 strokes)' },
  入: { pinyin: 'rù', meaning: 'to enter / join', radical: '入 (Enter, 2 strokes)' },
  木: { pinyin: 'mù', meaning: 'tree / wood', radical: '木 (Wood/Tree, 4 strokes)' },
  文: { pinyin: 'wén', meaning: 'language / culture / script', radical: '文 (Script, 4 strokes)' },
  三: { pinyin: 'sān', meaning: 'three', radical: '一 (One, 1 stroke)' },
  早: { pinyin: 'zǎo', meaning: 'early / morning', radical: '日 (Sun/Time, 4 strokes)' },
  立: { pinyin: 'lì', meaning: 'to stand / establish', radical: '立 (Stand, 5 strokes)' },
  的: { pinyin: 'de', meaning: 'possessive / structural particle', radical: '白 (White, 5 strokes)' },
  明: { pinyin: 'míng', meaning: 'bright / clear / tomorrow', radical: '日 (Sun/Time, 4 strokes)' },
  林: { pinyin: 'lín', meaning: 'forest / woods', radical: '木 (Wood/Tree, 4 strokes)' },
  休: { pinyin: 'xiū', meaning: 'to rest / stop', radical: '亻 (Person, 2 strokes)' },
  月: { pinyin: 'yuè', meaning: 'moon / month', radical: '月 (Moon/Body, 4 strokes)' },
  同: { pinyin: 'tóng', meaning: 'same / together', radical: '口 (Mouth/Enclosure, 3 strokes)' },
  问: { pinyin: 'wèn', meaning: 'to ask / inquire', radical: '门 (Door/Gate, 3 strokes)' },
  风: { pinyin: 'fēng', meaning: 'wind / style', radical: '风 (Wind, 4 strokes)' },
  日: { pinyin: 'rì', meaning: 'sun / day / time', radical: '日 (Sun, 4 strokes)' },
  国: { pinyin: 'guó', meaning: 'country / nation', radical: '囗 (Enclosure, 3 strokes)' },
  回: { pinyin: 'huí', meaning: 'to return / reply', radical: '囗 (Enclosure, 3 strokes)' },
  田: { pinyin: 'tián', meaning: 'field / farmland', radical: '田 (Field, 5 strokes)' },
  小: { pinyin: 'xiǎo', meaning: 'small / little', radical: '小 (Small, 3 strokes)' },
  办: { pinyin: 'bàn', meaning: 'to handle / manage', radical: '力 (Strength, 2 strokes)' },
  永: { pinyin: 'yǒng', meaning: 'forever / eternity (Eight Principles of Yong)', radical: '水 (Water, 4 strokes)' },
  主: { pinyin: 'zhǔ', meaning: 'main / host / master', radical: '丶 (Dot, 1 stroke)' },
  门: { pinyin: 'mén', meaning: 'door / gate', radical: '门 (Gate, 3 strokes)' },
  广: { pinyin: 'guǎng', meaning: 'wide / vast / broad', radical: '广 (Cliff/Shelter, 3 strokes)' },
  方: { pinyin: 'fāng', meaning: 'square / direction / place', radical: '方 (Square, 4 strokes)' },
  我: { pinyin: 'wǒ', meaning: 'I / me', radical: '戈 (Halberd, 4 strokes)' },
  书: { pinyin: 'shū', meaning: 'book / letter / script', radical: '乛 (Hook, 1 stroke)' },
  犬: { pinyin: 'quǎn', meaning: 'dog / canine', radical: '犬 (Dog, 4 strokes)' },
  瓦: { pinyin: 'wǎ', meaning: 'roof tile / earthenware', radical: '瓦 (Tile, 4 strokes)' },
  这: { pinyin: 'zhè', meaning: 'this / here', radical: '辶 (Walk, 3 strokes)' },
  远: { pinyin: 'yuǎn', meaning: 'far / distant', radical: '辶 (Walk, 3 strokes)' },
  送: { pinyin: 'sòng', meaning: 'to send / deliver / see off', radical: '辶 (Walk, 3 strokes)' },
  进: { pinyin: 'jìn', meaning: 'to enter / advance', radical: '辶 (Walk, 3 strokes)' },
  厅: { pinyin: 'tīng', meaning: 'hall / lounge', radical: '厂 (Cliff, 2 strokes)' },
  床: { pinyin: 'chuáng', meaning: 'bed / couch', radical: '广 (Shelter, 3 strokes)' },
  病: { pinyin: 'bìng', meaning: 'illness / sick', radical: '疒 (Sickness, 5 strokes)' },
  尾: { pinyin: 'wěi', meaning: 'tail / end', radical: '尸 (Corpse/Body, 3 strokes)' },
  山: { pinyin: 'shān', meaning: 'mountain / hill', radical: '山 (Mountain, 3 strokes)' },
  医: { pinyin: 'yī', meaning: 'medicine / doctor', radical: '匚 (Box, 2 strokes)' },
  画: { pinyin: 'huà', meaning: 'painting / picture / stroke', radical: '田 (Field, 5 strokes)' },
  区: { pinyin: 'qū', meaning: 'area / district / region', radical: '匚 (Box, 2 strokes)' },
  中: { pinyin: 'zhōng', meaning: 'middle / center / China', radical: '丨 (Line, 1 stroke)' },
  车: { pinyin: 'chē', meaning: 'car / vehicle / wheel', radical: '车 (Cart, 4 strokes)' },
  半: { pinyin: 'bàn', meaning: 'half / semi-', radical: '十 (Ten, 2 strokes)' },
  平: { pinyin: 'píng', meaning: 'flat / level / peaceful', radical: '干 (Dry/Shield, 3 strokes)' },
  女: { pinyin: 'nǚ', meaning: 'woman / female', radical: '女 (Woman, 3 strokes)' },
  子: { pinyin: 'zǐ', meaning: 'child / son / seed', radical: '子 (Child, 3 strokes)' },
  母: { pinyin: 'mǔ', meaning: 'mother / female elder', radical: '毋 (Do not, 4 strokes)' },
  舟: { pinyin: 'zhōu', meaning: 'boat / vessel', radical: '舟 (Boat, 6 strokes)' }
};

export const SEMANTIC_RADICALS_25 = [
  {
    id: 'rad_kou',
    radical: '口',
    variants: ['口'],
    pinyinName: 'kǒuzìpáng',
    meaning: 'mouth / speech / eating / call',
    commonChars: ['口', '叫', '吃', '喝', '吗', '呢', '吧', '听', '唱', '号', '同', '名', '问', '回', '国', '喜', '欢', '和', '哥', '哪', '喂', '咖啡'],
    exampleChars: [
      { char: '吃', pinyin: 'chī', meaning: 'to eat' },
      { char: '喝', pinyin: 'hē', meaning: 'to drink' },
      { char: '吗', pinyin: 'ma', meaning: 'question particle' }
    ]
  },
  {
    id: 'rad_ren',
    radical: '亻',
    variants: ['亻', '人'],
    pinyinName: 'dānrénpáng',
    meaning: 'person / human actions & states',
    commonChars: ['你', '他', '们', '作', '住', '休', '什', '件', '位', '体', '信', '借', '做', '像', '便', '假', '人', '今', '会'],
    exampleChars: [
      { char: '你', pinyin: 'nǐ', meaning: 'you' },
      { char: '他', pinyin: 'tā', meaning: 'he / him' },
      { char: '休', pinyin: 'xiū', meaning: 'to rest' }
    ]
  },
  {
    id: 'rad_yan',
    radical: '讠',
    variants: ['讠', '言'],
    pinyinName: 'yánzìpáng',
    meaning: 'speech / language / communication',
    commonChars: ['谢', '说', '话', '语', '读', '请', '认', '识', '谁', '课', '讲', '诉', '词', '试', '让', '记', '讨', '论'],
    exampleChars: [
      { char: '谢', pinyin: 'xiè', meaning: 'to thank' },
      { char: '说', pinyin: 'shuō', meaning: 'to speak' },
      { char: '请', pinyin: 'qǐng', meaning: 'please / invite' }
    ]
  },
  {
    id: 'rad_nv',
    radical: '女',
    variants: ['女'],
    pinyinName: 'nǚzìpáng',
    meaning: 'woman / female / family relations',
    commonChars: ['好', '她', '妈', '姐', '妹', '女', '姓', '奶', '妻', '姨', '始', '如', '婚'],
    exampleChars: [
      { char: '好', pinyin: 'hǎo', meaning: 'good / well' },
      { char: '妈', pinyin: 'mā', meaning: 'mother' },
      { char: '姐', pinyin: 'jiě', meaning: 'older sister' }
    ]
  },
  {
    id: 'rad_mu_tree',
    radical: '木',
    variants: ['木'],
    pinyinName: 'mùzìpáng',
    meaning: 'wood / tree / wooden objects',
    commonChars: ['木', '本', '机', '杯', '桌', '椅', '果', '树', '林', '森', '校', '楼', '样', '条', '来', '极', '桥'],
    exampleChars: [
      { char: '木', pinyin: 'mù', meaning: 'tree / wood' },
      { char: '林', pinyin: 'lín', meaning: 'forest' },
      { char: '杯', pinyin: 'bēi', meaning: 'cup' }
    ]
  },
  {
    id: 'rad_ri',
    radical: '日',
    variants: ['日'],
    pinyinName: 'rìzìpáng',
    meaning: 'sun / time / day / brightness',
    commonChars: ['日', '明', '早', '是', '时', '星', '期', '晚', '昨', '晴', '暖', '春', '景'],
    exampleChars: [
      { char: '日', pinyin: 'rì', meaning: 'sun / day' },
      { char: '明', pinyin: 'míng', meaning: 'bright / tomorrow' },
      { char: '早', pinyin: 'zǎo', meaning: 'early / morning' }
    ]
  },
  {
    id: 'rad_shui',
    radical: '氵',
    variants: ['氵', '水'],
    pinyinName: 'sāndiǎnshuǐ',
    meaning: 'water / liquid / flowing',
    commonChars: ['水', '汉', '没', '洗', '泳', '河', '海', '湖', '汤', '渴', '满', '清', '汽', '法', '活', '流', '泪', '注'],
    exampleChars: [
      { char: '水', pinyin: 'shuǐ', meaning: 'water' },
      { char: '汉', pinyin: 'hàn', meaning: 'Han / Chinese' },
      { char: '没', pinyin: 'méi', meaning: 'not have' }
    ]
  },
  {
    id: 'rad_cao',
    radical: '艹',
    variants: ['艹'],
    pinyinName: 'cǎozìtóu',
    meaning: 'grass / plants / herbs / flowers',
    commonChars: ['茶', '菜', '花', '草', '苹', '药', '蓝', '节', '英', '苦', '落', '葡萄'],
    exampleChars: [
      { char: '茶', pinyin: 'chá', meaning: 'tea' },
      { char: '花', pinyin: 'huā', meaning: 'flower' },
      { char: '菜', pinyin: 'cài', meaning: 'vegetable / dish' }
    ]
  },
  {
    id: 'rad_shou',
    radical: '扌',
    variants: ['扌', '手'],
    pinyinName: 'tíshǒupáng',
    meaning: 'hand / physical action / motion',
    commonChars: ['打', '找', '把', '拿', '接', '换', '推', '拉', '搬', '指', '排', '提', '握', '手'],
    exampleChars: [
      { char: '打', pinyin: 'dǎ', meaning: 'to hit / play / call' },
      { char: '找', pinyin: 'zhǎo', meaning: 'to look for' },
      { char: '拿', pinyin: 'ná', meaning: 'to hold / take' }
    ]
  },
  {
    id: 'rad_xin',
    radical: '心/忄',
    variants: ['心', '忄'],
    pinyinName: 'shùxīnpáng / xīnzìdǐ',
    meaning: 'heart / mind / emotion / thought',
    commonChars: ['心', '想', '忙', '快', '慢', '您', '思', '意', '忘', '怕', '懂', '情', '感', '急', '怪'],
    exampleChars: [
      { char: '想', pinyin: 'xiǎng', meaning: 'to think / want' },
      { char: '忙', pinyin: 'máng', meaning: 'busy' },
      { char: '快', pinyin: 'kuài', meaning: 'fast / happy' }
    ]
  },
  {
    id: 'rad_chuo',
    radical: '辶',
    variants: ['辶'],
    pinyinName: 'zǒuzhīpáng',
    meaning: 'movement / walking / distance',
    commonChars: ['这', '那', '进', '远', '近', '送', '还', '过', '边', '道', '选', '通', '连', '迎', '追'],
    exampleChars: [
      { char: '这', pinyin: 'zhè', meaning: 'this' },
      { char: '远', pinyin: 'yuǎn', meaning: 'far' },
      { char: '进', pinyin: 'jìn', meaning: 'to enter' }
    ]
  },
  {
    id: 'rad_mian',
    radical: '宀',
    variants: ['宀'],
    pinyinName: 'bǎogàitóu',
    meaning: 'roof / house / shelter / indoor',
    commonChars: ['家', '字', '安', '完', '客', '室', '定', '宜', '宝', '实', '宿', '寒'],
    exampleChars: [
      { char: '家', pinyin: 'jiā', meaning: 'home / family' },
      { char: '字', pinyin: 'zì', meaning: 'character / word' },
      { char: '安', pinyin: 'ān', meaning: 'peaceful / safe' }
    ]
  },
  {
    id: 'rad_shi',
    radical: '饣',
    variants: ['饣', '食'],
    pinyinName: 'shízìpáng',
    meaning: 'food / eating / nourishment',
    commonChars: ['饭', '饿', '饱', '馆', '饺', '饼', '饮', '食', '餐'],
    exampleChars: [
      { char: '饭', pinyin: 'fàn', meaning: 'meal / cooked rice' },
      { char: '饿', pinyin: 'è', meaning: 'hungry' },
      { char: '馆', pinyin: 'guǎn', meaning: 'restaurant / hall' }
    ]
  },
  {
    id: 'rad_bei',
    radical: '贝',
    variants: ['贝'],
    pinyinName: 'bèizìpáng',
    meaning: 'shell / wealth / money / trade',
    commonChars: ['贝', '贵', '买', '卖', '赛', '贺', '费', '赚', '货', '贫'],
    exampleChars: [
      { char: '贵', pinyin: 'guì', meaning: 'expensive / noble' },
      { char: '买', pinyin: 'mǎi', meaning: 'to buy' },
      { char: '贝', pinyin: 'bèi', meaning: 'shell / treasure' }
    ]
  },
  {
    id: 'rad_men',
    radical: '门',
    variants: ['门'],
    pinyinName: 'ménzìkuàng',
    meaning: 'door / gate / enclosure',
    commonChars: ['门', '问', '间', '闻', '闲', '闹', '闭', '闪'],
    exampleChars: [
      { char: '门', pinyin: 'mén', meaning: 'door / gate' },
      { char: '问', pinyin: 'wèn', meaning: 'to ask' },
      { char: '间', pinyin: 'jiān', meaning: 'room / between' }
    ]
  },
  {
    id: 'rad_quan',
    radical: '犭',
    variants: ['犭', '犬'],
    pinyinName: 'fǎnquǎnpáng',
    meaning: 'animal / four-legged mammal',
    commonChars: ['狗', '猫', '猪', '猴', '狮', '狼', '猜', '独'],
    exampleChars: [
      { char: '狗', pinyin: 'gǒu', meaning: 'dog' },
      { char: '猫', pinyin: 'māo', meaning: 'cat' },
      { char: '猜', pinyin: 'cāi', meaning: 'to guess' }
    ]
  },
  {
    id: 'rad_yue',
    radical: '月',
    variants: ['月'],
    pinyinName: 'yuèzìpáng',
    meaning: 'moon / month / body & flesh',
    commonChars: ['月', '朋', '有', '服', '胖', '脚', '腿', '脸', '脑', '肚', '背', '期'],
    exampleChars: [
      { char: '月', pinyin: 'yuè', meaning: 'moon / month' },
      { char: '朋', pinyin: 'péng', meaning: 'friend' },
      { char: '有', pinyin: 'yǒu', meaning: 'to have' }
    ]
  },
  {
    id: 'rad_tu',
    radical: '土',
    variants: ['土'],
    pinyinName: 'tǔzìpáng',
    meaning: 'earth / land / ground / place',
    commonChars: ['土', '地', '在', '坐', '块', '场', '城', '坏', '墙', '圾'],
    exampleChars: [
      { char: '地', pinyin: 'dì', meaning: 'earth / ground' },
      { char: '在', pinyin: 'zài', meaning: 'at / in / exist' },
      { char: '坐', pinyin: 'zuò', meaning: 'to sit' }
    ]
  },
  {
    id: 'rad_shan',
    radical: '山',
    variants: ['山'],
    pinyinName: 'shānzìpáng',
    meaning: 'mountain / hill / peak',
    commonChars: ['山', '岁', '岛', '岸', '峰'],
    exampleChars: [
      { char: '山', pinyin: 'shān', meaning: 'mountain' },
      { char: '岁', pinyin: 'suì', meaning: 'years of age' }
    ]
  },
  {
    id: 'rad_mu_eye',
    radical: '目',
    variants: ['目'],
    pinyinName: 'mùzìpáng',
    meaning: 'eye / vision / looking',
    commonChars: ['目', '看', '睡', '眼', '睛', '着', '省', '眉'],
    exampleChars: [
      { char: '看', pinyin: 'kàn', meaning: 'to look / watch' },
      { char: '睡', pinyin: 'shuì', meaning: 'to sleep' },
      { char: '眼', pinyin: 'yǎn', meaning: 'eye' }
    ]
  },
  {
    id: 'rad_zu',
    radical: '足',
    variants: ['足', '⻊'],
    pinyinName: 'zúzìpáng',
    meaning: 'foot / running / jumping',
    commonChars: ['足', '跑', '跳', '踢', '路', '跟', '跌'],
    exampleChars: [
      { char: '跑', pinyin: 'pǎo', meaning: 'to run' },
      { char: '路', pinyin: 'lù', meaning: 'road / way' },
      { char: '足', pinyin: 'zú', meaning: 'foot / enough' }
    ]
  },
  {
    id: 'rad_che',
    radical: '车',
    variants: ['车'],
    pinyinName: 'chēzìpáng',
    meaning: 'vehicle / wheeled transport',
    commonChars: ['车', '轻', '辆', '较', '转', '输', '软'],
    exampleChars: [
      { char: '车', pinyin: 'chē', meaning: 'vehicle / car' },
      { char: '轻', pinyin: 'qīng', meaning: 'lightweight' }
    ]
  },
  {
    id: 'rad_yu',
    radical: '雨',
    variants: ['雨'],
    pinyinName: 'yǔzìtóu',
    meaning: 'rain / weather / clouds / snow',
    commonChars: ['雨', '雪', '零', '雷', '雾', '需'],
    exampleChars: [
      { char: '雨', pinyin: 'yǔ', meaning: 'rain' },
      { char: '雪', pinyin: 'xuě', meaning: 'snow' },
      { char: '零', pinyin: 'líng', meaning: 'zero' }
    ]
  },
  {
    id: 'rad_zhu',
    radical: '竹',
    variants: ['竹', '⺮'],
    pinyinName: 'zhúzìtóu',
    meaning: 'bamboo / writing & household tools',
    commonChars: ['竹', '笑', '第', '笔', '答', '算', '篮', '筷', '箱', '简'],
    exampleChars: [
      { char: '笑', pinyin: 'xiào', meaning: 'to smile / laugh' },
      { char: '笔', pinyin: 'bǐ', meaning: 'pen / brush' },
      { char: '第', pinyin: 'dì', meaning: 'ordinal prefix' }
    ]
  },
  {
    id: 'rad_si',
    radical: '纟',
    variants: ['纟', '糸'],
    pinyinName: 'jiǎosīpáng',
    meaning: 'silk / thread / fabric / connection',
    commonChars: ['红', '绿', '纸', '给', '经', '练', '级', '绍', '结', '细', '线', '累'],
    exampleChars: [
      { char: '红', pinyin: 'hóng', meaning: 'red' },
      { char: '给', pinyin: 'gěi', meaning: 'to give / for' },
      { char: '经', pinyin: 'jīng', meaning: 'pass through / classic' }
    ]
  }
];

export const STROKE_ORDER_RULES_7 = [
  {
    id: 'rule_1',
    number: 1,
    title: 'Horizontal before Vertical',
    chineseRule: '先横后竖',
    pinyinRule: 'xiān héng hòu shù',
    explanation:
      'When a horizontal stroke (一) and a vertical stroke (丨) cross, write the horizontal stroke first, then the vertical stroke.',
    learnedChars: [
      { char: '十', pinyin: 'shí', meaning: 'ten' },
      { char: '工', pinyin: 'gōng', meaning: 'work' }
    ],
    unseenChars: [
      { char: '干', pinyin: 'gān', meaning: 'dry / stem' },
      { char: '王', pinyin: 'wáng', meaning: 'king' }
    ]
  },
  {
    id: 'rule_2',
    number: 2,
    title: 'Left-falling before Right-falling',
    chineseRule: '先撇后捺',
    pinyinRule: 'xiān piě hòu nà',
    explanation:
      'For symmetrical sweeping strokes, write the left-falling stroke (丿 piě) first, followed by the right-falling stroke (㇏ nà).',
    learnedChars: [
      { char: '人', pinyin: 'rén', meaning: 'person' },
      { char: '八', pinyin: 'bā', meaning: 'eight' }
    ],
    unseenChars: [
      { char: '入', pinyin: 'rù', meaning: 'to enter' },
      { char: '木', pinyin: 'mù', meaning: 'tree / wood' }
    ]
  },
  {
    id: 'rule_3',
    number: 3,
    title: 'Top to Bottom',
    chineseRule: '从上到下',
    pinyinRule: 'cóng shàng dào xià',
    explanation:
      'Stacked components and horizontal layers are always written starting from the highest element down to the lowest element.',
    learnedChars: [
      { char: '文', pinyin: 'wén', meaning: 'language / script' },
      { char: '三', pinyin: 'sān', meaning: 'three' }
    ],
    unseenChars: [
      { char: '早', pinyin: 'zǎo', meaning: 'early / morning' },
      { char: '立', pinyin: 'lì', meaning: 'to stand' }
    ]
  },
  {
    id: 'rule_4',
    number: 4,
    title: 'Left to Right',
    chineseRule: '从左到右',
    pinyinRule: 'cóng zuǒ dào yòu',
    explanation:
      'In side-by-side compound characters, complete the left-hand radical or component before writing the right-hand side.',
    learnedChars: [
      { char: '的', pinyin: 'de', meaning: 'possessive particle' },
      { char: '明', pinyin: 'míng', meaning: 'bright / tomorrow' }
    ],
    unseenChars: [
      { char: '林', pinyin: 'lín', meaning: 'forest / woods' },
      { char: '休', pinyin: 'xiū', meaning: 'to rest' }
    ]
  },
  {
    id: 'rule_5',
    number: 5,
    title: 'Outside before Inside',
    chineseRule: '先外后里',
    pinyinRule: 'xiān wài hòu lǐ',
    explanation:
      'For partially enclosed characters (open on the bottom or right), write the outer frame first, then fill in the inner strokes.',
    learnedChars: [
      { char: '月', pinyin: 'yuè', meaning: 'moon / month' },
      { char: '同', pinyin: 'tóng', meaning: 'same / together' }
    ],
    unseenChars: [
      { char: '问', pinyin: 'wèn', meaning: 'to ask' },
      { char: '风', pinyin: 'fēng', meaning: 'wind' }
    ]
  },
  {
    id: 'rule_6',
    number: 6,
    title: 'Outside, Inside, then Close',
    chineseRule: '先外后里，再封口',
    pinyinRule: 'xiān wài hòu lǐ, zài fēngkǒu',
    explanation:
      'For full four-sided enclosures, draw the outer frame (left, top, right), fill the interior completely, and seal the bottom stroke last.',
    learnedChars: [
      { char: '日', pinyin: 'rì', meaning: 'sun / day' },
      { char: '国', pinyin: 'guó', meaning: 'country / nation' }
    ],
    unseenChars: [
      { char: '回', pinyin: 'huí', meaning: 'to return' },
      { char: '田', pinyin: 'tián', meaning: 'field' }
    ]
  },
  {
    id: 'rule_7',
    number: 7,
    title: 'Middle First, then Two Sides',
    chineseRule: '先中间后两边',
    pinyinRule: 'xiān zhōngjiān hòu liǎngbiān',
    explanation:
      'When a character has a dominant central vertical spine flanked by symmetrical left and right strokes, write the center first, then left, then right.',
    learnedChars: [
      { char: '水', pinyin: 'shuǐ', meaning: 'water' },
      { char: '小', pinyin: 'xiǎo', meaning: 'small' }
    ],
    unseenChars: [
      { char: '办', pinyin: 'bàn', meaning: 'to handle / do' },
      { char: '永', pinyin: 'yǒng', meaning: 'forever / eternity' }
    ]
  },
  {
    id: 'rule_8',
    number: 8,
    title: 'Top or Upper-Left Dot First',
    chineseRule: '点在上边或左上先写',
    pinyinRule: 'diǎn zài shàngbiān huò zuǒshàng xiān xiě',
    explanation:
      'When a dot stroke (丶) sits at the very top center or upper-left corner of a character, write the dot first before the rest of the frame.',
    learnedChars: [
      { char: '主', pinyin: 'zhǔ', meaning: 'main / host' },
      { char: '门', pinyin: 'mén', meaning: 'door / gate' }
    ],
    unseenChars: [
      { char: '广', pinyin: 'guǎng', meaning: 'wide / vast' },
      { char: '方', pinyin: 'fāng', meaning: 'square / direction' }
    ]
  },
  {
    id: 'rule_9',
    number: 9,
    title: 'Upper-Right or Inner Dot Last',
    chineseRule: '点在右上或里边后写',
    pinyinRule: 'diǎn zài yòushàng huò lǐbiān hòu xiě',
    explanation:
      'When a dot stroke (丶) is located at the upper-right corner or inside an enclosure, write that dot as the final finishing stroke.',
    learnedChars: [
      { char: '我', pinyin: 'wǒ', meaning: 'I / me' },
      { char: '书', pinyin: 'shū', meaning: 'book' }
    ],
    unseenChars: [
      { char: '犬', pinyin: 'quǎn', meaning: 'dog / canine' },
      { char: '瓦', pinyin: 'wǎ', meaning: 'roof tile' }
    ]
  },
  {
    id: 'rule_10',
    number: 10,
    title: 'Bottom-Left Enclosure (辶 / 廴) Written Last',
    chineseRule: '走之旁、建之旁最后写',
    pinyinRule: 'zǒuzhīpáng, jiànzhīpáng zuìhòu xiě',
    explanation:
      'For characters with the walking radical (辶) or stretching radical (廴), complete the inner upper-right component first, and write the sweeping bottom-left radical last.',
    learnedChars: [
      { char: '这', pinyin: 'zhè', meaning: 'this' },
      { char: '远', pinyin: 'yuǎn', meaning: 'far / distant' }
    ],
    unseenChars: [
      { char: '送', pinyin: 'sòng', meaning: 'to send / deliver' },
      { char: '进', pinyin: 'jìn', meaning: 'to enter' }
    ]
  },
  {
    id: 'rule_11',
    number: 11,
    title: 'Top-Left Semi-Enclosure (厂, 广, 尸, 疒) Outside First',
    chineseRule: '左上包右下，先外后里',
    pinyinRule: 'zuǒshàng bāo yòuxià, xiān wài hòu lǐ',
    explanation:
      'When an enclosure wraps the top and left sides (like 厂, 广, 尸, or 疒), write the outer top-left radical first before filling the bottom-right interior.',
    learnedChars: [
      { char: '厅', pinyin: 'tīng', meaning: 'hall / lounge' },
      { char: '床', pinyin: 'chuáng', meaning: 'bed' }
    ],
    unseenChars: [
      { char: '病', pinyin: 'bìng', meaning: 'illness / sick' },
      { char: '尾', pinyin: 'wěi', meaning: 'tail / end' }
    ]
  },
  {
    id: 'rule_12',
    number: 12,
    title: 'Bottom-Up / Left-Bottom Enclosure (山, 画, 医) Inside First',
    chineseRule: '下包上、左下包右上',
    pinyinRule: 'xià bāo shàng, zuǒxià bāo yòushàng',
    explanation:
      'For open-top bottom enclosures (凵) or three-sided left enclosures (匚), write the inner or upper strokes before closing the outer bottom/left-bottom frame.',
    learnedChars: [
      { char: '山', pinyin: 'shān', meaning: 'mountain' },
      { char: '医', pinyin: 'yī', meaning: 'medicine / doctor' }
    ],
    unseenChars: [
      { char: '画', pinyin: 'huà', meaning: 'painting / draw' },
      { char: '区', pinyin: 'qū', meaning: 'district / area' }
    ]
  },
  {
    id: 'rule_13',
    number: 13,
    title: 'Piercing Vertical Spine Written Last',
    chineseRule: '中竖贯通最后写',
    pinyinRule: 'zhōng shù guàntōng zuìhòu xiě',
    explanation:
      'When a central vertical stroke pierces completely through horizontal strokes or an enclosure from top to bottom, write the piercing vertical spine last.',
    learnedChars: [
      { char: '中', pinyin: 'zhōng', meaning: 'middle / center' },
      { char: '车', pinyin: 'chē', meaning: 'vehicle / car' }
    ],
    unseenChars: [
      { char: '半', pinyin: 'bàn', meaning: 'half' },
      { char: '平', pinyin: 'píng', meaning: 'flat / peaceful' }
    ]
  },
  {
    id: 'rule_14',
    number: 14,
    title: 'Crossing Base Horizontal Written Last',
    chineseRule: '横画贯通最后写',
    pinyinRule: 'héng huà guàntōng zuìhòu xiě',
    explanation:
      'When a long horizontal stroke crosses across the body or base of a character to anchor its balance, write that crossing horizontal stroke last.',
    learnedChars: [
      { char: '女', pinyin: 'nǚ', meaning: 'woman / female' },
      { char: '子', pinyin: 'zǐ', meaning: 'child / son' }
    ],
    unseenChars: [
      { char: '母', pinyin: 'mǔ', meaning: 'mother' },
      { char: '舟', pinyin: 'zhōu', meaning: 'boat' }
    ]
  }
];

export const STROKE_ORDER_RULES_14 = STROKE_ORDER_RULES_7;

export const WRITING_MASTERY_STAGES = [
  {
    stage: 1,
    shortLabel: '1. Guided',
    title: 'Stage 1 — Guided Stroke-by-Stroke',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
    showOutline: true,
    showHintAfterMisses: 1,
    autoHighlightNextStroke: true,
    instruction: 'Follow the flashing stroke guide step-by-step (hint after 1 miss).'
  },
  {
    stage: 2,
    shortLabel: '2. Trace',
    title: 'Stage 2 — Ghost Outline Trace',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    showOutline: true,
    showHintAfterMisses: 2,
    autoHighlightNextStroke: false,
    instruction: 'Trace the full character guided only by the gray ghost silhouette (hint after 2 misses).'
  },
  {
    stage: 3,
    shortLabel: '3. Memory',
    title: 'Stage 3 — Blind Memory Freehand',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    showOutline: false,
    showHintAfterMisses: 3,
    autoHighlightNextStroke: false,
    instruction: 'Blank 米字格 grid! Write from memory recall (hint after 3 consecutive misses).'
  }
];

export const STORAGE_KEY_PROGRESS = 'macalaoshi_mandarin_progress_v5';
export const STORAGE_KEY_COURSES = 'macalaoshi_mandarin_courses_v4';
export const STORAGE_KEY_DECKS = 'macalaoshi_mandarin_decks_v4';

export const INITIAL_PROGRESS_STATE = {
  xp: 0,
  playerLevel: 1,
  streak: 0,
  dailyXp: 0,
  dailyXpEarned: 0,
  lastStudyDate: null,
  dailyXpDate: null,
  dailyGoalXp: 30,
  totalStudySeconds: 0,
  dailyStudySeconds: {
    date: null,
    seconds: 0
  },
  dailyQuests: {
    date: null,
    completedIds: [],
    claimedIds: []
  },
  wordNotes: {},
  unlockedStage: 1,
  completedStages: [],
  completedStrokeRules: [],
  lessonProgress: {},
  mastery: {
    nihao: 0,
    你好: 0,
    xiexie: 0,
    谢谢: 0,
    zaijian: 0,
    再见: 0
  },
  skillTelemetry: {},
  preferredSpeed: 1.0,
  isSlowMode: false,
  soundMuted: false,
  stats: {
    writingStagesCompleted: 0,
    perfectBossWins: 0,
    highestCombo: 0
  }
};
