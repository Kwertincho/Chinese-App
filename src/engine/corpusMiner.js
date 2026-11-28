// ============================================================================
// PHASE 5A: OFFLINE PRE-TOKENIZED BILINGUAL CORPUS & i+0 / i+1 MINER
// 100% Client-Side, $0 Cost, Offline-Ready (Zero External APIs)
// ============================================================================

const BASE_FUNCTION_WORDS_AT_10 = ['我', '你', '他', '她', '的', '了', '吗', '呢', '吧'];

const HIGH_VALUE_CLOZE_PARTICLES = new Set([
  '了',
  '的',
  '在',
  '没',
  '没有',
  '都',
  '也',
  '过',
  '正在',
  '吗',
  '呢',
  '吧',
  '很',
  '不'
]);

const COMMON_CLASSIFIERS = new Set([
  '个',
  '本',
  '杯',
  '块',
  '岁',
  '件',
  '辆',
  '张',
  '只',
  '些',
  '次',
  '点',
  '位',
  '条',
  '家'
]);

const COMMON_MODALS = new Set(['想', '会', '要', '能', '可以', '应该', '必须']);

const TRANSLATION_DISTRACTOR_POOL = ['不', '没', '了', '的', '在', '吗', '很', '也', '都', '过'];

const COMMON_TOKEN_META = {
  我: { pos: 'pron', pinyin: 'wǒ', meaning: 'I / me' },
  你: { pos: 'pron', pinyin: 'nǐ', meaning: 'you' },
  您: { pos: 'pron', pinyin: 'nín', meaning: 'you (polite)' },
  他: { pos: 'pron', pinyin: 'tā', meaning: 'he / him' },
  她: { pos: 'pron', pinyin: 'tā', meaning: 'she / her' },
  我们: { pos: 'pron', pinyin: 'wǒmen', meaning: 'we / us' },
  你们: { pos: 'pron', pinyin: 'nǐmen', meaning: 'you (plural)' },
  他们: { pos: 'pron', pinyin: 'tāmen', meaning: 'they / them' },
  这: { pos: 'pron', pinyin: 'zhè', meaning: 'this' },
  那: { pos: 'pron', pinyin: 'nà', meaning: 'that' },
  谁: { pos: 'pron', pinyin: 'shéi', meaning: 'who' },
  什么: { pos: 'pron', pinyin: 'shénme', meaning: 'what' },
  哪儿: { pos: 'place', pinyin: 'nǎr', meaning: 'where' },
  哪里: { pos: 'place', pinyin: 'nǎlǐ', meaning: 'where' },
  的: { pos: 'particle', pinyin: 'de', meaning: 'possessive particle' },
  了: { pos: 'particle', pinyin: 'le', meaning: 'aspect particle' },
  吗: { pos: 'particle', pinyin: 'ma', meaning: 'question particle' },
  呢: { pos: 'particle', pinyin: 'ne', meaning: 'question particle' },
  吧: { pos: 'particle', pinyin: 'ba', meaning: 'suggestion particle' },
  过: { pos: 'particle', pinyin: 'guò', meaning: 'experiential particle' },
  在: { pos: 'prep', pinyin: 'zài', meaning: 'at / in' },
  正在: { pos: 'adv', pinyin: 'zhèngzài', meaning: 'in progress' },
  不: { pos: 'adv', pinyin: 'bù', meaning: 'not' },
  没: { pos: 'adv', pinyin: 'méi', meaning: 'not (past / have)' },
  没有: { pos: 'verb', pinyin: 'méiyǒu', meaning: 'do not have / did not' },
  都: { pos: 'adv', pinyin: 'dōu', meaning: 'all / both' },
  也: { pos: 'adv', pinyin: 'yě', meaning: 'also / too' },
  很: { pos: 'adv', pinyin: 'hěn', meaning: 'very' },
  太: { pos: 'adv', pinyin: 'tài', meaning: 'too / extremely' },
  真: { pos: 'adv', pinyin: 'zhēn', meaning: 'really' },
  想: { pos: 'modal', pinyin: 'xiǎng', meaning: 'want to / would like to' },
  会: { pos: 'modal', pinyin: 'huì', meaning: 'can / know how to' },
  要: { pos: 'modal', pinyin: 'yào', meaning: 'want / will' },
  能: { pos: 'modal', pinyin: 'néng', meaning: 'can / be able to' },
  可以: { pos: 'modal', pinyin: 'kěyǐ', meaning: 'may / can' },
  个: { pos: 'classifier', pinyin: 'gè', meaning: 'general measure word' },
  本: { pos: 'classifier', pinyin: 'běn', meaning: 'measure word for books' },
  杯: { pos: 'classifier', pinyin: 'bēi', meaning: 'cup / glass' },
  块: { pos: 'classifier', pinyin: 'kuài', meaning: 'piece / yuan' },
  岁: { pos: 'classifier', pinyin: 'suì', meaning: 'years old' },
  件: { pos: 'classifier', pinyin: 'jiàn', meaning: 'measure word for clothing' },
  些: { pos: 'classifier', pinyin: 'xiē', meaning: 'some' },
  次: { pos: 'classifier', pinyin: 'cì', meaning: 'time (occurrence)' }
};

const TOPIC_DISPLAY_TITLES = {
  greetings: 'Greetings & Politeness',
  introductions: 'Meeting & Introductions',
  family: 'Family & Home',
  time_dates: 'Time & Schedule',
  food_drinks: 'Food & Drinks',
  shopping: 'Shopping & Prices',
  weather: 'Weather & Seasons',
  health: 'Health & Wellness',
  school_work: 'School & Work',
  travel: 'Travel & Getting Around'
};

