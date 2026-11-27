// ============================================================================
// CORE SEMANTIC ONTOLOGY & DETERMINISTIC LEXICON ENRICHER (100% Offline, $0)
// Resolves word POS, semantic features, valence, classifiers, separable verbs
// (离合词), and English gloss inflections in strict 4-tier priority order.
// ============================================================================

import { getLexiconEntry, mapIctclasTagsToPos } from './linguisticDataLoader.js';

/**
 * Compact built-in HSK 1+ semantic ontology (~190 essential Mandarin entries).
 * Powers offline contextual generation, classifier validation, separable verb
 * handling, and grammatical frame matching even before external JSONs exist.
 */
export const CORE_SEMANTIC_ONTOLOGY = {
  // --------------------------------------------------------------------------
  // 1. PRONOUNS (代词)
  // --------------------------------------------------------------------------
  我: { pos: 'pron', features: ['human', 'singular', 'first_person'], enGloss: { singular: 'I', plural: 'we' } },
  你: { pos: 'pron', features: ['human', 'singular', 'second_person'], enGloss: { singular: 'you', plural: 'you' } },
  您: { pos: 'pron', features: ['human', 'singular', 'second_person', 'polite'], enGloss: { singular: 'you (polite)', plural: 'you' } },
  他: { pos: 'pron', features: ['human', 'singular', 'third_person', 'male'], enGloss: { singular: 'he', plural: 'they' } },
  她: { pos: 'pron', features: ['human', 'singular', 'third_person', 'female'], enGloss: { singular: 'she', plural: 'they' } },
  它: { pos: 'pron', features: ['nonhuman', 'singular', 'third_person'], enGloss: { singular: 'it', plural: 'they' } },
  我们: { pos: 'pron', features: ['human', 'plural', 'first_person'], enGloss: { singular: 'we', plural: 'we' } },
  你们: { pos: 'pron', features: ['human', 'plural', 'second_person'], enGloss: { singular: 'you all', plural: 'you all' } },
  他们: { pos: 'pron', features: ['human', 'plural', 'third_person'], enGloss: { singular: 'they', plural: 'they' } },
  她们: { pos: 'pron', features: ['human', 'plural', 'third_person', 'female'], enGloss: { singular: 'they (female)', plural: 'they' } },
  这: { pos: 'pron', features: ['demonstrative', 'proximal'], enGloss: { singular: 'this', plural: 'these' } },
  这儿: { pos: 'place', features: ['place', 'demonstrative', 'proximal'], enGloss: { singular: 'here', plural: 'here' } },
  这里: { pos: 'place', features: ['place', 'demonstrative', 'proximal'], enGloss: { singular: 'here', plural: 'here' } },
  那: { pos: 'pron', features: ['demonstrative', 'distal'], enGloss: { singular: 'that', plural: 'those' } },
  那儿: { pos: 'place', features: ['place', 'demonstrative', 'distal'], enGloss: { singular: 'there', plural: 'there' } },
  那里: { pos: 'place', features: ['place', 'demonstrative', 'distal'], enGloss: { singular: 'there', plural: 'there' } },
  谁: { pos: 'pron', features: ['human', 'interrogative'], enGloss: { singular: 'who', plural: 'who' } },
  什么: { pos: 'pron', features: ['interrogative'], enGloss: { singular: 'what', plural: 'what' } },
  哪: { pos: 'pron', features: ['interrogative'], enGloss: { singular: 'which', plural: 'which' } },
  哪儿: { pos: 'place', features: ['place', 'interrogative'], enGloss: { singular: 'where', plural: 'where' } },
  哪里: { pos: 'place', features: ['place', 'interrogative'], enGloss: { singular: 'where', plural: 'where' } },
  怎么: { pos: 'pron', features: ['interrogative', 'manner'], enGloss: { singular: 'how', plural: 'how' } },
  怎么样: { pos: 'pron', features: ['interrogative', 'quality'], enGloss: { singular: 'how about', plural: 'how is it' } },
  多少: { pos: 'pron', features: ['interrogative', 'quantity'], enGloss: { singular: 'how many', plural: 'how much' } },
  几: { pos: 'pron', features: ['interrogative', 'quantity_small'], enGloss: { singular: 'how many', plural: 'a few' } },

  // --------------------------------------------------------------------------
  // 2. FAMILY & PEOPLE (人物与称谓)
  // --------------------------------------------------------------------------
  人: { pos: 'noun', features: ['human'], classifiers: ['个', '口', '位'], enGloss: { singular: 'person', plural: 'people' } },
  爸爸: { pos: 'noun', features: ['human', 'family', 'male'], classifiers: ['个', '位'], enGloss: { singular: 'father', plural: 'fathers' } },
  妈妈: { pos: 'noun', features: ['human', 'family', 'female'], classifiers: ['个', '位'], enGloss: { singular: 'mother', plural: 'mothers' } },
  儿子: { pos: 'noun', features: ['human', 'family', 'male'], classifiers: ['个'], enGloss: { singular: 'son', plural: 'sons' } },
  女儿: { pos: 'noun', features: ['human', 'family', 'female'], classifiers: ['个'], enGloss: { singular: 'daughter', plural: 'daughters' } },
  哥哥: { pos: 'noun', features: ['human', 'family', 'male'], classifiers: ['个'], enGloss: { singular: 'older brother', plural: 'older brothers' } },
  姐姐: { pos: 'noun', features: ['human', 'family', 'female'], classifiers: ['个'], enGloss: { singular: 'older sister', plural: 'older sisters' } },
  弟弟: { pos: 'noun', features: ['human', 'family', 'male'], classifiers: ['个'], enGloss: { singular: 'younger brother', plural: 'younger brothers' } },
  妹妹: { pos: 'noun', features: ['human', 'family', 'female'], classifiers: ['个'], enGloss: { singular: 'younger sister', plural: 'younger sisters' } },
  朋友: { pos: 'noun', features: ['human', 'social'], classifiers: ['个', '位'], enGloss: { singular: 'friend', plural: 'friends' } },
  同学: { pos: 'noun', features: ['human', 'social', 'school'], classifiers: ['个', '位'], enGloss: { singular: 'classmate', plural: 'classmates' } },
  老师: { pos: 'noun', features: ['human', 'profession', 'school'], classifiers: ['位', '个'], enGloss: { singular: 'teacher', plural: 'teachers' } },
  学生: { pos: 'noun', features: ['human', 'school'], classifiers: ['个', '位'], enGloss: { singular: 'student', plural: 'students' } },
  医生: { pos: 'noun', features: ['human', 'profession'], classifiers: ['位', '个'], enGloss: { singular: 'doctor', plural: 'doctors' } },
  先生: { pos: 'noun', features: ['human', 'polite', 'male'], classifiers: ['位'], enGloss: { singular: 'mister', plural: 'gentlemen' } },
  小姐: { pos: 'noun', features: ['human', 'polite', 'female'], classifiers: ['位'], enGloss: { singular: 'miss', plural: 'young ladies' } },
  孩子: { pos: 'noun', features: ['human', 'family'], classifiers: ['个'], enGloss: { singular: 'child', plural: 'children' } },
  大家: { pos: 'pron', features: ['human', 'plural'], enGloss: { singular: 'everyone', plural: 'everyone' } },

  // --------------------------------------------------------------------------
  // 3. COUNTRIES, LANGUAGES & PLACES (国家、语言与地点)
  // --------------------------------------------------------------------------
  中国: { pos: 'place', features: ['place', 'country'], enGloss: { singular: 'China', plural: 'China' } },
  美国: { pos: 'place', features: ['place', 'country'], enGloss: { singular: 'the United States', plural: 'the United States' } },
  英国: { pos: 'place', features: ['place', 'country'], enGloss: { singular: 'the UK', plural: 'the UK' } },
  日本: { pos: 'place', features: ['place', 'country'], enGloss: { singular: 'Japan', plural: 'Japan' } },
  北京: { pos: 'place', features: ['place', 'city'], enGloss: { singular: 'Beijing', plural: 'Beijing' } },
  上海: { pos: 'place', features: ['place', 'city'], enGloss: { singular: 'Shanghai', plural: 'Shanghai' } },
  汉语: { pos: 'noun', features: ['language', 'learnable', 'speakable'], enGloss: { singular: 'Mandarin Chinese', plural: 'Mandarin Chinese' } },
  中文: { pos: 'noun', features: ['language', 'learnable', 'readable'], enGloss: { singular: 'Chinese', plural: 'Chinese' } },
  英语: { pos: 'noun', features: ['language', 'learnable', 'speakable'], enGloss: { singular: 'English', plural: 'English' } },
  家: { pos: 'place', features: ['place', 'indoor', 'family'], classifiers: ['个'], enGloss: { singular: 'home', plural: 'homes' } },
  学校: { pos: 'place', features: ['place', 'indoor', 'school'], classifiers: ['家', '个'], enGloss: { singular: 'school', plural: 'schools' } },
  医院: { pos: 'place', features: ['place', 'indoor'], classifiers: ['家', '个'], enGloss: { singular: 'hospital', plural: 'hospitals' } },
  饭馆: { pos: 'place', features: ['place', 'indoor', 'food_venue'], classifiers: ['家'], enGloss: { singular: 'restaurant', plural: 'restaurants' } },
  饭馆儿: { pos: 'place', features: ['place', 'indoor', 'food_venue'], classifiers: ['家'], enGloss: { singular: 'restaurant', plural: 'restaurants' } },
  饭店: { pos: 'place', features: ['place', 'indoor', 'food_venue'], classifiers: ['家'], enGloss: { singular: 'restaurant / hotel', plural: 'restaurants' } },
  商店: { pos: 'place', features: ['place', 'indoor', 'shop'], classifiers: ['家'], enGloss: { singular: 'shop', plural: 'shops' } },
  书店: { pos: 'place', features: ['place', 'indoor', 'shop'], classifiers: ['家'], enGloss: { singular: 'bookstore', plural: 'bookstores' } },
  公司: { pos: 'place', features: ['place', 'indoor', 'work'], classifiers: ['家'], enGloss: { singular: 'company', plural: 'companies' } },
  房间: { pos: 'place', features: ['place', 'indoor'], classifiers: ['个', '间'], enGloss: { singular: 'room', plural: 'rooms' } },
  教室: { pos: 'place', features: ['place', 'indoor', 'school'], classifiers: ['个', '间'], enGloss: { singular: 'classroom', plural: 'classrooms' } },
  火车站: { pos: 'place', features: ['place', 'transport'], classifiers: ['个'], enGloss: { singular: 'train station', plural: 'train stations' } },
  前面: { pos: 'place', features: ['place', 'location'], enGloss: { singular: 'in front', plural: 'in front' } },
  后面: { pos: 'place', features: ['place', 'location'], enGloss: { singular: 'behind', plural: 'behind' } },
  里面: { pos: 'place', features: ['place', 'location'], enGloss: { singular: 'inside', plural: 'inside' } },
  上面: { pos: 'place', features: ['place', 'location'], enGloss: { singular: 'above', plural: 'above' } },
  下面: { pos: 'place', features: ['place', 'location'], enGloss: { singular: 'underneath', plural: 'underneath' } },

  // --------------------------------------------------------------------------
  // 4. FOOD, DRINKS, ANIMALS & OBJECTS (食物、饮品、动物与物品)
  // --------------------------------------------------------------------------
  水: { pos: 'noun', features: ['drink', 'buyable'], classifiers: ['杯', '瓶'], enGloss: { singular: 'water', plural: 'water' } },
  茶: { pos: 'noun', features: ['drink', 'buyable'], classifiers: ['杯', '壶'], enGloss: { singular: 'tea', plural: 'tea' } },
  咖啡: { pos: 'noun', features: ['drink', 'buyable'], classifiers: ['杯'], enGloss: { singular: 'coffee', plural: 'coffee' } },
  牛奶: { pos: 'noun', features: ['drink', 'buyable'], classifiers: ['杯', '瓶'], enGloss: { singular: 'milk', plural: 'milk' } },
  米饭: { pos: 'noun', features: ['food', 'buyable'], classifiers: ['碗'], enGloss: { singular: 'cooked rice', plural: 'cooked rice' } },
  菜: { pos: 'noun', features: ['food', 'buyable'], classifiers: ['个', '盘'], enGloss: { singular: 'dish / vegetable', plural: 'dishes' } },
  苹果: { pos: 'noun', features: ['food', 'fruit', 'buyable'], classifiers: ['个'], enGloss: { singular: 'apple', plural: 'apples' } },
  水果: { pos: 'noun', features: ['food', 'fruit', 'buyable'], classifiers: ['种', '个'], enGloss: { singular: 'fruit', plural: 'fruits' } },
  面条: { pos: 'noun', features: ['food', 'buyable'], classifiers: ['碗'], enGloss: { singular: 'noodles', plural: 'noodles' } },
  鸡蛋: { pos: 'noun', features: ['food', 'buyable'], classifiers: ['个'], enGloss: { singular: 'egg', plural: 'eggs' } },
  书: { pos: 'noun', features: ['readable', 'buyable', 'object'], classifiers: ['本'], enGloss: { singular: 'book', plural: 'books' } },
  报纸: { pos: 'noun', features: ['readable', 'buyable', 'object'], classifiers: ['张', '份'], enGloss: { singular: 'newspaper', plural: 'newspapers' } },
  电脑: { pos: 'noun', features: ['device', 'buyable', 'object'], classifiers: ['台', '个'], enGloss: { singular: 'computer', plural: 'computers' } },
  手机: { pos: 'noun', features: ['device', 'buyable', 'object'], classifiers: ['部', '个'], enGloss: { singular: 'mobile phone', plural: 'mobile phones' } },
  电视: { pos: 'noun', features: ['watchable', 'device', 'buyable'], classifiers: ['台'], enGloss: { singular: 'television', plural: 'televisions' } },
  电影: { pos: 'noun', features: ['watchable', 'media'], classifiers: ['部', '个'], enGloss: { singular: 'movie', plural: 'movies' } },
  衣服: { pos: 'noun', features: ['wearable', 'buyable', 'object'], classifiers: ['件'], enGloss: { singular: 'clothing', plural: 'clothes' } },
  桌子: { pos: 'noun', features: ['furniture', 'object', 'buyable'], classifiers: ['张'], enGloss: { singular: 'table', plural: 'tables' } },
  椅子: { pos: 'noun', features: ['furniture', 'object', 'buyable'], classifiers: ['把', '张'], enGloss: { singular: 'chair', plural: 'chairs' } },
  杯子: { pos: 'noun', features: ['object', 'buyable'], classifiers: ['个'], enGloss: { singular: 'cup', plural: 'cups' } },
  钱: { pos: 'noun', features: ['money', 'abstract'], classifiers: ['块', '元'], enGloss: { singular: 'money', plural: 'money' } },
  飞机: { pos: 'noun', features: ['vehicle', 'transport'], classifiers: ['架'], enGloss: { singular: 'airplane', plural: 'airplanes' } },
  出租车: { pos: 'noun', features: ['vehicle', 'transport'], classifiers: ['辆'], enGloss: { singular: 'taxi', plural: 'taxis' } },
  狗: { pos: 'noun', features: ['animal', 'pet'], classifiers: ['条', '只'], enGloss: { singular: 'dog', plural: 'dogs' } },
  猫: { pos: 'noun', features: ['animal', 'pet'], classifiers: ['只'], enGloss: { singular: 'cat', plural: 'cats' } },
  鱼: { pos: 'noun', features: ['animal', 'food'], classifiers: ['条'], enGloss: { singular: 'fish', plural: 'fish' } },
  字: { pos: 'noun', features: ['readable', 'writable'], classifiers: ['个'], enGloss: { singular: 'character', plural: 'characters' } },
  汉字: { pos: 'noun', features: ['readable', 'writable', 'learnable'], classifiers: ['个'], enGloss: { singular: 'Chinese character', plural: 'Chinese characters' } },
  名字: { pos: 'noun', features: ['abstract', 'name'], classifiers: ['个'], enGloss: { singular: 'name', plural: 'names' } },
  天气: { pos: 'noun', features: ['weather', 'abstract'], enGloss: { singular: 'weather', plural: 'weather' } },
  东西: { pos: 'noun', features: ['object', 'buyable'], classifiers: ['个', '件'], enGloss: { singular: 'thing', plural: 'things' } },
  问题: { pos: 'noun', features: ['abstract', 'askable'], classifiers: ['个'], enGloss: { singular: 'question', plural: 'questions' } },

  // --------------------------------------------------------------------------
  // 5. TIME EXPRESSIONS (时间词)
  // --------------------------------------------------------------------------
  今天: { pos: 'time', features: ['time', 'time_present'], enGloss: { singular: 'today', plural: 'today' } },
  明天: { pos: 'time', features: ['time', 'time_future'], enGloss: { singular: 'tomorrow', plural: 'tomorrow' } },
  昨天: { pos: 'time', features: ['time', 'time_past'], enGloss: { singular: 'yesterday', plural: 'yesterday' } },
  现在: { pos: 'time', features: ['time', 'time_present'], enGloss: { singular: 'now', plural: 'now' } },
  时候: { pos: 'time', features: ['time'], enGloss: { singular: 'time / moment', plural: 'times' } },
  上午: { pos: 'time', features: ['time', 'part_of_day'], enGloss: { singular: 'morning', plural: 'mornings' } },
  中午: { pos: 'time', features: ['time', 'part_of_day'], enGloss: { singular: 'noon', plural: 'noons' } },
  下午: { pos: 'time', features: ['time', 'part_of_day'], enGloss: { singular: 'afternoon', plural: 'afternoons' } },
  晚上: { pos: 'time', features: ['time', 'part_of_day'], enGloss: { singular: 'evening', plural: 'evenings' } },
  早上: { pos: 'time', features: ['time', 'part_of_day'], enGloss: { singular: 'early morning', plural: 'mornings' } },
  年: { pos: 'time', features: ['time', 'time_unit'], enGloss: { singular: 'year', plural: 'years' } },
  月: { pos: 'time', features: ['time', 'time_unit'], enGloss: { singular: 'month', plural: 'months' } },
  日: { pos: 'time', features: ['time', 'time_unit'], enGloss: { singular: 'day', plural: 'days' } },
  号: { pos: 'time', features: ['time', 'date_marker'], enGloss: { singular: 'day of month', plural: 'days' } },
  星期: { pos: 'time', features: ['time', 'time_unit'], classifiers: ['个'], enGloss: { singular: 'week', plural: 'weeks' } },
  星期一: { pos: 'time', features: ['time', 'weekday'], enGloss: { singular: 'Monday', plural: 'Mondays' } },
  星期天: { pos: 'time', features: ['time', 'weekday'], enGloss: { singular: 'Sunday', plural: 'Sundays' } },
  点: { pos: 'time', features: ['time', 'clock_unit'], enGloss: { singular: "o'clock", plural: "o'clock" } },
  分钟: { pos: 'time', features: ['time', 'duration_unit'], enGloss: { singular: 'minute', plural: 'minutes' } },
  小时: { pos: 'time', features: ['time', 'duration_unit'], classifiers: ['个'], enGloss: { singular: 'hour', plural: 'hours' } },
  每天: { pos: 'time', features: ['time', 'habitual'], enGloss: { singular: 'every day', plural: 'every day' } },

  // --------------------------------------------------------------------------
  // 6. NUMBERS & CLASSIFIERS (数词与量词)
  // --------------------------------------------------------------------------
  零: { pos: 'num', features: ['number'], enGloss: { singular: 'zero', plural: 'zero' } },
  一: { pos: 'num', features: ['number', 'singular'], enGloss: { singular: 'one', plural: 'one' } },
  二: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'two', plural: 'two' } },
  两: { pos: 'num', features: ['number', 'plural', 'pre_classifier'], enGloss: { singular: 'two', plural: 'two' } },
  三: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'three', plural: 'three' } },
  四: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'four', plural: 'four' } },
  五: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'five', plural: 'five' } },
  六: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'six', plural: 'six' } },
  七: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'seven', plural: 'seven' } },
  八: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'eight', plural: 'eight' } },
  九: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'nine', plural: 'nine' } },
  十: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'ten', plural: 'ten' } },
  百: { pos: 'num', features: ['number', 'plural'], enGloss: { singular: 'hundred', plural: 'hundreds' } },
  个: { pos: 'classifier', features: ['classifier', 'general'], enGloss: { singular: 'unit', plural: 'units' } },
  口: { pos: 'classifier', features: ['classifier', 'family'], enGloss: { singular: 'family member', plural: 'family members' } },
  本: { pos: 'classifier', features: ['classifier', 'bound_book'], enGloss: { singular: 'volume', plural: 'volumes' } },
  杯: { pos: 'classifier', features: ['classifier', 'drink_cup'], enGloss: { singular: 'cup', plural: 'cups' } },
  只: { pos: 'classifier', features: ['classifier', 'animal'], enGloss: { singular: 'animal unit', plural: 'animal units' } },
  条: { pos: 'classifier', features: ['classifier', 'long_or_dog'], enGloss: { singular: 'strip / animal', plural: 'strips' } },
  件: { pos: 'classifier', features: ['classifier', 'clothing_matter'], enGloss: { singular: 'piece', plural: 'pieces' } },
  位: { pos: 'classifier', features: ['classifier', 'human_polite'], enGloss: { singular: 'person (polite)', plural: 'people (polite)' } },
  张: { pos: 'classifier', features: ['classifier', 'flat_surface'], enGloss: { singular: 'sheet / table', plural: 'sheets' } },
  块: { pos: 'classifier', features: ['classifier', 'currency_piece'], enGloss: { singular: 'yuan / piece', plural: 'yuan / pieces' } },
  元: { pos: 'classifier', features: ['classifier', 'currency'], enGloss: { singular: 'yuan', plural: 'yuan' } },
  岁: { pos: 'classifier', features: ['classifier', 'age'], enGloss: { singular: 'year old', plural: 'years old' } },
  些: { pos: 'classifier', features: ['classifier', 'indefinite_plural'], enGloss: { singular: 'some', plural: 'some' } },

  // --------------------------------------------------------------------------
  // 7. MODAL VERBS (能愿动词)
  // --------------------------------------------------------------------------
  会: {
    pos: 'modal',
    features: ['modal', 'ability_learned', 'future_likelihood'],
    valence: { subjFeatures: ['human'] },
    enGloss: { base: 'can', third: 'can', past: 'could', gerund: 'being able to' }
  },
  能: {
    pos: 'modal',
    features: ['modal', 'ability_physical', 'permission'],
    valence: { subjFeatures: ['human'] },
    enGloss: { base: 'can', third: 'can', past: 'could', gerund: 'being able to' }
  },
  可以: {
    pos: 'modal',
    features: ['modal', 'permission'],
    valence: { subjFeatures: ['human'] },
    enGloss: { base: 'may', third: 'may', past: 'could', gerund: 'being allowed to' }
  },
  想: {
    pos: 'modal',
    features: ['modal', 'desire', 'mental'],
    valence: { subjFeatures: ['human'] },
    enGloss: { base: 'want to', third: 'wants to', past: 'wanted to', gerund: 'wanting to' }
  },
  要: {
    pos: 'modal',
    features: ['modal', 'intention', 'necessity'],
    valence: { subjFeatures: ['human'] },
    enGloss: { base: 'want to', third: 'wants to', past: 'wanted to', gerund: 'wanting to' }
  },

  // --------------------------------------------------------------------------
  // 8. PARTICLES, ADVERBS, PREPOSITIONS & CONJUNCTIONS (虚词)
  // --------------------------------------------------------------------------
  吗: { pos: 'particle', features: ['particle', 'question_yesno'] },
  呢: { pos: 'particle', features: ['particle', 'question_reciprocal', 'progressive_end'] },
  吧: { pos: 'particle', features: ['particle', 'suggestion', 'softener'] },
  的: { pos: 'particle', features: ['particle', 'possessive', 'attributive'] },
  了: { pos: 'particle', features: ['particle', 'aspect_perfective', 'change_of_state'] },
  过: { pos: 'particle', features: ['particle', 'aspect_experiential'] },
  着: { pos: 'particle', features: ['particle', 'aspect_durative'] },
  在: { pos: 'prep', features: ['prep', 'locative', 'aspect_progressive'], valence: { takesPlace: true } },
  不: { pos: 'adv', features: ['negation', 'neg_general'] },
  没: { pos: 'adv', features: ['negation', 'neg_past', 'neg_existential'] },
  没有: { pos: 'verb', features: ['negation', 'existential'], valence: { subjFeatures: ['human', 'place'] }, enGloss: { base: 'do not have', third: 'does not have', past: 'did not have', gerund: 'not having' } },
  很: { pos: 'adv', features: ['degree', 'adverb'] },
  太: { pos: 'adv', features: ['degree', 'adverb', 'excessive'] },
  都: { pos: 'adv', features: ['scope', 'adverb', 'plural_trigger'] },
  也: { pos: 'adv', features: ['additive', 'adverb'] },
  还: { pos: 'adv', features: ['additive', 'continuative', 'adverb'] },
  最: { pos: 'adv', features: ['degree', 'superlative', 'adverb'] },
  非常: { pos: 'adv', features: ['degree', 'adverb'] },
  一起: { pos: 'adv', features: ['manner', 'adverb', 'group'] },
  和: { pos: 'conj', features: ['conjunction', 'nominal_join'] },
  跟: { pos: 'prep', features: ['prep', 'comitative'] },
  给: { pos: 'prep', features: ['prep', 'benefactive', 'ditransitive'], valence: { subjFeatures: ['human'], takesDoubleObj: true } },
  对: { pos: 'prep', features: ['prep', 'directional'] },
  从: { pos: 'prep', features: ['prep', 'source'] },
  到: { pos: 'prep', features: ['prep', 'goal'] },
  因为: { pos: 'conj', features: ['conjunction', 'causal'] },
  所以: { pos: 'conj', features: ['conjunction', 'result'] },
  但是: { pos: 'conj', features: ['conjunction', 'contrast'] },

  // --------------------------------------------------------------------------
  // 9. CORE VERBS (常用动词)
  // --------------------------------------------------------------------------
  是: {
    pos: 'verb',
    features: ['copula', 'stative'],
    valence: { subjFeatures: ['human', 'object', 'place'], objFeatures: ['human', 'object', 'place'] },
    enGloss: { base: 'be', third: 'is', past: 'was', gerund: 'being' }
  },
  有: {
    pos: 'verb',
    features: ['possessive', 'existential', 'stative'],
    valence: { subjFeatures: ['human', 'place'], objFeatures: ['human', 'object', 'food', 'drink', 'animal'] },
    enGloss: { base: 'have', third: 'has', past: 'had', gerund: 'having' }
  },
  叫: {
    pos: 'verb',
    features: ['naming', 'stative'],
    valence: { subjFeatures: ['human'], objFeatures: ['name'] },
    enGloss: { base: 'be called', third: 'is called', past: 'was called', gerund: 'being called' }
  },
  去: {
    pos: 'verb',
    features: ['motion', 'action'],
    valence: { subjFeatures: ['human'], objFeatures: ['place'], takesPlace: true },
    enGloss: { base: 'go', third: 'goes', past: 'went', gerund: 'going' }
  },
  来: {
    pos: 'verb',
    features: ['motion', 'action'],
    valence: { subjFeatures: ['human'], objFeatures: ['place'], takesPlace: true },
    enGloss: { base: 'come', third: 'comes', past: 'came', gerund: 'coming' }
  },
  回: {
    pos: 'verb',
    features: ['motion', 'action'],
    valence: { subjFeatures: ['human'], objFeatures: ['place'], takesPlace: true },
    enGloss: { base: 'return to', third: 'returns to', past: 'returned to', gerund: 'returning to' }
  },
  吃: {
    pos: 'verb',
    features: ['action', 'consumption'],
    valence: { subjFeatures: ['human', 'animal'], objFeatures: ['food'] },
    enGloss: { base: 'eat', third: 'eats', past: 'ate', gerund: 'eating' }
  },
  喝: {
    pos: 'verb',
    features: ['action', 'consumption'],
    valence: { subjFeatures: ['human', 'animal'], objFeatures: ['drink'] },
    enGloss: { base: 'drink', third: 'drinks', past: 'drank', gerund: 'drinking' }
  },
  看: {
    pos: 'verb',
    features: ['action', 'perception'],
    valence: { subjFeatures: ['human'], objFeatures: ['readable', 'watchable', 'human'] },
    enGloss: { base: 'look at', third: 'looks at', past: 'looked at', gerund: 'looking at' }
  },
  听: {
    pos: 'verb',
    features: ['action', 'perception'],
    valence: { subjFeatures: ['human'], objFeatures: ['media', 'language'] },
    enGloss: { base: 'listen to', third: 'listens to', past: 'listened to', gerund: 'listening to' }
  },
  说: {
    pos: 'verb',
    features: ['action', 'speech'],
    valence: { subjFeatures: ['human'], objFeatures: ['language'] },
    enGloss: { base: 'speak', third: 'speaks', past: 'spoke', gerund: 'speaking' }
  },
  读: {
    pos: 'verb',
    features: ['action', 'literacy'],
    valence: { subjFeatures: ['human'], objFeatures: ['readable'] },
    enGloss: { base: 'read', third: 'reads', past: 'read', gerund: 'reading' }
  },
  写: {
    pos: 'verb',
    features: ['action', 'literacy'],
    valence: { subjFeatures: ['human'], objFeatures: ['writable', 'readable'] },
    enGloss: { base: 'write', third: 'writes', past: 'wrote', gerund: 'writing' }
  },
  买: {
    pos: 'verb',
    features: ['action', 'transaction'],
    valence: { subjFeatures: ['human'], objFeatures: ['buyable', 'food', 'drink', 'object'] },
    enGloss: { base: 'buy', third: 'buys', past: 'bought', gerund: 'buying' }
  },
  做: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['food', 'object'] },
    enGloss: { base: 'do / make', third: 'does / makes', past: 'did / made', gerund: 'doing' }
  },
  工作: {
    pos: 'verb',
    features: ['action', 'intransitive'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    enGloss: { base: 'work', third: 'works', past: 'worked', gerund: 'working' }
  },
  学习: {
    pos: 'verb',
    features: ['action', 'study'],
    valence: { subjFeatures: ['human'], objFeatures: ['language', 'learnable'] },
    enGloss: { base: 'study', third: 'studies', past: 'studied', gerund: 'studying' }
  },
  学: {
    pos: 'verb',
    features: ['action', 'study'],
    valence: { subjFeatures: ['human'], objFeatures: ['language', 'learnable'] },
    enGloss: { base: 'learn', third: 'learns', past: 'learned', gerund: 'learning' }
  },
  爱: {
    pos: 'verb',
    features: ['psych', 'stative'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'animal', 'food', 'place'] },
    enGloss: { base: 'love', third: 'loves', past: 'loved', gerund: 'loving' }
  },
  喜欢: {
    pos: 'verb',
    features: ['psych', 'stative'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'food', 'drink', 'animal', 'object', 'place'] },
    enGloss: { base: 'like', third: 'likes', past: 'liked', gerund: 'liking' }
  },
  认识: {
    pos: 'verb',
    features: ['cognition', 'stative'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'writable'] },
    enGloss: { base: 'know', third: 'knows', past: 'knew', gerund: 'knowing' }
  },
  知道: {
    pos: 'verb',
    features: ['cognition', 'stative'],
    valence: { subjFeatures: ['human'], objFeatures: ['abstract', 'name'] },
    enGloss: { base: 'know', third: 'knows', past: 'knew', gerund: 'knowing' }
  },
  住: {
    pos: 'verb',
    features: ['stative', 'locative'],
    valence: { subjFeatures: ['human'], objFeatures: ['place'], takesPlace: true },
    enGloss: { base: 'live', third: 'lives', past: 'lived', gerund: 'living' }
  },
  坐: {
    pos: 'verb',
    features: ['action', 'transport'],
    valence: { subjFeatures: ['human'], objFeatures: ['vehicle', 'furniture'] },
    enGloss: { base: 'sit / take', third: 'sits / takes', past: 'sat / took', gerund: 'sitting' }
  },
  开: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['vehicle', 'device'] },
    enGloss: { base: 'drive / open', third: 'drives / opens', past: 'drove / opened', gerund: 'driving' }
  },
  找: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'object', 'place'] },
    enGloss: { base: 'look for', third: 'looks for', past: 'looked for', gerund: 'looking for' }
  },
  等: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'vehicle'] },
    enGloss: { base: 'wait for', third: 'waits for', past: 'waited for', gerund: 'waiting for' }
  },
  问: {
    pos: 'verb',
    features: ['action', 'speech'],
    valence: { subjFeatures: ['human'], objFeatures: ['human', 'askable'], takesDoubleObj: true },
    enGloss: { base: 'ask', third: 'asks', past: 'asked', gerund: 'asking' }
  },
  帮助: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['human'] },
    enGloss: { base: 'help', third: 'helps', past: 'helped', gerund: 'helping' }
  },
  穿: {
    pos: 'verb',
    features: ['action'],
    valence: { subjFeatures: ['human'], objFeatures: ['wearable'] },
    enGloss: { base: 'wear', third: 'wears', past: 'wore', gerund: 'wearing' }
  },
  休息: {
    pos: 'verb',
    features: ['action', 'intransitive'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    enGloss: { base: 'rest', third: 'rests', past: 'rested', gerund: 'resting' }
  },
  请: {
    pos: 'verb',
    features: ['polite', 'action'],
    valence: { subjFeatures: ['human'], objFeatures: ['human'] },
    enGloss: { base: 'please / invite', third: 'invites', past: 'invited', gerund: 'inviting' }
  },

  // --------------------------------------------------------------------------
  // 10. SEPARABLE VERBS (离合词 — Cannot take a direct object after VO!)
  // --------------------------------------------------------------------------
  上课: {
    pos: 'verb',
    features: ['action', 'separable', 'school'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['上', '课'],
    enGloss: { base: 'attend class', third: 'attends class', past: 'attended class', gerund: 'attending class' }
  },
  下课: {
    pos: 'verb',
    features: ['action', 'separable', 'school'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['下', '课'],
    enGloss: { base: 'finish class', third: 'finishes class', past: 'finished class', gerund: 'finishing class' }
  },
  上班: {
    pos: 'verb',
    features: ['action', 'separable', 'work'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['上', '班'],
    enGloss: { base: 'go to work', third: 'goes to work', past: 'went to work', gerund: 'going to work' }
  },
  下班: {
    pos: 'verb',
    features: ['action', 'separable', 'work'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['下', '班'],
    enGloss: { base: 'get off work', third: 'gets off work', past: 'got off work', gerund: 'getting off work' }
  },
  吃饭: {
    pos: 'verb',
    features: ['action', 'separable', 'consumption'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['吃', '饭'],
    enGloss: { base: 'eat a meal', third: 'eats a meal', past: 'ate a meal', gerund: 'eating a meal' }
  },
  做饭: {
    pos: 'verb',
    features: ['action', 'separable', 'cooking'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['做', '饭'],
    enGloss: { base: 'cook', third: 'cooks', past: 'cooked', gerund: 'cooking' }
  },
  睡觉: {
    pos: 'verb',
    features: ['action', 'separable', 'rest'],
    valence: { subjFeatures: ['human', 'animal'], takesPlace: true },
    isSeparable: true,
    sepParts: ['睡', '觉'],
    enGloss: { base: 'sleep', third: 'sleeps', past: 'slept', gerund: 'sleeping' }
  },
  唱歌: {
    pos: 'verb',
    features: ['action', 'separable', 'music'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['唱', '歌'],
    enGloss: { base: 'sing', third: 'sings', past: 'sang', gerund: 'singing' }
  },
  读书: {
    pos: 'verb',
    features: ['action', 'separable', 'study'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['读', '书'],
    enGloss: { base: 'read / study', third: 'reads', past: 'read', gerund: 'reading' }
  },
  看书: {
    pos: 'verb',
    features: ['action', 'separable', 'study'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['看', '书'],
    enGloss: { base: 'read a book', third: 'reads a book', past: 'read a book', gerund: 'reading a book' }
  },
  看病: {
    pos: 'verb',
    features: ['action', 'separable', 'medical'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['看', '病'],
    enGloss: { base: 'see a doctor', third: 'sees a doctor', past: 'saw a doctor', gerund: 'seeing a doctor' }
  },
  说话: {
    pos: 'verb',
    features: ['action', 'separable', 'speech'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['说', '话'],
    enGloss: { base: 'speak / talk', third: 'speaks', past: 'spoke', gerund: 'speaking' }
  },
  打电话: {
    pos: 'verb',
    features: ['action', 'separable', 'communication'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['打', '电话'],
    enGloss: { base: 'make a phone call', third: 'makes a phone call', past: 'made a phone call', gerund: 'making a phone call' }
  },
  聊天儿: {
    pos: 'verb',
    features: ['action', 'separable', 'social'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['聊', '天儿'],
    enGloss: { base: 'chat', third: 'chats', past: 'chatted', gerund: 'chatting' }
  },
  聊天: {
    pos: 'verb',
    features: ['action', 'separable', 'social'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['聊', '天'],
    enGloss: { base: 'chat', third: 'chats', past: 'chatted', gerund: 'chatting' }
  },
  跳舞: {
    pos: 'verb',
    features: ['action', 'separable'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['跳', '舞'],
    enGloss: { base: 'dance', third: 'dances', past: 'danced', gerund: 'dancing' }
  },
  见面: {
    pos: 'verb',
    features: ['action', 'separable', 'social'],
    valence: { subjFeatures: ['human'], takesPlace: true },
    isSeparable: true,
    sepParts: ['见', '面'],
    enGloss: { base: 'meet up', third: 'meets up', past: 'met up', gerund: 'meeting up' }
  },
  帮忙: {
    pos: 'verb',
    features: ['action', 'separable'],
    valence: { subjFeatures: ['human'] },
    isSeparable: true,
    sepParts: ['帮', '忙'],
    enGloss: { base: 'help out', third: 'helps out', past: 'helped out', gerund: 'helping out' }
  },

  // --------------------------------------------------------------------------
  // 11. COMMON ADJECTIVES (常用形容词)
  // --------------------------------------------------------------------------
  好: { pos: 'adj', features: ['adj', 'gradable', 'positive'] },
  大: { pos: 'adj', features: ['adj', 'gradable', 'size'] },
  小: { pos: 'adj', features: ['adj', 'gradable', 'size'] },
  多: { pos: 'adj', features: ['adj', 'gradable', 'quantity'] },
  少: { pos: 'adj', features: ['adj', 'gradable', 'quantity'] },
  高: { pos: 'adj', features: ['adj', 'gradable', 'size'] },
  新: { pos: 'adj', features: ['adj', 'gradable'] },
  热: { pos: 'adj', features: ['adj', 'gradable', 'weather', 'temperature'] },
  冷: { pos: 'adj', features: ['adj', 'gradable', 'weather', 'temperature'] },
  快: { pos: 'adj', features: ['adj', 'gradable', 'speed'] },
  慢: { pos: 'adj', features: ['adj', 'gradable', 'speed'] },
  贵: { pos: 'adj', features: ['adj', 'gradable', 'price'] },
  便宜: { pos: 'adj', features: ['adj', 'gradable', 'price'] },
  高兴: { pos: 'adj', features: ['adj', 'gradable', 'emotion', 'human_pred'] },
  漂亮: { pos: 'adj', features: ['adj', 'gradable', 'appearance'] },
  忙: { pos: 'adj', features: ['adj', 'gradable', 'human_pred'] },
  累: { pos: 'adj', features: ['adj', 'gradable', 'human_pred'] },
  好吃: { pos: 'adj', features: ['adj', 'gradable', 'food_pred'] },
  好喝: { pos: 'adj', features: ['adj', 'gradable', 'drink_pred'] },
  好看: { pos: 'adj', features: ['adj', 'gradable', 'appearance'] },
  远: { pos: 'adj', features: ['adj', 'gradable', 'distance'] },
  近: { pos: 'adj', features: ['adj', 'gradable', 'distance'] },

  // --------------------------------------------------------------------------
  // 12. COMMON EXPRESSIONS & GREETINGS (常用语)
  // --------------------------------------------------------------------------
  你好: { pos: 'expression', features: ['greeting', 'clause'] },
  您好: { pos: 'expression', features: ['greeting', 'polite', 'clause'] },
  谢谢: { pos: 'expression', features: ['greeting', 'polite', 'gratitude'] },
  不客气: { pos: 'expression', features: ['greeting', 'polite', 'clause'] },
  对不起: { pos: 'expression', features: ['greeting', 'apology', 'clause'] },
  没关系: { pos: 'expression', features: ['greeting', 'response', 'clause'] },
  再见: { pos: 'expression', features: ['greeting', 'farewell'] },
  请问: { pos: 'expression', features: ['polite', 'opener'] }
};

const PLACE_SUFFIXES = ['店', '院', '校', '馆', '场', '室', '家', '站'];
const TIME_SUFFIXES = ['月', '年', '日', '号', '点', '分'];
const FOOD_SUFFIXES = ['菜', '饭', '面', '果'];
const DRINK_SUFFIXES = ['茶', '水', '奶'];
const HUMAN_ROLE_SUFFIXES = ['师', '生', '员', '长'];
const CLAUSE_PUNCT_REGEX = /[，。！？、；：“”‘’,!?;:]/;

/**
 * Derives basic English verb/noun inflections from a raw dictionary gloss
 * when explicit `enGloss` metadata is absent.
 */
function inferEnGloss(pos, rawMeaning = '') {
  const firstGloss = String(rawMeaning || '')
    .split(/[;/]/)[0]
    .replace(/\([^)]*\)/g, '')
    .trim();
  if (!firstGloss) return null;

  if (pos === 'verb' || pos === 'modal') {
    const base = firstGloss.replace(/^to\s+/i, '').trim();
    if (!base) return null;
    const head = base.split(/\s+/)[0];
    const rest = base.slice(head.length);
    const thirdHead = /(?:s|sh|ch|x|z|o)$/i.test(head)
      ? `${head}es`
      : /[^aeiou]y$/i.test(head)
      ? `${head.slice(0, -1)}ies`
      : `${head}s`;
    const pastHead = /e$/i.test(head)
      ? `${head}d`
      : /[^aeiou]y$/i.test(head)
      ? `${head.slice(0, -1)}ied`
      : `${head}ed`;
    const gerundHead = /[^e]e$/i.test(head)
      ? `${head.slice(0, -1)}ing`
      : `${head}ing`;

    return {
      base,
      third: `${thirdHead}${rest}`,
      past: `${pastHead}${rest}`,
      gerund: `${gerundHead}${rest}`
    };
  }

  if (pos === 'noun') {
    const singular = firstGloss.replace(/^(a|an|the)\s+/i, '').trim();
    if (!singular) return null;
    const plural = /(?:s|sh|ch|x|z)$/i.test(singular)
      ? `${singular}es`
      : /[^aeiou]y$/i.test(singular)
      ? `${singular.slice(0, -1)}ies`
      : `${singular}s`;
    return { singular, plural };
  }

  return null;
}

/**
 * Deterministic morphological & English-gloss inference engine for out-of-HSK
 * or user-imported words that are not present in the static lexicon or core ontology.
 */
export function inferMorphologicalLinguistics(rawWord = {}) {
  const hanzi = String(rawWord?.hanzi || rawWord?.simplified || rawWord?.s || '').trim();
  const meaning = String(rawWord?.meaning || rawWord?.english || '').trim();
  const ictclasTags = rawWord?.ictclasPos || rawWord?.p || rawWord?.posTags || [];
  const ictclasPos = mapIctclasTagsToPos(ictclasTags);

  let pos = ictclasPos || null;
  const features = [];
  const classifiers = [];

  const pushUnique = (arr, val) => {
    if (val && !arr.includes(val)) arr.push(val);
  };

  // Rule 1: Long expressions or phrases with clause punctuation
  if (hanzi.length >= 5 || CLAUSE_PUNCT_REGEX.test(hanzi)) {
    return {
      pos: 'expression',
      features: ['clause'],
      valence: null,
      classifiers: [],
      isSeparable: false,
      sepParts: null,
      enGloss: null
    };
  }

  // Rule 2: Morphological suffix & prefix inference
  if (hanzi.length > 0) {
    const lastChar = hanzi[hanzi.length - 1];

    if (lastChar === '国') {
      pos = 'place';
      pushUnique(features, 'place');
      pushUnique(features, 'country');
    } else if (lastChar === '人') {
      pos = 'noun';
      pushUnique(features, 'human');
      pushUnique(classifiers, '个');
      pushUnique(classifiers, '位');
    } else if (lastChar === '语' || lastChar === '文') {
      pos = 'noun';
      pushUnique(features, 'language');
      pushUnique(features, 'learnable');
    } else if (PLACE_SUFFIXES.includes(lastChar)) {
      pos = 'place';
      pushUnique(features, 'place');
      pushUnique(features, 'indoor');
      pushUnique(classifiers, '家');
    } else if (TIME_SUFFIXES.includes(lastChar) || hanzi.startsWith('星期')) {
      pos = 'time';
      pushUnique(features, 'time');
    } else if (FOOD_SUFFIXES.includes(lastChar)) {
      pos = 'noun';
      pushUnique(features, 'food');
      pushUnique(features, 'buyable');
    } else if (DRINK_SUFFIXES.includes(lastChar)) {
      pos = 'noun';
      pushUnique(features, 'drink');
      pushUnique(features, 'buyable');
      pushUnique(classifiers, '杯');
    } else if (HUMAN_ROLE_SUFFIXES.includes(lastChar)) {
      pos = 'noun';
      pushUnique(features, 'human');
      pushUnique(classifiers, '位');
      pushUnique(classifiers, '个');
    }
  }

  // Rule 3: English gloss fallback when morphological rules didn't decide POS
  if (!pos && meaning) {
    if (/^\s*(?:measure word|classifier)\b/i.test(meaning) || /\b(?:measure word|classifier)\b/i.test(meaning)) {
      pos = 'classifier';
      pushUnique(features, 'classifier');
    } else if (/^\s*to\s+[a-z]/i.test(meaning)) {
      pos = 'verb';
      pushUnique(features, 'action');
    }
  }

  // Default fallback POS
  if (!pos) {
    pos = 'noun';
  }

  if (pos === 'classifier') pushUnique(features, 'classifier');
  if (pos === 'time') pushUnique(features, 'time');
  if (pos === 'place') pushUnique(features, 'place');
  if (pos === 'adj') pushUnique(features, 'adj');
  if (pos === 'adv') pushUnique(features, 'adverb');
  if (pos === 'particle') pushUnique(features, 'particle');

  const valence =
    pos === 'verb'
      ? { subjFeatures: ['human'] }
      : null;

  return {
    pos,
    features,
    valence,
    classifiers,
    isSeparable: false,
    sepParts: null,
    enGloss: inferEnGloss(pos, meaning)
  };
}

/**
 * Resolves full linguistic metadata for a word in strict 4-tier priority order:
 * 1. Explicit `userOverrides[hanzi]` saved by the learner.
 * 2. Loaded `getLexiconEntry(hanzi)` from `/data/hsk_lexicon.json`.
 * 3. Built-in `CORE_SEMANTIC_ONTOLOGY[hanzi]`.
 * 4. Deterministic morphological & English-gloss inference rules.
 */
export function enrichWordEntry(rawWord, userOverrides = {}) {
  const safeWord =
    typeof rawWord === 'string'
      ? { hanzi: rawWord.trim() }
      : rawWord && typeof rawWord === 'object'
      ? rawWord
      : {};

  const hanzi = String(safeWord.hanzi || safeWord.simplified || safeWord.s || '').trim();
  const overrideEntry =
    hanzi && userOverrides && typeof userOverrides === 'object'
      ? userOverrides[hanzi] || null
      : null;
  const staticEntry = hanzi ? getLexiconEntry(hanzi) : null;
  const coreEntry = hanzi ? CORE_SEMANTIC_ONTOLOGY[hanzi] || null : null;
  const inferred = inferMorphologicalLinguistics({
    ...safeWord,
    hanzi,
    ictclasPos: staticEntry?.ictclasPos || safeWord.ictclasPos || safeWord.p
  });

  // Strict priority order: userOverrides > staticLexicon > coreOntology > morphological inference
  const tiers = [overrideEntry, staticEntry, coreEntry, inferred].filter(Boolean);

  const pickFirst = (selector, fallback = null) => {
    for (let i = 0; i < tiers.length; i++) {
      const val = selector(tiers[i]);
      if (val !== undefined && val !== null && val !== '') return val;
    }
    return fallback;
  };

  const pickFirstNonEmptyArray = (selector) => {
    for (let i = 0; i < tiers.length; i++) {
      const val = selector(tiers[i]);
      if (Array.isArray(val) && val.length > 0) return [...val];
    }
    return [];
  };

  const pos = pickFirst((t) => t.pos, 'noun');
  const features = pickFirstNonEmptyArray((t) => t.features);
  const valence = pickFirst((t) => (t.valence && typeof t.valence === 'object' ? t.valence : null), null);
  const classifiers = pickFirstNonEmptyArray((t) => t.classifiers);
  const isSeparable = Boolean(
    pickFirst(
      (t) => (typeof t.isSeparable === 'boolean' ? t.isSeparable : null),
      false
    )
  );
  const sepParts = pickFirst(
    (t) => (Array.isArray(t.sepParts) && t.sepParts.length === 2 ? [...t.sepParts] : null),
    null
  );
  const enGloss = pickFirst(
    (t) => (t.enGloss && typeof t.enGloss === 'object' ? t.enGloss : null),
    inferEnGloss(pos, safeWord.meaning || safeWord.english || staticEntry?.meaning || '')
  );

  const hskLevels = pickFirstNonEmptyArray((t) => t.hskLevels);
  const freqRank = pickFirst(
    (t) => (typeof t.freqRank === 'number' && Number.isFinite(t.freqRank) ? t.freqRank : null),
    null
  );
  const radical = pickFirst((t) => t.radical, null);

  const enrichmentSource = overrideEntry
    ? 'user_override'
    : staticEntry
    ? 'static_lexicon'
    : coreEntry
    ? 'core_ontology'
    : 'morphological_inference';

  const linguistics = {
    pos,
    features,
    valence,
    classifiers,
    isSeparable,
    sepParts,
    enGloss,
    hskLevels,
    freqRank,
    radical,
    enrichmentSource
  };

  return {
    ...safeWord,
    hanzi: hanzi || safeWord.hanzi || '',
    pinyin: safeWord.pinyin || staticEntry?.pinyin || '',
    pinyinNum: safeWord.pinyinNum || staticEntry?.pinyinNum || '',
    meaning: safeWord.meaning || safeWord.english || staticEntry?.meaning || '',
    pos,
    features,
    valence,
    classifiers,
    isSeparable,
    sepParts,
    enGloss,
    hskLevels,
    freqRank,
    radical,
    enrichmentSource,
    linguistics
  };
}

/**
 * Enriches an array of vocabulary word entries using the 4-tier resolver.
 */
export function enrichWordsCollection(words = [], userOverrides = {}) {
  if (!Array.isArray(words)) return [];
  return words.map((word) => enrichWordEntry(word, userOverrides));
}

const POS_DISPLAY_LABELS = {
  pron: 'Pronoun',
  noun: 'Noun',
  verb: 'Verb',
  modal: 'Modal Verb',
  adj: 'Adjective',
  adv: 'Adverb',
  time: 'Time',
  place: 'Place',
  classifier: 'Classifier 量词',
  particle: 'Particle',
  prep: 'Preposition',
  conj: 'Conjunction',
  num: 'Number',
  expression: 'Expression'
};

const FEATURE_SUBTYPE_LABELS = {
  drink: 'Drink',
  food: 'Food',
  fruit: 'Fruit',
  human: 'Person',
  family: 'Family',
  country: 'Country',
  city: 'City',
  language: 'Language',
  animal: 'Animal',
  vehicle: 'Transport',
  readable: 'Readable',
  watchable: 'Media',
  wearable: 'Clothing',
  weather: 'Weather',
  greeting: 'Greeting'
};

/**
 * Produces concise UI badge labels for an enriched word entry.
 * Example outputs:
 *  - ['Verb', 'Separable 离合词']
 *  - ['Noun • Drink', 'CL: 杯']
 *  - ['Place • Country']
 */
export function getLinguisticBadgeSummary(enrichedWord) {
  if (!enrichedWord || typeof enrichedWord !== 'object') return [];

  const meta = enrichedWord.linguistics || enrichedWord;
  const pos = meta.pos || 'noun';
  const features = Array.isArray(meta.features) ? meta.features : [];
  const classifiers = Array.isArray(meta.classifiers) ? meta.classifiers : [];
  const badges = [];

  const basePosLabel = POS_DISPLAY_LABELS[pos] || 'Word';

  // Pick one meaningful semantic subtype to pair with Noun/Place
  let subtypeLabel = null;
  if (pos === 'noun' || pos === 'place') {
    for (let i = 0; i < features.length; i++) {
      const mapped = FEATURE_SUBTYPE_LABELS[features[i]];
      if (mapped) {
        subtypeLabel = mapped;
        break;
      }
    }
  }

  badges.push(subtypeLabel ? `${basePosLabel} • ${subtypeLabel}` : basePosLabel);

  if (meta.isSeparable) {
    badges.push('Separable 离合词');
  }

  if (classifiers.length > 0 && pos !== 'classifier') {
    badges.push(`CL: ${classifiers.slice(0, 2).join('/')}`);
  }

  return badges;
}