// ============================================================================
// 1. BUILT-IN STARTER BILINGUAL CORPUS (60 NATURAL PRE-TOKENIZED HSK 1-2 SENTENCES)
// ============================================================================
export const STARTER_BILINGUAL_CORPUS = [
  // --- GREETINGS (6) ---
  {
    id: 'corp_greet_01',
    hanzi: '你好，很高兴认识你。',
    pinyin: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ.',
    english: 'Hello, very happy to meet you.',
    tokens: ['你好', '很', '高兴', '认识', '你'],
    hskLevel: 1,
    topic: 'greetings'
  },
  {
    id: 'corp_greet_02',
    hanzi: '谢谢你的帮助。',
    pinyin: 'Xièxie nǐ de bāngzhù.',
    english: 'Thank you for your help.',
    tokens: ['谢谢', '你', '的', '帮助'],
    hskLevel: 2,
    topic: 'greetings'
  },
  {
    id: 'corp_greet_03',
    hanzi: '不客气，我们是好朋友。',
    pinyin: 'Bú kèqi, wǒmen shì hǎo péngyou.',
    english: 'You are welcome, we are good friends.',
    tokens: ['不客气', '我们', '是', '好', '朋友'],
    hskLevel: 1,
    topic: 'greetings'
  },
  {
    id: 'corp_greet_04',
    hanzi: '对不起，我来晚了。',
    pinyin: 'Duìbuqǐ, wǒ lái wǎn le.',
    english: 'I am sorry, I arrived late.',
    tokens: ['对不起', '我', '来', '晚', '了'],
    hskLevel: 2,
    topic: 'greetings'
  },
  {
    id: 'corp_greet_05',
    hanzi: '没关系，请坐吧。',
    pinyin: 'Méi guānxi, qǐng zuò ba.',
    english: 'No problem, please have a seat.',
    tokens: ['没关系', '请', '坐', '吧'],
    hskLevel: 1,
    topic: 'greetings'
  },
  {
    id: 'corp_greet_06',
    hanzi: '明天见，再见！',
    pinyin: 'Míngtiān jiàn, zàijiàn!',
    english: 'See you tomorrow, goodbye!',
    tokens: ['明天', '见', '再见'],
    hskLevel: 1,
    topic: 'greetings'
  },

  // --- INTRODUCTIONS (6) ---
  {
    id: 'corp_intro_01',
    hanzi: '我是学生，我学习汉语。',
    pinyin: 'Wǒ shì xuésheng, wǒ xuéxí Hànyǔ.',
    english: 'I am a student, and I study Mandarin.',
    tokens: ['我', '是', '学生', '我', '学习', '汉语'],
    hskLevel: 1,
    topic: 'introductions'
  },
  {
    id: 'corp_intro_02',
    hanzi: '请问，你叫什么名字？',
    pinyin: 'Qǐngwèn, nǐ jiào shénme míngzi?',
    english: 'Excuse me, what is your name?',
    tokens: ['请问', '你', '叫', '什么', '名字'],
    hskLevel: 1,
    topic: 'introductions'
  },
  {
    id: 'corp_intro_03',
    hanzi: '她是我的汉语老师。',
    pinyin: 'Tā shì wǒ de Hànyǔ lǎoshī.',
    english: 'She is my Chinese teacher.',
    tokens: ['她', '是', '我', '的', '汉语', '老师'],
    hskLevel: 1,
    topic: 'introductions'
  },
  {
    id: 'corp_intro_04',
    hanzi: '你是哪国人？',
    pinyin: 'Nǐ shì nǎ guó rén?',
    english: 'Which country are you from?',
    tokens: ['你', '是', '哪', '国', '人'],
    hskLevel: 1,
    topic: 'introductions'
  },
  {
    id: 'corp_intro_05',
    hanzi: '他会说一点儿汉语。',
    pinyin: 'Tā huì shuō yìdiǎnr Hànyǔ.',
    english: 'He can speak a little Chinese.',
    tokens: ['他', '会', '说', '一点儿', '汉语'],
    hskLevel: 1,
    topic: 'introductions'
  },
  {
    id: 'corp_intro_06',
    hanzi: '我的朋友住在北京。',
    pinyin: 'Wǒ de péngyou zhù zài Běijīng.',
    english: 'My friend lives in Beijing.',
    tokens: ['我', '的', '朋友', '住', '在', '北京'],
    hskLevel: 1,
    topic: 'introductions'
  },

  // --- FAMILY (6) ---
  {
    id: 'corp_fam_01',
    hanzi: '我家有四口人。',
    pinyin: 'Wǒ jiā yǒu sì kǒu rén.',
    english: 'There are four people in my family.',
    tokens: ['我', '家', '有', '四', '口', '人'],
    hskLevel: 1,
    topic: 'family'
  },
  {
    id: 'corp_fam_02',
    hanzi: '我爸爸是医生，我妈妈是老师。',
    pinyin: 'Wǒ bàba shì yīshēng, wǒ māma shì lǎoshī.',
    english: 'My dad is a doctor, and my mom is a teacher.',
    tokens: ['我', '爸爸', '是', '医生', '我', '妈妈', '是', '老师'],
    hskLevel: 1,
    topic: 'family'
  },
  {
    id: 'corp_fam_03',
    hanzi: '我没有哥哥，但是有一个妹妹。',
    pinyin: 'Wǒ méiyǒu gēge, dànshì yǒu yí gè mèimei.',
    english: 'I do not have an older brother, but I have a younger sister.',
    tokens: ['我', '没有', '哥哥', '但是', '有', '一', '个', '妹妹'],
    hskLevel: 2,
    topic: 'family'
  },
  {
    id: 'corp_fam_04',
    hanzi: '他女儿今年五岁了。',
    pinyin: 'Tā nǚér jīnnián wǔ suì le.',
    english: 'His daughter is five years old this year.',
    tokens: ['他', '女儿', '今年', '五', '岁', '了'],
    hskLevel: 1,
    topic: 'family'
  },
  {
    id: 'corp_fam_05',
    hanzi: '妈妈在家里做饭。',
    pinyin: 'Māma zài jiā lǐ zuòfàn.',
    english: 'Mom is cooking at home.',
    tokens: ['妈妈', '在', '家', '里', '做饭'],
    hskLevel: 1,
    topic: 'family'
  },
  {
    id: 'corp_fam_06',
    hanzi: '我们一家人都很喜欢小猫。',
    pinyin: 'Wǒmen yì jiā rén dōu hěn xǐhuan xiǎo māo.',
    english: 'Everyone in our family likes kittens very much.',
    tokens: ['我们', '一', '家', '人', '都', '很', '喜欢', '小', '猫'],
    hskLevel: 1,
    topic: 'family'
  },

  // --- TIME & DATES (6) ---
  {
    id: 'corp_time_01',
    hanzi: '现在几点了？',
    pinyin: 'Xiànzài jǐ diǎn le?',
    english: 'What time is it right now?',
    tokens: ['现在', '几', '点', '了'],
    hskLevel: 1,
    topic: 'time_dates'
  },
  {
    id: 'corp_time_02',
    hanzi: '今天是星期三。',
    pinyin: 'Jīntiān shì Xīngqīsān.',
    english: 'Today is Wednesday.',
    tokens: ['今天', '是', '星期', '三'],
    hskLevel: 1,
    topic: 'time_dates'
  },
  {
    id: 'corp_time_03',
    hanzi: '我每天早上七点起床。',
    pinyin: 'Wǒ měitiān zǎoshang qī diǎn qǐchuáng.',
    english: 'I get up at seven every morning.',
    tokens: ['我', '每天', '早上', '七', '点', '起床'],
    hskLevel: 2,
    topic: 'time_dates'
  },
  {
    id: 'corp_time_04',
    hanzi: '昨天晚上我十点睡觉了。',
    pinyin: 'Zuótiān wǎnshang wǒ shí diǎn shuìjiào le.',
    english: 'Last night I went to sleep at ten o clock.',
    tokens: ['昨天', '晚上', '我', '十', '点', '睡觉', '了'],
    hskLevel: 1,
    topic: 'time_dates'
  },
  {
    id: 'corp_time_05',
    hanzi: '明天下午我有汉语课。',
    pinyin: 'Míngtiān xiàwǔ wǒ yǒu Hànyǔ kè.',
    english: 'Tomorrow afternoon I have a Chinese class.',
    tokens: ['明天', '下午', '我', '有', '汉语', '课'],
    hskLevel: 2,
    topic: 'time_dates'
  },
  {
    id: 'corp_time_06',
    hanzi: '你什么时候回家？',
    pinyin: 'Nǐ shénme shíhou huí jiā?',
    english: 'When are you going home?',
    tokens: ['你', '什么', '时候', '回', '家'],
    hskLevel: 1,
    topic: 'time_dates'
  },

  // --- FOOD & DRINKS (6) ---
  {
    id: 'corp_food_01',
    hanzi: '我想喝一杯热茶。',
    pinyin: 'Wǒ xiǎng hē yì bēi rè chá.',
    english: 'I would like to drink a cup of hot tea.',
    tokens: ['我', '想', '喝', '一', '杯', '热', '茶'],
    hskLevel: 1,
    topic: 'food_drinks'
  },
  {
    id: 'corp_food_02',
    hanzi: '你想吃米饭还是面条？',
    pinyin: 'Nǐ xiǎng chī mǐfàn háishi miàntiáo?',
    english: 'Do you want to eat rice or noodles?',
    tokens: ['你', '想', '吃', '米饭', '还是', '面条'],
    hskLevel: 2,
    topic: 'food_drinks'
  },
  {
    id: 'corp_food_03',
    hanzi: '这个饭馆的中国菜很好吃。',
    pinyin: 'Zhège fànguǎn de Zhōngguó cài hěn hǎochī.',
    english: 'The Chinese food at this restaurant is very delicious.',
    tokens: ['这', '个', '饭馆', '的', '中国', '菜', '很', '好吃'],
    hskLevel: 2,
    topic: 'food_drinks'
  },
  {
    id: 'corp_food_04',
    hanzi: '请给我一杯水，谢谢。',
    pinyin: 'Qǐng gěi wǒ yì bēi shuǐ, xièxie.',
    english: 'Please give me a glass of water, thank you.',
    tokens: ['请', '给', '我', '一', '杯', '水', '谢谢'],
    hskLevel: 1,
    topic: 'food_drinks'
  },
  {
    id: 'corp_food_05',
    hanzi: '我早上吃了两个苹果。',
    pinyin: 'Wǒ zǎoshang chī le liǎng gè píngguǒ.',
    english: 'I ate two apples in the morning.',
    tokens: ['我', '早上', '吃', '了', '两', '个', '苹果'],
    hskLevel: 1,
    topic: 'food_drinks'
  },
  {
    id: 'corp_food_06',
    hanzi: '他不喝咖啡，他喜欢喝茶。',
    pinyin: 'Tā bù hē kāfēi, tā xǐhuan hē chá.',
    english: 'He does not drink coffee; he likes drinking tea.',
    tokens: ['他', '不', '喝', '咖啡', '他', '喜欢', '喝', '茶'],
    hskLevel: 2,
    topic: 'food_drinks'
  },

  // --- SHOPPING (6) ---
  {
    id: 'corp_shop_01',
    hanzi: '这个苹果多少钱？',
    pinyin: 'Zhège píngguǒ duōshao qián?',
    english: 'How much does this apple cost?',
    tokens: ['这', '个', '苹果', '多少', '钱'],
    hskLevel: 1,
    topic: 'shopping'
  },
  {
    id: 'corp_shop_02',
    hanzi: '那件衣服太贵了。',
    pinyin: 'Nà jiàn yīfu tài guì le.',
    english: 'That piece of clothing is too expensive.',
    tokens: ['那', '件', '衣服', '太', '贵', '了'],
    hskLevel: 2,
    topic: 'shopping'
  },
  {
    id: 'corp_shop_03',
    hanzi: '可以便宜一点儿吗？',
    pinyin: 'Kěyǐ piányi yìdiǎnr ma?',
    english: 'Can it be a little cheaper?',
    tokens: ['可以', '便宜', '一点儿', '吗'],
    hskLevel: 2,
    topic: 'shopping'
  },
  {
    id: 'corp_shop_04',
    hanzi: '我昨天买了一本新书。',
    pinyin: 'Wǒ zuótiān mǎi le yì běn xīn shū.',
    english: 'Yesterday I bought a new book.',
    tokens: ['我', '昨天', '买', '了', '一', '本', '新', '书'],
    hskLevel: 1,
    topic: 'shopping'
  },
  {
    id: 'corp_shop_05',
    hanzi: '她想去商店买一些水果。',
    pinyin: 'Tā xiǎng qù shāngdiàn mǎi yìxiē shuǐguǒ.',
    english: 'She wants to go to the store to buy some fruit.',
    tokens: ['她', '想', '去', '商店', '买', '一些', '水果'],
    hskLevel: 1,
    topic: 'shopping'
  },
  {
    id: 'corp_shop_06',
    hanzi: '这些东西都很便宜。',
    pinyin: 'Zhèxiē dōngxi dōu hěn piányi.',
    english: 'All of these things are very cheap.',
    tokens: ['这些', '东西', '都', '很', '便宜'],
    hskLevel: 2,
    topic: 'shopping'
  },

  // --- WEATHER (6) ---
  {
    id: 'corp_weath_01',
    hanzi: '今天天气怎么样？',
    pinyin: 'Jīntiān tiānqì zěnmeyàng?',
    english: 'How is the weather today?',
    tokens: ['今天', '天气', '怎么样'],
    hskLevel: 1,
    topic: 'weather'
  },
  {
    id: 'corp_weath_02',
    hanzi: '今天很热，我想喝水。',
    pinyin: 'Jīntiān hěn rè, wǒ xiǎng hē shuǐ.',
    english: 'Today is very hot, I want to drink water.',
    tokens: ['今天', '很', '热', '我', '想', '喝', '水'],
    hskLevel: 1,
    topic: 'weather'
  },
  {
    id: 'corp_weath_03',
    hanzi: '外面正在下雨呢。',
    pinyin: 'Wàimiàn zhèngzài xiàyǔ ne.',
    english: 'It is raining outside right now.',
    tokens: ['外面', '正在', '下雨', '呢'],
    hskLevel: 2,
    topic: 'weather'
  },
  {
    id: 'corp_weath_04',
    hanzi: '明天不会下雨，天气很好。',
    pinyin: 'Míngtiān bú huì xiàyǔ, tiānqì hěn hǎo.',
    english: 'It will not rain tomorrow, the weather will be very nice.',
    tokens: ['明天', '不', '会', '下雨', '天气', '很', '好'],
    hskLevel: 1,
    topic: 'weather'
  },
  {
    id: 'corp_weath_05',
    hanzi: '北京的冬天非常冷。',
    pinyin: 'Běijīng de dōngtiān fēicháng lěng.',
    english: 'Winter in Beijing is extremely cold.',
    tokens: ['北京', '的', '冬天', '非常', '冷'],
    hskLevel: 2,
    topic: 'weather'
  },
  {
    id: 'corp_weath_06',
    hanzi: '天太冷了，多穿一点儿衣服。',
    pinyin: 'Tiān tài lěng le, duō chuān yìdiǎnr yīfu.',
    english: 'It is too cold, put on a bit more clothing.',
    tokens: ['天', '太', '冷', '了', '多', '穿', '一点儿', '衣服'],
    hskLevel: 2,
    topic: 'weather'
  },

  // --- HEALTH (6) ---
  {
    id: 'corp_hlth_01',
    hanzi: '你身体怎么样？',
    pinyin: 'Nǐ shēntǐ zěnmeyàng?',
    english: 'How is your health?',
    tokens: ['你', '身体', '怎么样'],
    hskLevel: 2,
    topic: 'health'
  },
  {
    id: 'corp_hlth_02',
    hanzi: '他生病了，今天去医院看医生。',
    pinyin: 'Tā shēngbìng le, jīntiān qù yīyuàn kàn yīshēng.',
    english: 'He got sick and is going to the hospital to see a doctor today.',
    tokens: ['他', '生病', '了', '今天', '去', '医院', '看', '医生'],
    hskLevel: 2,
    topic: 'health'
  },
  {
    id: 'corp_hlth_03',
    hanzi: '医生让我多喝热水，多休息。',
    pinyin: 'Yīshēng ràng wǒ duō hē rè shuǐ, duō xiūxi.',
    english: 'The doctor told me to drink more hot water and rest more.',
    tokens: ['医生', '让', '我', '多', '喝', '热', '水', '多', '休息'],
    hskLevel: 2,
    topic: 'health'
  },
  {
    id: 'corp_hlth_04',
    hanzi: '我今天有点儿累，想早点儿睡觉。',
    pinyin: 'Wǒ jīntiān yǒudiǎnr lèi, xiǎng zǎo diǎnr shuìjiào.',
    english: 'I am a little tired today and want to go to sleep early.',
    tokens: ['我', '今天', '有点儿', '累', '想', '早', '点儿', '睡觉'],
    hskLevel: 2,
    topic: 'health'
  },
  {
    id: 'corp_hlth_05',
    hanzi: '她每天早上都跑步。',
    pinyin: 'Tā měitiān zǎoshang dōu pǎobù.',
    english: 'She goes jogging every morning.',
    tokens: ['她', '每天', '早上', '都', '跑步'],
    hskLevel: 2,
    topic: 'health'
  },
  {
    id: 'corp_hlth_06',
    hanzi: '吃了药以后，我好多了。',
    pinyin: 'Chī le yào yǐhòu, wǒ hǎo duō le.',
    english: 'After taking the medicine, I feel much better.',
    tokens: ['吃', '了', '药', '以后', '我', '好', '多', '了'],
    hskLevel: 2,
    topic: 'health'
  },

  // --- SCHOOL & WORK (6) ---
  {
    id: 'corp_work_01',
    hanzi: '我在学校学习汉语。',
    pinyin: 'Wǒ zài xuéxiào xuéxí Hànyǔ.',
    english: 'I study Chinese at school.',
    tokens: ['我', '在', '学校', '学习', '汉语'],
    hskLevel: 1,
    topic: 'school_work'
  },
  {
    id: 'corp_work_02',
    hanzi: '他正在房间里看书。',
    pinyin: 'Tā zhèngzài fángjiān lǐ kànshū.',
    english: 'He is reading a book in the room right now.',
    tokens: ['他', '正在', '房间', '里', '看书'],
    hskLevel: 2,
    topic: 'school_work'
  },
  {
    id: 'corp_work_03',
    hanzi: '我喜欢写汉字，也喜欢听音乐。',
    pinyin: 'Wǒ xǐhuan xiě Hànzì, yě xǐhuan tīng yīnyuè.',
    english: 'I like writing Chinese characters and also like listening to music.',
    tokens: ['我', '喜欢', '写', '汉字', '也', '喜欢', '听', '音乐'],
    hskLevel: 2,
    topic: 'school_work'
  },
  {
    id: 'corp_work_04',
    hanzi: '老师问了我们一个问题。',
    pinyin: 'Lǎoshī wèn le wǒmen yí gè wèntí.',
    english: 'The teacher asked us a question.',
    tokens: ['老师', '问', '了', '我们', '一', '个', '问题'],
    hskLevel: 2,
    topic: 'school_work'
  },
  {
    id: 'corp_work_05',
    hanzi: '爸爸在公司工作，他非常忙。',
    pinyin: 'Bàba zài gōngsī gōngzuò, tā fēicháng máng.',
    english: 'Dad works at a company, and he is very busy.',
    tokens: ['爸爸', '在', '公司', '工作', '他', '非常', '忙'],
    hskLevel: 2,
    topic: 'school_work'
  },
  {
    id: 'corp_work_06',
    hanzi: '明天有考试，我要准备一下。',
    pinyin: 'Míngtiān yǒu kǎoshì, wǒ yào zhǔnbèi yíxià.',
    english: 'There is an exam tomorrow, so I need to prepare a bit.',
    tokens: ['明天', '有', '考试', '我', '要', '准备', '一下'],
    hskLevel: 2,
    topic: 'school_work'
  },

  // --- TRAVEL (6) ---
  {
    id: 'corp_trav_01',
    hanzi: '我明天坐飞机去北京。',
    pinyin: 'Wǒ míngtiān zuò fēijī qù Běijīng.',
    english: 'I am taking a plane to Beijing tomorrow.',
    tokens: ['我', '明天', '坐', '飞机', '去', '北京'],
    hskLevel: 1,
    topic: 'travel'
  },
  {
    id: 'corp_trav_02',
    hanzi: '请问，火车站在哪儿？',
    pinyin: 'Qǐngwèn, huǒchēzhàn zài nǎr?',
    english: 'Excuse me, where is the train station?',
    tokens: ['请问', '火车站', '在', '哪儿'],
    hskLevel: 1,
    topic: 'travel'
  },
  {
    id: 'corp_trav_03',
    hanzi: '我们坐出租车去机场吧。',
    pinyin: 'Wǒmen zuò chūzūchē qù jīchǎng ba.',
    english: 'Let us take a taxi to the airport.',
    tokens: ['我们', '坐', '出租车', '去', '机场', '吧'],
    hskLevel: 2,
    topic: 'travel'
  },
  {
    id: 'corp_trav_04',
    hanzi: '我去过中国，非常喜欢那里。',
    pinyin: 'Wǒ qù guo Zhōngguó, fēicháng xǐhuan nàlǐ.',
    english: 'I have been to China and like it there very much.',
    tokens: ['我', '去', '过', '中国', '非常', '喜欢', '那里'],
    hskLevel: 2,
    topic: 'travel'
  },
  {
    id: 'corp_trav_05',
    hanzi: '从这里到学校走路要十分钟。',
    pinyin: 'Cóng zhèlǐ dào xuéxiào zǒulù yào shí fēnzhōng.',
    english: 'Walking from here to school takes ten minutes.',
    tokens: ['从', '这里', '到', '学校', '走路', '要', '十', '分钟'],
    hskLevel: 2,
    topic: 'travel'
  },
  {
    id: 'corp_trav_06',
    hanzi: '他下个月打算去上海旅游。',
    pinyin: 'Tā xià gè yuè dǎsuàn qù Shànghǎi lǚyóu.',
    english: 'He plans to travel to Shanghai next month.',
    tokens: ['他', '下', '个', '月', '打算', '去', '上海', '旅游'],
    hskLevel: 2,
    topic: 'travel'
  }
];

// ============================================================================
// 2. MODULE-LEVEL CORPUS STORE & INVERTED TOKEN INDEX
// ============================================================================

const NORMALIZED_STARTER_CORPUS = STARTER_BILINGUAL_CORPUS.map((item) => ({
  ...item,
  tokens: item.tokens.map((t) => String(t).trim()),
  isExternal: false
}));

let externalCorpusSentences = [];
let activeCorpusSentences = [];
/** @type {Map<string, number[]>} */
let corpusTokenIndex = new Map();
/** @type {Set<string>} */
let corpusHanziSet = new Set();

function normalizeCorpusKey(hanzi = '') {
  return String(hanzi || '')
    .trim()
    .replace(/[\s，。！？、,.!?；;：“”"'（）()]/g, '');
}

function normalizeExternalCorpusEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const hanzi = String(raw.hanzi || raw.zh || raw.chinese || '').trim();
  const english = String(raw.english || raw.en || raw.translation || '').trim();
  if (!hanzi || !english) return null;

  const rawTokens = Array.isArray(raw.tokens)
    ? raw.tokens.map((t) => String(t || '').trim()).filter(Boolean)
    : [];
  const tokens =
    rawTokens.length > 0
      ? rawTokens
      : Array.from(hanzi).filter((ch) => /[\u4e00-\u9fff]/.test(ch));

  if (tokens.length === 0) return null;

  const rawLevelNum = Number(
    raw.hskLevel ??
      (typeof raw.level === 'string'
        ? raw.level.match(/(\d+)/)?.[1]
        : raw.level)
  );

  return {
    id: raw.id ? String(raw.id) : null,
    hanzi,
    pinyin: typeof raw.pinyin === 'string' ? raw.pinyin.trim() : '',
    english,
    tokens,
    hskLevel: Number.isFinite(rawLevelNum) && rawLevelNum > 0 ? rawLevelNum : 1,
    topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : 'general'
  };
}

/**
 * Rebuilds the inverted token index (`Map<string, number[]>`) mapping each
 * Chinese word token to the array of sentence indices containing it.
 */
export function rebuildCorpusIndex(sentences = []) {
  const safeList = Array.isArray(sentences) ? sentences : [];
  const nextIndex = new Map();
  const nextHanziSet = new Set();

  for (let idx = 0; idx < safeList.length; idx++) {
    const sent = safeList[idx];
    if (!sent || !Array.isArray(sent.tokens)) continue;
    const key = normalizeCorpusKey(sent.hanzi);
    if (key) nextHanziSet.add(key);

    const seenInSentence = new Set();
    for (let t = 0; t < sent.tokens.length; t++) {
      const tok = String(sent.tokens[t] || '').trim();
      if (!tok || seenInSentence.has(tok)) continue;
      seenInSentence.add(tok);
      let posting = nextIndex.get(tok);
      if (!posting) {
        posting = [];
        nextIndex.set(tok, posting);
      }
      posting.push(idx);
    }
  }

  activeCorpusSentences = safeList;
  corpusTokenIndex = nextIndex;
  corpusHanziSet = nextHanziSet;
  return corpusTokenIndex;
}

// Initialize immediately with the built-in 60-sentence starter corpus
rebuildCorpusIndex([...NORMALIZED_STARTER_CORPUS]);

/**
 * Replaces the external pre-tokenized corpus batch (e.g., from `/data/corpus_hsk.json`),
 * keeping `STARTER_BILINGUAL_CORPUS` intact, deduplicating by `hanzi`, validating `tokens`,
 * and rebuilding the inverted index cleanly across re-syncs.
 */
export function registerExternalCorpusSentences(externalSentences = []) {
  const starterKeys = new Set(
    NORMALIZED_STARTER_CORPUS.map((item) => normalizeCorpusKey(item.hanzi)).filter(Boolean)
  );
  const nextExternal = [];
  const seenKeys = new Set(starterKeys);

  if (Array.isArray(externalSentences) && externalSentences.length > 0) {
    for (let i = 0; i < externalSentences.length; i++) {
      const normalized = normalizeExternalCorpusEntry(externalSentences[i]);
      if (!normalized) continue;

      const normKey = normalizeCorpusKey(normalized.hanzi);
      if (!normKey || seenKeys.has(normKey)) continue;

      seenKeys.add(normKey);
      nextExternal.push({
        id: normalized.id || `ext_corp_${nextExternal.length + 1}`,
        hanzi: normalized.hanzi,
        pinyin: normalized.pinyin,
        english: normalized.english,
        tokens: normalized.tokens,
        hskLevel: normalized.hskLevel,
        topic: normalized.topic,
        isExternal: true
      });
    }
  }

  externalCorpusSentences = nextExternal;
  rebuildCorpusIndex([...NORMALIZED_STARTER_CORPUS, ...externalCorpusSentences]);

  return { addedCount: externalCorpusSentences.length, totalCount: activeCorpusSentences.length };
}

export function getCorpusSentenceCount() {
  return activeCorpusSentences.length;
}

/**
 * Returns a shallow copy of every currently loaded bilingual corpus sentence
 * (built-in starter corpus + any synced external corpus_hsk.json entries).
 */
export function getAllCorpusSentences() {
  return [...activeCorpusSentences];
}

// ============================================================================
// 3. i+0 / i+1 SENTENCE MINER & READINESS STATS
// ============================================================================

function buildUnlockedTokenSet(unlockedWords = []) {
  const set = new Set();
  if (Array.isArray(unlockedWords)) {
    for (let i = 0; i < unlockedWords.length; i++) {
      const entry = unlockedWords[i];
      const h =
        typeof entry === 'string'
          ? entry.trim()
          : String(entry?.hanzi || entry?.simplified || '').trim();
      if (h) set.add(h);
    }
  }

  // Add standard single-character pronouns/particles ONLY when at least 10 words are unlocked
  if (set.size >= 10) {
    for (let i = 0; i < BASE_FUNCTION_WORDS_AT_10.length; i++) {
      set.add(BASE_FUNCTION_WORDS_AT_10[i]);
    }
  }

  return set;
}

function normalizeSrsSet(srsDueHanziSet) {
  const set = new Set();
  if (!srsDueHanziSet) return set;
  if (srsDueHanziSet instanceof Set) {
    srsDueHanziSet.forEach((v) => {
      const s = String(v || '').trim();
      if (s) set.add(s);
    });
  } else if (Array.isArray(srsDueHanziSet)) {
    srsDueHanziSet.forEach((v) => {
      const s = typeof v === 'string' ? v.trim() : String(v?.hanzi || '').trim();
      if (s) set.add(s);
    });
  }
  return set;
}

function evaluateSentenceComprehensibility(sentence, unlockedSet) {
  const tokens = Array.isArray(sentence?.tokens) ? sentence.tokens : [];
  const knownTokens = [];
  const unknownTokens = [];
  const seenUnknown = new Set();

  for (let i = 0; i < tokens.length; i++) {
    const tok = String(tokens[i] || '').trim();
    if (!tok) continue;
    // Ignore pure punctuation tokens if any
    if (!/[\u4e00-\u9fff]/.test(tok)) continue;

    if (unlockedSet.has(tok)) {
      knownTokens.push(tok);
    } else if (!seenUnknown.has(tok)) {
      seenUnknown.add(tok);
      unknownTokens.push(tok);
    }
  }

  return { knownTokens, unknownTokens };
}

function classifyCorpusInputLevel(knownTokens, unknownTokens) {
  if (unknownTokens.length === 0) return 'i+0';
  if (unknownTokens.length === 1 && knownTokens.length >= 3) return 'i+1';
  return 'i+2+';
}

/**
 * Mines natural Mandarin sentences matching the learner's unlocked vocabulary
 * at either strict `i+0` (`mode: 'i0_only'`) or `i+0 / i+1` (`mode: 'i0_and_i1'`).
 *
 * @param {any[]} [unlockedWords]
 * @param {{
 *   mode?: 'i0_only' | 'i0_and_i1',
 *   targetWord?: any,
 *   srsDueHanziSet?: Set<string> | string[] | null,
 *   topic?: string | null,
 *   limit?: number
 * }} [options]
 */
export function mineCorpusSentences(unlockedWords = [], options = {}) {
  const {
    mode = 'i0_only',
    targetWord = null,
    srsDueHanziSet = null,
    topic = null,
    limit = 8
  } = options || {};

  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || 8)));
  const unlockedSet = buildUnlockedTokenSet(unlockedWords);
  if (unlockedSet.size === 0 || activeCorpusSentences.length === 0) {
    return [];
  }

  const targetHanzi =
    typeof targetWord === 'string'
      ? targetWord.trim()
      : String(targetWord?.hanzi || '').trim();
  const srsSet = normalizeSrsSet(srsDueHanziSet);
  const topicFilter = typeof topic === 'string' && topic.trim() ? topic.trim() : null;

  const candidateOrder = [];
  const seenSentenceIdx = new Set();

  const pushUniqueIndices = (indices) => {
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (
        typeof idx === 'number' &&
        idx >= 0 &&
        idx < activeCorpusSentences.length &&
        !seenSentenceIdx.has(idx)
      ) {
        seenSentenceIdx.add(idx);
        candidateOrder.push(idx);
      }
    }
  };

  const shuffleWithExternalPriority = (indices) => {
    const ext = [];
    const starter = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (activeCorpusSentences[idx]?.isExternal) {
        ext.push(idx);
      } else {
        starter.push(idx);
      }
    }
    const shuffledExt = shuffleCopy(ext);
    const shuffledStarter = shuffleCopy(starter);
    if (shuffledExt.length === 0) return shuffledStarter;
    if (shuffledStarter.length === 0) return shuffledExt;
    // Interleave external textbook sentences ahead/equally with starter sentences so external corpus is never starved
    const mixed = [];
    let e = 0;
    let s = 0;
    while (e < shuffledExt.length || s < shuffledStarter.length) {
      if (e < shuffledExt.length) mixed.push(shuffledExt[e++]);
      if (e < shuffledExt.length) mixed.push(shuffledExt[e++]);
      if (s < shuffledStarter.length) mixed.push(shuffledStarter[s++]);
    }
    return mixed;
  };

  // 1. Pull targetWord matches via inverted index first (shuffled with external priority)
  if (targetHanzi && corpusTokenIndex.has(targetHanzi)) {
    const posting = corpusTokenIndex.get(targetHanzi) || [];
    pushUniqueIndices(shuffleWithExternalPriority(posting));
  }

  // 2. Pull SRS-due word matches via inverted index next (shuffled with external priority)
  if (srsSet.size > 0) {
    const srsIndices = [];
    srsSet.forEach((dueHanzi) => {
      const posting = corpusTokenIndex.get(dueHanzi);
      if (posting) {
        for (let i = 0; i < posting.length; i++) {
          if (!seenSentenceIdx.has(posting[i])) srsIndices.push(posting[i]);
        }
      }
    });
    pushUniqueIndices(shuffleWithExternalPriority(srsIndices));
  }

  // 3. Shuffle remaining corpus entries (giving external sentences equal/higher sampling priority) BEFORE evaluation cap
  const remainingIndices = [];
  for (let idx = 0; idx < activeCorpusSentences.length; idx++) {
    if (!seenSentenceIdx.has(idx)) remainingIndices.push(idx);
  }
  pushUniqueIndices(shuffleWithExternalPriority(remainingIndices));

  const maxEvaluatedCandidates = safeLimit * 4;
  const scoredMatches = [];

  for (let i = 0; i < candidateOrder.length && scoredMatches.length < maxEvaluatedCandidates; i++) {
    const sent = activeCorpusSentences[candidateOrder[i]];
    if (!sent) continue;
    if (topicFilter && sent.topic !== topicFilter) continue;

    const { knownTokens, unknownTokens } = evaluateSentenceComprehensibility(sent, unlockedSet);
    const inputLevel = classifyCorpusInputLevel(knownTokens, unknownTokens);

    if (mode === 'i0_only') {
      if (inputLevel !== 'i+0') continue;
    } else {
      if (inputLevel !== 'i+0' && inputLevel !== 'i+1') continue;
    }

    const matchedTarget = Boolean(targetHanzi && sent.tokens.includes(targetHanzi));
    let srsHits = 0;
    if (srsSet.size > 0) {
      for (let t = 0; t < sent.tokens.length; t++) {
        if (srsSet.has(sent.tokens[t])) srsHits += 1;
      }
    }

    const lengthBonus = sent.tokens.length >= 4 && sent.tokens.length <= 8 ? 15 : 5;
    const externalBonus = sent.isExternal ? 8 : 0;
    const score =
      (matchedTarget ? 1000 : 0) +
      srsHits * 200 +
      (inputLevel === 'i+0' ? 120 : 40) +
      lengthBonus +
      externalBonus +
      Math.random() * 12;

    scoredMatches.push({
      score,
      result: {
        ...sent,
        inputLevel,
        unknownToken: unknownTokens[0] || null,
        matchedTarget,
        targetHanzi: matchedTarget ? targetHanzi : null
      }
    });
  }

  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches.slice(0, safeLimit).map((m) => m.result);
}

/**
 * Computes corpus coverage counts (`totalCorpusSentences`, `i0Count`, `i1Count`)
 * for the learner's current unlocked vocabulary.
 */
export function getCorpusReadinessStats(unlockedWords = []) {
  const totalCorpusSentences = activeCorpusSentences.length;
  const unlockedSet = buildUnlockedTokenSet(unlockedWords);
  if (unlockedSet.size === 0 || totalCorpusSentences === 0) {
    return { totalCorpusSentences, i0Count: 0, i1Count: 0 };
  }

  let i0Count = 0;
  let i1Count = 0;

  for (let i = 0; i < totalCorpusSentences; i++) {
    const { knownTokens, unknownTokens } = evaluateSentenceComprehensibility(
      activeCorpusSentences[i],
      unlockedSet
    );
    const level = classifyCorpusInputLevel(knownTokens, unknownTokens);
    if (level === 'i+0') {
      i0Count += 1;
    } else if (level === 'i+1') {
      i1Count += 1;
    }
  }

  return { totalCorpusSentences, i0Count, i1Count };
}

/**
 * Returns every loaded corpus sentence annotated with learner comprehensibility:
 * `{ ...sentence, inputLevel: 'i+0' | 'i+1' | 'i+2+', unknownTokens: string[] }`.
 */
export function annotateCorpusReadiness(unlockedWords = []) {
  const unlockedSet = buildUnlockedTokenSet(unlockedWords);
  return activeCorpusSentences.map((sentence) => {
    const { knownTokens, unknownTokens } = evaluateSentenceComprehensibility(sentence, unlockedSet);
    const inputLevel = classifyCorpusInputLevel(knownTokens, unknownTokens);
    return {
      ...sentence,
      inputLevel,
      unknownTokens
    };
  });
}

// ============================================================================
// 4. ADAPTERS: MINED CORPUS SENTENCES -> PHASE 3 & PHASE 4 EXERCISE PAYLOADS
// ============================================================================

function splitPinyinTokensRoughly(pinyinStr = '') {
  return String(pinyinStr || '')
    .replace(/[.,!?;:"'()，。！？、]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function buildStructuredCorpusTokens(minedSentence, enrichedUnlockedWords = []) {
  const wordByHanzi = new Map();
  if (Array.isArray(enrichedUnlockedWords)) {
    for (let i = 0; i < enrichedUnlockedWords.length; i++) {
      const w = enrichedUnlockedWords[i];
      if (w && typeof w.hanzi === 'string' && w.hanzi.trim()) {
        wordByHanzi.set(w.hanzi.trim(), w);
      }
    }
  }

  const rawTokens = Array.isArray(minedSentence?.tokens) ? minedSentence.tokens : [];
  const rawPinyinWords = splitPinyinTokensRoughly(minedSentence?.pinyin || '');

  // Build aligned fallback pinyin slices if counts roughly match
  const canAlignDirectly = rawPinyinWords.length === rawTokens.length;

  return rawTokens.map((tokHanzi, idx) => {
    const clean = String(tokHanzi || '').trim();
    const matchedWord = wordByHanzi.get(clean) || null;
    const commonMeta = COMMON_TOKEN_META[clean] || null;

    let pos =
      matchedWord?.pos ||
      matchedWord?.linguistics?.pos ||
      commonMeta?.pos ||
      (HIGH_VALUE_CLOZE_PARTICLES.has(clean)
        ? 'particle'
        : COMMON_CLASSIFIERS.has(clean)
        ? 'classifier'
        : COMMON_MODALS.has(clean)
        ? 'modal'
        : 'noun');

    const pinyin =
      matchedWord?.pinyin ||
      commonMeta?.pinyin ||
      (canAlignDirectly ? rawPinyinWords[idx] : '') ||
      '';

    const meaning =
      matchedWord?.meaning ||
      matchedWord?.english ||
      commonMeta?.meaning ||
      '';

    return {
      id: `ctok_${minedSentence.id || 's'}_${idx}_${clean}`,
      hanzi: clean,
      pinyin,
      pos,
      role: pos,
      meaning,
      sourceWord: matchedWord || {
        id: `corp_w_${clean}`,
        hanzi: clean,
        pinyin,
        meaning,
        chars: Array.from(clean).filter((c) => /[\u4e00-\u9fff]/.test(c))
      },
      isTarget: Boolean(minedSentence?.matchedTarget && clean === minedSentence?.targetHanzi),
      isBlankCandidate: clean !== minedSentence?.unknownToken
    };
  });
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

/**
 * Converts a mined corpus sentence into an `OpenClozeCard`-compatible payload.
 * Picks a high-value `blankToken` (particle, classifier, modal verb, or target word).
 */
export function minedSentenceToOpenClozeItem(minedSentence, enrichedUnlockedWords = []) {
  try {
    if (
      !minedSentence ||
      typeof minedSentence !== 'object' ||
      !minedSentence.hanzi ||
      !Array.isArray(minedSentence.tokens) ||
      minedSentence.tokens.length < 2
    ) {
      return null;
    }

    const tokens = buildStructuredCorpusTokens(minedSentence, enrichedUnlockedWords);
    const eligibleIndices = tokens
      .map((t, idx) => (t && t.hanzi && t.isBlankCandidate !== false ? idx : -1))
      .filter((idx) => idx >= 0);

    if (eligibleIndices.length === 0) return null;

    // Priority 1: High-value grammatical particles (了/的/在/没/都/也/etc.)
    const particleIdx = eligibleIndices.find((idx) =>
      HIGH_VALUE_CLOZE_PARTICLES.has(tokens[idx].hanzi)
    );
    // Priority 2: Measure words / classifiers
    const classifierIdx = eligibleIndices.find(
      (idx) =>
        tokens[idx].pos === 'classifier' || COMMON_CLASSIFIERS.has(tokens[idx].hanzi)
    );
    // Priority 3: Modal verbs
    const modalIdx = eligibleIndices.find(
      (idx) => tokens[idx].pos === 'modal' || COMMON_MODALS.has(tokens[idx].hanzi)
    );
    // Priority 4: Target or content verb/adj/noun
    const contentIdx = eligibleIndices.find((idx) =>
      ['verb', 'adj', 'noun', 'time', 'place'].includes(tokens[idx].pos)
    );

    const blankTokenIndex =
      particleIdx !== undefined
        ? particleIdx
        : classifierIdx !== undefined
        ? classifierIdx
        : modalIdx !== undefined
        ? modalIdx
        : contentIdx !== undefined
        ? contentIdx
        : eligibleIndices[0];

    const blankToken = tokens[blankTokenIndex];
    if (!blankToken) return null;

    return {
      id: `corpus_cloze_${minedSentence.id || 'item'}_${Date.now()}`,
      tokens,
      blankTokenIndex,
      blankToken,
      hanzi: minedSentence.hanzi,
      pinyin: minedSentence.pinyin || '',
      english: minedSentence.english || '',
      acceptedVariants: [minedSentence.hanzi],
      targetWord: blankToken.sourceWord || null,
      grammarPoint: {
        title: 'Natural Context (Corpus)',
        ruleSummary: 'Complete the natural Mandarin sentence from context.'
      },
      sourceType: 'corpus',
      inputLevel: minedSentence.inputLevel || 'i+0',
      unknownToken: minedSentence.unknownToken || null,
      topic: minedSentence.topic || 'general'
    };
  } catch (err) {
    console.warn('[CorpusMiner] minedSentenceToOpenClozeItem failed:', err);
    return null;
  }
}

/**
 * Converts a mined corpus sentence into a `TranslationExerciseCard`-compatible payload
 * with 2-3 plausible grammatical distractor tiles (`不`, `没`, `了`, `的`, `在`, etc.).
 */
export function minedSentenceToTranslationItem(minedSentence, enrichedUnlockedWords = []) {
  try {
    if (
      !minedSentence ||
      typeof minedSentence !== 'object' ||
      !minedSentence.hanzi ||
      !minedSentence.english ||
      !Array.isArray(minedSentence.tokens) ||
      minedSentence.tokens.length < 2
    ) {
      return null;
    }

    const tokens = buildStructuredCorpusTokens(minedSentence, enrichedUnlockedWords);
    const usedHanziSet = new Set(tokens.map((t) => t.hanzi));

    const unlockedHanziSet = new Set(
      (Array.isArray(enrichedUnlockedWords) ? enrichedUnlockedWords : [])
        .map((w) => String(w?.hanzi || '').trim())
        .filter(Boolean)
    );

    const unlockedDistractors = TRANSLATION_DISTRACTOR_POOL.filter(
      (d) => !usedHanziSet.has(d) && unlockedHanziSet.has(d)
    );
    const fallbackDistractors = TRANSLATION_DISTRACTOR_POOL.filter(
      (d) => !usedHanziSet.has(d) && !unlockedDistractors.includes(d)
    );
    const distractorTokens = [...unlockedDistractors, ...fallbackDistractors].slice(0, 3);

    const primaryContentTok =
      tokens.find((t) => t.isTarget) ||
      tokens.find((t) => ['verb', 'noun', 'adj'].includes(t.pos)) ||
      tokens[0];

    return {
      id: `corpus_trans_${minedSentence.id || 'item'}_${Date.now()}`,
      tokens,
      hanzi: minedSentence.hanzi,
      pinyin: minedSentence.pinyin || '',
      english: minedSentence.english,
      acceptedVariants: [minedSentence.hanzi],
      distractorTokens,
      targetWord: primaryContentTok?.sourceWord || null,
      grammarPoint: {
        title: 'Natural Sentence (Corpus)',
        ruleSummary: 'Translate into natural Mandarin word order.'
      },
      sourceType: 'corpus',
      inputLevel: minedSentence.inputLevel || 'i+0',
      unknownToken: minedSentence.unknownToken || null,
      topic: minedSentence.topic || 'general'
    };
  } catch (err) {
    console.warn('[CorpusMiner] minedSentenceToTranslationItem failed:', err);
    return null;
  }
}

/**
 * Mines 3 `i+0` (or up to one `i+1`) natural corpus sentences sharing a topic
 * (or anchored on `focusWord`) and converts them into a `MicroReadingCard`-compatible
 * passage with 2 strict anti-spoiler English comprehension questions.
 */
export function minedSentenceToMicroReadingPassage(unlockedWords = [], focusWord = null) {
  try {
    const candidates = mineCorpusSentences(unlockedWords, {
      mode: 'i0_and_i1',
      targetWord: focusWord,
      limit: 30
    });

    if (candidates.length < 3) return null;

    // Group candidates by topic
    const byTopic = new Map();
    for (let i = 0; i < candidates.length; i++) {
      const s = candidates[i];
      const t = s.topic || 'general';
      if (!byTopic.has(t)) byTopic.set(t, []);
      byTopic.get(t).push(s);
    }

    const pickValidTrio = (list) => {
      const i0List = list.filter((s) => s.inputLevel === 'i+0');
      const i1List = list.filter((s) => s.inputLevel === 'i+1');
      if (i0List.length >= 3) {
        return i0List.slice(0, 3);
      }
      if (i0List.length === 2 && i1List.length >= 1) {
        return [i0List[0], i0List[1], i1List[0]];
      }
      return null;
    };

    let selectedTrio = null;
    let selectedTopic = 'general';

    // Prefer a topic containing a focusWord match first
    const topicEntries = Array.from(byTopic.entries()).sort((a, b) => {
      const aHasFocus = a[1].some((s) => s.matchedTarget) ? 1 : 0;
      const bHasFocus = b[1].some((s) => s.matchedTarget) ? 1 : 0;
      if (bHasFocus !== aHasFocus) return bHasFocus - aHasFocus;
      return b[1].length - a[1].length;
    });

    for (let i = 0; i < topicEntries.length; i++) {
      const [topicKey, list] = topicEntries[i];
      const trio = pickValidTrio(list);
      if (trio) {
        selectedTrio = trio;
        selectedTopic = topicKey;
        break;
      }
    }

    // Fallback: pick 3 sentences across topics (at most one i+1)
    if (!selectedTrio) {
      selectedTrio = pickValidTrio(candidates);
      if (!selectedTrio) return null;
      selectedTopic = selectedTrio[0]?.topic || 'general';
    }

    const selectedIds = new Set(selectedTrio.map((s) => s.id));
    const selectedEnglishSet = new Set(selectedTrio.map((s) => s.english.trim().toLowerCase()));
    const maxTrioHskLevel = Math.max(
      1,
      ...selectedTrio.map((s) => (Number.isFinite(Number(s.hskLevel)) ? Number(s.hskLevel) : 1))
    );

    // Gather plausible English distractor statements from level-appropriate corpus sentences not in the passage
    const levelBoundedDistractors = activeCorpusSentences.filter(
      (s) =>
        s &&
        s.english &&
        (Number.isFinite(Number(s.hskLevel)) ? Number(s.hskLevel) : 1) <= maxTrioHskLevel + 1 &&
        !selectedIds.has(s.id) &&
        !selectedEnglishSet.has(s.english.trim().toLowerCase())
    );
    const distractorPool = shuffleCopy(
      levelBoundedDistractors.length >= 6
        ? levelBoundedDistractors
        : activeCorpusSentences.filter(
            (s) =>
              s &&
              s.english &&
              !selectedIds.has(s.id) &&
              !selectedEnglishSet.has(s.english.trim().toLowerCase())
          )
    );

    if (distractorPool.length < 6) return null;

    const q1Target = selectedTrio[0];
    const q2Target = selectedTrio[selectedTrio.length - 1];

    const q1Distractors = distractorPool.slice(0, 3);
    const q2Distractors = distractorPool.slice(3, 6);

    const questions = [
      {
        id: `corp_mr_q1_${q1Target.id}`,
        prompt: 'Which statement matches what is said in the passage?',
        options: shuffleCopy([
          { id: 'mr_q1_ok', text: q1Target.english, isCorrect: true },
          ...q1Distractors.map((d, idx) => ({
            id: `mr_q1_d${idx}`,
            text: d.english,
            isCorrect: false
          }))
        ]),
        explanation: `${q1Target.hanzi} (${q1Target.pinyin}) — "${q1Target.english}"`
      },
      {
        id: `corp_mr_q2_${q2Target.id}`,
        prompt: 'Which additional detail is mentioned in the passage?',
        options: shuffleCopy([
          { id: 'mr_q2_ok', text: q2Target.english, isCorrect: true },
          ...q2Distractors.map((d, idx) => ({
            id: `mr_q2_d${idx}`,
            text: d.english,
            isCorrect: false
          }))
        ]),
        explanation: `${q2Target.hanzi} (${q2Target.pinyin}) — "${q2Target.english}"`
      }
    ];

    const topicLabel = TOPIC_DISPLAY_TITLES[selectedTopic] || selectedTopic || 'Daily Mandarin';
    const sentences = selectedTrio.map((s) => ({
      id: s.id,
      hanzi: s.hanzi,
      pinyin: s.pinyin || '',
      english: s.english || '',
      tokens: s.tokens,
      inputLevel: s.inputLevel,
      unknownToken: s.unknownToken || null
    }));

    return {
      id: `corpus_mr_${selectedTopic}_${Date.now()}`,
      title: `Corpus Reading • ${topicLabel}`,
      topic: selectedTopic,
      protagonist: focusWord || null,
      sentences,
      fullHanzi: sentences.map((s) => s.hanzi).join(''),
      fullPinyin: sentences.map((s) => s.pinyin).join(' '),
      fullEnglish: sentences.map((s) => s.english).join(' '),
      questions,
      sourceType: 'corpus',
      inputLevel: sentences.some((s) => s.inputLevel === 'i+1') ? 'i+1' : 'i+0'
    };
  } catch (err) {
    console.warn('[CorpusMiner] minedSentenceToMicroReadingPassage failed:', err);
    return null;
  }
}
