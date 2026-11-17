// ============================================================================
// FULL MANDARIN PINYIN-TO-HANZI 4-TONE DICTIONARY (~410+ VALID SYLLABLES)
// & STRICT MANDARIN PHONOTACTIC COMPATIBILITY ENGINE
// Maps each toneless Pinyin syllable to [Tone 1 (55), Tone 2 (35), Tone 3 (214), Tone 4 (51)]
// Empty string "" indicates a true phonological tone gap in Standard Mandarin.
// NEVER falls back to "ba" (八/拔/把/爸).
// ============================================================================

export const PINYIN_TONE_HANZI_MAP: Record<string, [string, string, string, string]> = {
  // Standalone Zero-Initial Vowels
  a: ['阿', '啊', '', '啊'],
  o: ['喔', '哦', '', ''],
  e: ['婀', '鹅', '', '饿'],
  ai: ['哀', '挨', '矮', '爱'],
  ei: ['欸', '', '', ''],
  ao: ['凹', '熬', '袄', '奥'],
  ou: ['欧', '', '偶', '怄'],
  an: ['安', '', '俺', '暗'],
  en: ['恩', '', '', '摁'],
  ang: ['肮', '昂', '', '盎'],
  eng: ['鞥', '', '', ''],
  er: ['', '儿', '耳', '二'],

  // Zero-Initial Palatal (y-) & Labial (w-) Orthographic Series
  yi: ['衣', '姨', '椅', '意'],
  ya: ['鸭', '牙', '雅', '亚'],
  ye: ['椰', '爷', '也', '夜'],
  yao: ['腰', '摇', '咬', '要'],
  you: ['优', '由', '有', '右'],
  yan: ['烟', '言', '眼', '燕'],
  yin: ['因', '银', '引', '印'],
  yang: ['央', '羊', '养', '样'],
  ying: ['英', '迎', '影', '硬'],
  yong: ['拥', '喁', '永', '用'],
  yu: ['迂', '鱼', '雨', '玉'],
  yue: ['约', '', '', '月'],
  yuan: ['冤', '元', '远', '院'],
  yun: ['晕', '云', '允', '运'],

  wu: ['屋', '无', '五', '物'],
  wa: ['蛙', '娃', '瓦', '袜'],
  wo: ['窝', '', '我', '卧'],
  wai: ['歪', '', '崴', '外'],
  wei: ['威', '围', '伟', '味'],
  wan: ['弯', '完', '晚', '万'],
  wen: ['温', '文', '吻', '问'],
  wang: ['汪', '王', '往', '忘'],
  weng: ['翁', '', '蓊', '瓮'],

  // Bilabial: b
  ba: ['八', '拔', '把', '爸'],
  bo: ['波', '伯', '跛', '播'],
  bai: ['掰', '白', '百', '拜'],
  bei: ['杯', '', '北', '倍'],
  bao: ['包', '雹', '饱', '报'],
  ban: ['班', '', '板', '半'],
  ben: ['奔', '', '本', '笨'],
  bang: ['帮', '', '榜', '棒'],
  beng: ['崩', '甭', '绷', '蹦'],
  bi: ['逼', '鼻', '比', '必'],
  bie: ['憋', '别', '瘪', ''],
  biao: ['标', '', '表', '鳔'],
  bian: ['边', '', '扁', '变'],
  bin: ['宾', '', '', '鬓'],
  bing: ['冰', '', '饼', '病'],
  bu: ['逋', '醭', '补', '布'],

  // Bilabial: p
  pa: ['趴', '爬', '', '怕'],
  po: ['坡', '婆', '叵', '破'],
  pai: ['拍', '排', '迫', '派'],
  pei: ['胚', '陪', '', '配'],
  pao: ['抛', '袍', '跑', '泡'],
  pou: ['剖', '抔', '掊', ''],
  pan: ['潘', '盘', '', '判'],
  pen: ['喷', '盆', '', ''],
  pang: ['乓', '旁', '耪', '胖'],
  peng: ['烹', '朋', '捧', '碰'],
  pi: ['批', '皮', '匹', '屁'],
  pie: ['瞥', '', '撇', ''],
  piao: ['飘', '瓢', '瞟', '票'],
  pian: ['篇', '骈', '谝', '骗'],
  pin: ['拼', '贫', '品', '聘'],
  ping: ['乒', '平', '', ''],
  pu: ['扑', '葡', '普', '瀑'],

  // Bilabial: m
  ma: ['妈', '麻', '马', '骂'],
  mo: ['摸', '魔', '抹', '墨'],
  mai: ['', '埋', '买', '卖'],
  mei: ['', '梅', '美', '妹'],
  mao: ['猫', '毛', '卯', '帽'],
  mou: ['哞', '谋', '某', ''],
  man: ['颟', '瞒', '满', '慢'],
  men: ['闷', '门', '', '焖'],
  mang: ['', '忙', '莽', ''],
  meng: ['蒙', '盟', '猛', '梦'],
  mi: ['咪', '迷', '米', '密'],
  mie: ['咩', '', '', '灭'],
  miao: ['喵', '苗', '秒', '妙'],
  miu: ['', '', '', '谬'],
  mian: ['', '棉', '免', '面'],
  min: ['', '民', '敏', ''],
  ming: ['', '明', '酩', '命'],
  mu: ['', '模', '母', '木'],

  // Labiodental: f
  fa: ['发', '罚', '法', '珐'],
  fo: ['', '佛', '', ''],
  fei: ['飞', '肥', '匪', '费'],
  fou: ['', '', '否', ''],
  fan: ['翻', '烦', '反', '饭'],
  fen: ['分', '坟', '粉', '份'],
  fang: ['方', '房', '访', '放'],
  feng: ['风', '逢', '讽', '奉'],
  fu: ['夫', '服', '府', '父'],

  // Alveolar: d
  da: ['搭', '答', '打', '大'],
  de: ['', '德', '', ''],
  dai: ['呆', '', '歹', '带'],
  dei: ['', '', '得', ''],
  dao: ['刀', '', '岛', '到'],
  dou: ['都', '', '抖', '豆'],
  dan: ['单', '', '胆', '但'],
  den: ['', '', '', '扽'],
  dang: ['当', '', '党', '档'],
  deng: ['灯', '', '等', '凳'],
  dong: ['东', '', '懂', '动'],
  di: ['低', '敌', '底', '弟'],
  dia: ['', '', '嗲', ''],
  die: ['爹', '蝶', '', ''],
  diao: ['雕', '', '', '掉'],
  diu: ['丢', '', '', ''],
  dian: ['颠', '', '点', '电'],
  ding: ['丁', '', '顶', '定'],
  du: ['督', '读', '堵', '度'],
  duo: ['多', '夺', '朵', '跺'],
  dui: ['堆', '', '', '对'],
  duan: ['端', '', '短', '段'],
  dun: ['蹲', '', '盹', '盾'],

  // Alveolar: t
  ta: ['他', '', '塔', '踏'],
  te: ['', '', '', '特'],
  tai: ['胎', '台', '', '太'],
  tei: ['忒', '', '', ''],
  tao: ['掏', '逃', '讨', '套'],
  tou: ['偷', '头', '', '透'],
  tan: ['摊', '谈', '毯', '叹'],
  tang: ['汤', '糖', '躺', '烫'],
  teng: ['', '疼', '', ''],
  tong: ['通', '同', '统', '痛'],
  ti: ['踢', '题', '体', '替'],
  tie: ['贴', '', '铁', '餮'],
  tiao: ['挑', '条', '窕', '跳'],
  tian: ['天', '田', '舔', '掭'],
  ting: ['听', '停', '挺', '梃'],
  tu: ['突', '图', '土', '兔'],
  tuo: ['拖', '驼', '妥', '拓'],
  tui: ['推', '颓', '腿', '退'],
  tuan: ['湍', '团', '', '彖'],
  tun: ['吞', '屯', '氽', '褪'],

  // Alveolar: n
  na: ['', '拿', '哪', '那'],
  ne: ['', '', '', '呐'],
  nai: ['', '', '奶', '耐'],
  nei: ['', '', '馁', '内'],
  nao: ['孬', '挠', '脑', '闹'],
  nou: ['', '', '', '耨'],
  nan: ['囡', '难', '腩', ''],
  nen: ['', '', '', '嫩'],
  nang: ['', '囊', '曩', '齉'],
  neng: ['', '能', '', ''],
  nong: ['', '农', '', '弄'],
  ni: ['妮', '泥', '你', '逆'],
  nie: ['捏', '', '', '孽'],
  niao: ['', '', '鸟', '尿'],
  niu: ['妞', '牛', '扭', '拗'],
  nian: ['拈', '年', '捻', '念'],
  nin: ['', '您', '', ''],
  niang: ['', '娘', '', '酿'],
  ning: ['', '宁', '拧', '佞'],
  nu: ['', '奴', '努', '怒'],
  nuo: ['', '挪', '', '诺'],
  nuan: ['', '', '暖', ''],
  nun: ['', '黁', '', ''],
  nv: ['', '', '女', '恧'],
  nü: ['', '', '女', '恧'],
  nve: ['', '', '', '虐'],
  nüe: ['', '', '', '虐'],

  // Alveolar: l
  la: ['拉', '旯', '喇', '辣'],
  le: ['勒', '', '', '乐'],
  lai: ['', '来', '', '赖'],
  lei: ['勒', '雷', '垒', '累'],
  lao: ['捞', '劳', '老', '烙'],
  lou: ['搂', '楼', '篓', '漏'],
  lan: ['', '蓝', '览', '烂'],
  lang: ['啷', '狼', '朗', '浪'],
  leng: ['', '棱', '冷', '愣'],
  long: ['', '龙', '拢', ''],
  li: ['哩', '离', '里', '力'],
  lia: ['', '', '俩', ''],
  lie: ['咧', '', '', '列'],
  liao: ['撩', '聊', '燎', '料'],
  liu: ['溜', '流', '柳', '六'],
  lian: ['', '连', '脸', '练'],
  lin: ['', '林', '凛', '吝'],
  liang: ['', '凉', '两', '亮'],
  ling: ['拎', '零', '领', '令'],
  lu: ['撸', '炉', '鲁', '路'],
  luo: ['啰', '罗', '裸', '落'],
  luan: ['', '峦', '卵', '乱'],
  lun: ['抡', '轮', '', '论'],
  lv: ['', '驴', '旅', '绿'],
  lü: ['', '驴', '旅', '绿'],
  lve: ['', '', '', '略'],
  lüe: ['', '', '', '略'],

  // Velar: g
  ga: ['嘎', '噶', '尕', '尬'],
  ge: ['哥', '格', '葛', '个'],
  gai: ['该', '', '改', '盖'],
  gei: ['', '', '给', ''],
  gao: ['高', '', '搞', '告'],
  gou: ['沟', '', '狗', '够'],
  gan: ['甘', '', '敢', '赣'],
  gen: ['跟', '哏', '艮', '亘'],
  gang: ['刚', '', '岗', '杠'],
  geng: ['耕', '', '梗', '更'],
  gong: ['工', '', '拱', '共'],
  gu: ['姑', '', '古', '故'],
  gua: ['瓜', '', '寡', '挂'],
  guo: ['锅', '国', '果', '过'],
  guai: ['乖', '', '拐', '怪'],
  gui: ['归', '', '鬼', '贵'],
  guan: ['关', '', '馆', '惯'],
  gun: ['', '', '滚', '棍'],
  guang: ['光', '', '广', '逛'],

  // Velar: k
  ka: ['咖', '', '卡', '喀'],
  ke: ['科', '壳', '可', '课'],
  kai: ['开', '', '凯', '忾'],
  kei: ['剋', '', '', ''],
  kao: ['尻', '', '考', '靠'],
  kou: ['抠', '', '口', '扣'],
  kan: ['刊', '', '砍', '看'],
  ken: ['', '', '肯', '掯'],
  kang: ['康', '扛', '', '抗'],
  keng: ['坑', '', '', ''],
  kong: ['空', '', '恐', '控'],
  ku: ['哭', '', '苦', '裤'],
  kua: ['夸', '', '垮', '跨'],
  kuo: ['', '', '', '阔'],
  kuai: ['', '', '蒯', '快'],
  kui: ['亏', '葵', '傀', '愧'],
  kuan: ['宽', '', '款', ''],
  kun: ['昆', '', '捆', '困'],
  kuang: ['筐', '狂', '夼', '况'],

  // Velar: h
  ha: ['哈', '蛤', '', ''],
  he: ['喝', '河', '', '贺'],
  hai: ['嗨', '孩', '海', '害'],
  hei: ['黑', '', '', ''],
  hao: ['蒿', '毫', '好', '号'],
  hou: ['齁', '猴', '吼', '后'],
  han: ['酣', '寒', '喊', '汉'],
  hen: ['', '痕', '很', '恨'],
  hang: ['夯', '航', '', '沆'],
  heng: ['哼', '恒', '', '横'],
  hong: ['烘', '红', '哄', '讧'],
  hu: ['呼', '湖', '虎', '护'],
  hua: ['花', '华', '', '话'],
  huo: ['豁', '活', '火', '或'],
  huai: ['', '怀', '', '坏'],
  hui: ['灰', '回', '毁', '会'],
  huan: ['欢', '环', '缓', '换'],
  hun: ['昏', '魂', '', '混'],
  huang: ['荒', '黄', '谎', '晃'],

  // Alveolopalatal: j
  ji: ['机', '急', '几', '记'],
  jia: ['家', '颊', '假', '价'],
  jie: ['接', '节', '姐', '借'],
  jiao: ['交', '嚼', '脚', '叫'],
  jiu: ['揪', '', '九', '就'],
  jian: ['间', '', '简', '见'],
  jin: ['今', '', '紧', '进'],
  jiang: ['江', '', '讲', '匠'],
  jing: ['京', '', '井', '静'],
  jiong: ['扃', '', '窘', ''],
  ju: ['居', '局', '举', '句'],
  jue: ['撅', '决', '', '倔'],
  juan: ['捐', '', '卷', '倦'],
  jun: ['军', '', '', '俊'],

  // Alveolopalatal: q
  qi: ['七', '齐', '起', '气'],
  qia: ['掐', '', '卡', '恰'],
  qie: ['切', '茄', '且', '窃'],
  qiao: ['敲', '桥', '巧', '俏'],
  qiu: ['秋', '球', '', ''],
  qian: ['千', '钱', '浅', '欠'],
  qin: ['亲', '琴', '寝', '沁'],
  qiang: ['枪', '强', '抢', '呛'],
  qing: ['轻', '情', '请', '庆'],
  qiong: ['', '穷', '', ''],
  qu: ['区', '渠', '取', '去'],
  que: ['缺', '瘸', '', '确'],
  quan: ['圈', '全', '犬', '劝'],
  qun: ['逡', '群', '', ''],

  // Alveolopalatal: x
  xi: ['西', '习', '洗', '细'],
  xia: ['瞎', '霞', '', '下'],
  xie: ['些', '鞋', '写', '谢'],
  xiao: ['消', '淆', '小', '笑'],
  xiu: ['休', '', '朽', '秀'],
  xian: ['先', '闲', '险', '现'],
  xin: ['心', '', '', '信'],
  xiang: ['香', '详', '想', '向'],
  xing: ['星', '刑', '醒', '姓'],
  xiong: ['兄', '雄', '', ''],
  xu: ['需', '徐', '许', '续'],
  xue: ['靴', '学', '雪', '血'],
  xuan: ['宣', '悬', '选', '炫'],
  xun: ['勋', '寻', '', '训'],

  // Retroflex: zh
  zha: ['扎', '炸', '眨', '诈'],
  zhe: ['遮', '折', '者', '这'],
  zhi: ['知', '直', '纸', '志'],
  zhai: ['摘', '宅', '窄', '债'],
  zhei: ['', '', '', '这'],
  zhao: ['招', '着', '找', '照'],
  zhou: ['周', '轴', '肘', '昼'],
  zhan: ['沾', '', '展', '站'],
  zhen: ['真', '', '枕', '阵'],
  zhang: ['张', '', '掌', '丈'],
  zheng: ['争', '', '整', '正'],
  zhong: ['中', '', '种', '众'],
  zhu: ['猪', '竹', '主', '住'],
  zhua: ['抓', '', '爪', ''],
  zhuo: ['桌', '浊', '', ''],
  zhuai: ['嘬', '', '跩', '拽'],
  zhui: ['追', '', '', '坠'],
  zhuan: ['专', '', '转', '赚'],
  zhun: ['谆', '', '准', ''],
  zhuang: ['装', '', '奘', '壮'],

  // Retroflex: ch
  cha: ['叉', '茶', '镲', '诧'],
  che: ['车', '', '扯', '彻'],
  chi: ['吃', '池', '尺', '翅'],
  chai: ['拆', '柴', '茝', '虿'],
  chao: ['超', '潮', '吵', '耖'],
  chou: ['抽', '愁', '丑', '臭'],
  chan: ['搀', '馋', '产', '颤'],
  chen: ['抻', '陈', '碜', '衬'],
  chang: ['昌', '常', '厂', '唱'],
  cheng: ['撑', '成', '逞', '秤'],
  chong: ['充', '虫', '宠', '铳'],
  chu: ['出', '厨', '楚', '处'],
  chua: ['欻', '', '歘', ''],
  chuo: ['戳', '', '', '绰'],
  chuai: ['搋', '膪', '揣', '踹'],
  chui: ['吹', '锤', '', ''],
  chuan: ['穿', '船', '喘', '串'],
  chun: ['春', '纯', '蠢', ''],
  chuang: ['窗', '床', '闯', '创'],

  // Retroflex: sh
  sha: ['沙', '啥', '傻', '厦'],
  she: ['奢', '舌', '舍', '社'],
  shi: ['诗', '十', '史', '是'],
  shai: ['筛', '', '色', '晒'],
  shei: ['', '谁', '', ''],
  shao: ['烧', '勺', '少', '绍'],
  shou: ['收', '熟', '手', '受'],
  shan: ['山', '', '闪', '扇'],
  shen: ['身', '神', '审', '慎'],
  shang: ['伤', '', '赏', '上'],
  sheng: ['生', '绳', '省', '胜'],
  shu: ['书', '赎', '暑', '树'],
  shua: ['刷', '', '耍', '唰'],
  shuo: ['说', '', '', '硕'],
  shuai: ['摔', '', '甩', '帅'],
  shui: ['', '谁', '水', '睡'],
  shuan: ['拴', '', '', '涮'],
  shun: ['', '', '吮', '顺'],
  shuang: ['双', '', '爽', ''],

  // Retroflex: r
  re: ['', '', '惹', '热'],
  ri: ['', '', '', '日'],
  rao: ['', '饶', '扰', '绕'],
  rou: ['', '柔', '', '肉'],
  ran: ['', '然', '染', ''],
  ren: ['', '人', '忍', '认'],
  rang: ['嚷', '瓤', '壤', '让'],
  reng: ['扔', '仍', '', ''],
  rong: ['', '容', '冗', ''],
  ru: ['', '如', '乳', '入'],
  rua: ['', '', '挼', ''],
  ruo: ['', '', '', '弱'],
  rui: ['', '蕤', '蕊', '瑞'],
  ruan: ['', '', '软', ''],
  run: ['', '', '', '润'],

  // Dental Sibilant: z
  za: ['扎', '杂', '咋', ''],
  ze: ['', '则', '', '仄'],
  zi: ['资', '', '子', '字'],
  zai: ['灾', '', '宰', '在'],
  zei: ['', '贼', '', ''],
  zao: ['糟', '凿', '早', '造'],
  zou: ['邹', '', '走', '奏'],
  zan: ['簪', '咱', '攒', '赞'],
  zen: ['', '', '怎', '谮'],
  zang: ['脏', '', '駔', '葬'],
  zeng: ['增', '', '', '赠'],
  zong: ['宗', '', '总', '纵'],
  zu: ['租', '足', '组', ''],
  zuo: ['作', '昨', '左', '坐'],
  zui: ['咀', '', '嘴', '最'],
  zuan: ['钻', '', '纂', '攥'],
  zun: ['尊', '', '撙', ''],

  // Dental Sibilant: c
  ca: ['擦', '', '礤', ''],
  ce: ['', '', '', '测'],
  ci: ['疵', '词', '此', '次'],
  cai: ['猜', '才', '采', '菜'],
  cao: ['操', '槽', '草', ''],
  cou: ['', '', '', '凑'],
  can: ['餐', '残', '惨', '灿'],
  cen: ['参', '岑', '', ''],
  cang: ['苍', '藏', '', ''],
  ceng: ['噌', '层', '', '蹭'],
  cong: ['聪', '从', '', ''],
  cu: ['粗', '徂', '', '醋'],
  cuo: ['搓', '痤', '脞', '错'],
  cui: ['催', '', '璀', '脆'],
  cuan: ['蹿', '攒', '', '窜'],
  cun: ['村', '存', '忖', '寸'],

  // Dental Sibilant: s
  sa: ['撒', '', '洒', '飒'],
  se: ['', '', '', '色'],
  si: ['思', '', '死', '四'],
  sai: ['腮', '', '', '赛'],
  sao: ['骚', '', '扫', '臊'],
  sou: ['搜', '', '叟', '嗽'],
  san: ['三', '', '伞', '散'],
  sen: ['森', '', '', ''],
  sang: ['桑', '', '嗓', '丧'],
  seng: ['僧', '', '', ''],
  song: ['松', '', '耸', '送'],
  su: ['苏', '俗', '', '诉'],
  suo: ['缩', '', '所', ''],
  sui: ['虽', '随', '髓', '岁'],
  suan: ['酸', '', '', '算'],
  sun: ['孙', '', '笋', '']
};

// ============================================================================
// EXPLICIT MANDARIN INITIAL × FINAL PHONOTACTIC COMPATIBILITY TABLE
// Strictly enforces Standard Mandarin / HSK 1 phonotactics before resolving audio.
// ============================================================================
export const MANDARIN_PHONOTACTIC_TABLE: Record<string, ReadonlySet<string>> = {
  // Zero initial (∅): standalone vowels + y-/w- orthographic series
  '': new Set([
    'a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er',
    'i', 'u', 'ü', 'v',
    'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing', 'iong',
    'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang', 'ueng',
    'üe', 'üan', 'ün', 've', 'van', 'vn'
  ]),

  // Bilabials: b, p, m (NEVER with e, uo, ua, or ü)
  b: new Set([
    'a', 'o', 'ai', 'ei', 'ao', 'an', 'en', 'ang', 'eng',
    'i', 'ie', 'iao', 'ian', 'in', 'ing', 'u'
  ]),
  p: new Set([
    'a', 'o', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
    'i', 'ie', 'iao', 'ian', 'in', 'ing', 'u'
  ]),
  m: new Set([
    'a', 'o', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
    'i', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'ing', 'u'
  ]),

  // Labiodental: f (NEVER with e, i, uo, ua, or ü)
  f: new Set(['a', 'o', 'ei', 'ou', 'an', 'en', 'ang', 'eng', 'u']),

  // Alveolars: d, t (NEVER with ua, uai, uang, or ü; en only den, ia only dia, iu only diu)
  d: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'i', 'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'ing',
    'u', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ]),
  t: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'ang', 'eng', 'ong',
    'i', 'ie', 'iao', 'ian', 'ing',
    'u', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ]),

  // Alveolar nasal & lateral: n, l (en only nen, ia only lia; includes ü & üe)
  n: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'i', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing',
    'u', 'uo', 'uan', 'un', 'uen', 'ü', 'üe', 'v', 've'
  ]),
  l: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'ang', 'eng', 'ong',
    'i', 'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing',
    'u', 'uo', 'uan', 'un', 'uen', 'ü', 'üe', 'v', 've'
  ]),

  // Velars: g, k, h (NEVER with i or ü series)
  g: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),
  k: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),
  h: new Set([
    'a', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),

  // Alveolopalatals: j, q, x (ONLY with i and ü series; NEVER with a, e, o, u series)
  j: new Set([
    'i', 'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing', 'iong',
    'ü', 'üe', 'üan', 'ün', 'v', 've', 'van', 'vn'
  ]),
  q: new Set([
    'i', 'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing', 'iong',
    'ü', 'üe', 'üan', 'ün', 'v', 've', 'van', 'vn'
  ]),
  x: new Set([
    'i', 'ia', 'ie', 'iao', 'iu', 'iou', 'ian', 'in', 'iang', 'ing', 'iong',
    'ü', 'üe', 'üan', 'ün', 'v', 've', 'van', 'vn'
  ]),

  // Retroflexes: zh, ch, sh, r (NEVER with ü or palatal i finals; a except ra, ai except rai, ei only zhei/shei, ong except shong, uai/uang except r)
  zh: new Set([
    'a', 'e', 'i', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),
  ch: new Set([
    'a', 'e', 'i', 'ai', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),
  sh: new Set([
    'a', 'e', 'i', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
    'u', 'ua', 'uo', 'uai', 'ui', 'uei', 'uan', 'un', 'uen', 'uang'
  ]),
  r: new Set([
    'e', 'i', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'ua', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ]),

  // Dental Sibilants: z, c, s (NEVER with ua, uai, uang, ueng, ü, or palatal i finals; ei only zei)
  z: new Set([
    'a', 'e', 'i', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ]),
  c: new Set([
    'a', 'e', 'i', 'ai', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ]),
  s: new Set([
    'a', 'e', 'i', 'ai', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
    'u', 'uo', 'ui', 'uei', 'uan', 'un', 'uen'
  ])
};

/**
 * Clean a raw initial or final string for phonotactic lookup.
 */
function normalizeInitialAndFinalInput(initial: string, final: string): { init: string; fin: string } {
  const rawInit = String(initial || '')
    .trim()
    .toLowerCase();
  const init = rawInit === '∅' || rawInit === 'zero' ? '' : rawInit;

  const fin = String(final || '')
    .toLowerCase()
    .replace(/\s*\(.*\)/g, '')
    .replace(/^-+/, '')
    .replace(/[āáǎà]/g, 'a')
    .replace(/[ōóǒò]/g, 'o')
    .replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/[ǖǘǚǜ]/g, 'ü')
    .trim();

  return { init, fin };
}

/**
 * Explicitly validate whether an Initial + Final combination is legal in Standard Mandarin.
 * Rejects combinations such as s+ua (sua), z+ua (zua), c+ua (cua), f+e, b+e, g+i, j+a, etc.
 */
export function isValidMandarinSyllable(initial: string, final: string): boolean {
  const { init, fin } = normalizeInitialAndFinalInput(initial, final);

  // If caller passed a complete syllable in `initial` and empty `final`
  if (!fin && init) {
    const cleanKey = init.replace(/ü/g, 'v').replace(/[^a-z]/g, '');
    return Boolean(PINYIN_TONE_HANZI_MAP[cleanKey] || PINYIN_TONE_HANZI_MAP[init]);
  }

  // Handle orthographic y / w passed as initial
  if (init === 'y') {
    const finNorm = fin.replace(/v/g, 'ü');
    return finNorm.startsWith('i') || finNorm.startsWith('ü');
  }
  if (init === 'w') {
    return fin.startsWith('u');
  }

  const allowedFinals = MANDARIN_PHONOTACTIC_TABLE[init];
  if (!allowedFinals) return false;
  return allowedFinals.has(fin) || allowedFinals.has(fin.replace(/v/g, 'ü'));
}

// ============================================================================
// DYNAMIC COURSE VOCABULARY FALLBACK SCANNER
// Scans loaded course words (pinyinNum matching `${syllable}${tone}`) if a valid
// syllable slot in PINYIN_TONE_HANZI_MAP is empty.
// ============================================================================
export interface CourseWordLike {
  hanzi?: string;
  chars?: string[];
  pinyin?: string;
  pinyinNum?: string;
  pinyinNumeric?: string[];
}

let registeredCourseWords: CourseWordLike[] = [];

export function registerCourseWordsForPhonetics(words: CourseWordLike[] = []): void {
  if (Array.isArray(words)) {
    registeredCourseWords = words;
  }
}

export function findHanziInCourseWords(
  syllableKey: string,
  toneNumber: number,
  customWords?: CourseWordLike[]
): string {
  const pool =
    Array.isArray(customWords) && customWords.length > 0
      ? customWords
      : registeredCourseWords;
  if (!pool || pool.length === 0) return '';

  const normSyl = String(syllableKey || '')
    .toLowerCase()
    .replace(/ü/g, 'v')
    .trim();
  const altSyl = normSyl.replace(/v/g, 'u');
  const target1 = `${normSyl}${toneNumber}`;
  const target2 = `${altSyl}${toneNumber}`;

  for (const w of pool) {
    if (!w || !w.hanzi) continue;
    const hanziChars = Array.isArray(w.chars) && w.chars.length > 0
      ? w.chars
      : Array.from(String(w.hanzi).trim());
    const rawNum = String(w.pinyinNum || '').toLowerCase().trim();
    if (!rawNum) continue;

    const tokens = rawNum
      .replace(/ü/g, 'v')
      .split(/[\s,;/·-]+/)
      .filter(Boolean);

    for (let i = 0; i < Math.min(tokens.length, hanziChars.length); i++) {
      const tok = tokens[i];
      if (tok === target1 || ( !normSyl.startsWith('n') && !normSyl.startsWith('l') && tok === target2 )) {
        return hanziChars[i] || '';
      }
    }
  }

  return '';
}

const TONE_VOWEL_DIACRITICS: Record<string, [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
};

export function applyToneMarkToPinyin(tonelessDisplay: string, toneNumber = 1): string {
  const idx = Math.max(0, Math.min(3, (Number(toneNumber) || 1) - 1));
  const s = String(tonelessDisplay || '').toLowerCase();
  if (!s) return '';

  if (s.includes('a')) return s.replace('a', TONE_VOWEL_DIACRITICS.a[idx]);
  if (s.includes('e')) return s.replace('e', TONE_VOWEL_DIACRITICS.e[idx]);
  if (s.includes('ou')) return s.replace('o', TONE_VOWEL_DIACRITICS.o[idx]);

  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (TONE_VOWEL_DIACRITICS[ch]) {
      return s.slice(0, i) + TONE_VOWEL_DIACRITICS[ch][idx] + s.slice(i + 1);
    }
  }
  return s;
}

export interface ResolvedSyllableToneResult {
  syllableKey: string;
  orthographicBase: string;
  syllableDisplay: string;
  hanzi: string;
  isPhonotacticallyValid: boolean;
  isToneGap: boolean;
}

/**
 * Normalize Pinyin orthography for any (initial, final, toneNumber) combination,
 * enforce strict Mandarin phonotactics via isValidMandarinSyllable, and look up the
 * exact Simplified Chinese character in PINYIN_TONE_HANZI_MAP (with dynamic course fallback).
 * NEVER falls back to "ba" (八/拔/把/爸).
 */
export function resolveSyllableToneHanzi(
  initial: string,
  final: string,
  toneNumber = 1,
  courseWords?: CourseWordLike[]
): ResolvedSyllableToneResult {
  const safeTone = Math.max(1, Math.min(4, Number(toneNumber) || 1));
  const { init, fin } = normalizeInitialAndFinalInput(initial, final);

  // Case A: Caller passed a complete syllable in `initial` and empty `final`
  if (!fin && init) {
    const cleanFull = init.replace(/[^a-zü]/g, '');
    const lookupKey = cleanFull.replace(/ü/g, 'v');
    const row =
      PINYIN_TONE_HANZI_MAP[lookupKey] || PINYIN_TONE_HANZI_MAP[cleanFull];
    if (!row) {
      return {
        syllableKey: lookupKey,
        orthographicBase: cleanFull,
        syllableDisplay: cleanFull,
        hanzi: '',
        isPhonotacticallyValid: false,
        isToneGap: true
      };
    }
    let char = row[safeTone - 1] || '';
    if (!char) {
      char = findHanziInCourseWords(lookupKey, safeTone, courseWords);
    }
    const displayBase =
      lookupKey.startsWith('nv') || lookupKey.startsWith('lv')
        ? lookupKey.replace('v', 'ü')
        : lookupKey;
    return {
      syllableKey: lookupKey,
      orthographicBase: displayBase,
      syllableDisplay: applyToneMarkToPinyin(displayBase, safeTone),
      hanzi: char,
      isPhonotacticallyValid: true,
      isToneGap: char === ''
    };
  }

  // Case B: Enforce strict Mandarin Initial × Final phonotactic compatibility
  if (!isValidMandarinSyllable(init, fin)) {
    return {
      syllableKey: `${init}${fin}`,
      orthographicBase: `${init || '∅'} + -${fin}`,
      syllableDisplay: `${init || '∅'} + -${fin}`,
      hanzi: '',
      isPhonotacticallyValid: false,
      isToneGap: true
    };
  }

  const finNormV = fin.replace(/v/g, 'ü');
  const isPalatal = ['j', 'q', 'x'].includes(init);

  // Construct lookup key & orthographic display base
  let lookupKey = '';
  let displayBase = '';

  if (init === '' || init === 'y' || init === 'w') {
    if (finNormV === 'i') {
      lookupKey = 'yi';
    } else if (finNormV === 'in') {
      lookupKey = 'yin';
    } else if (finNormV === 'ing') {
      lookupKey = 'ying';
    } else if (finNormV === 'iu' || finNormV === 'iou') {
      lookupKey = 'you';
    } else if (finNormV.startsWith('i')) {
      lookupKey = 'y' + finNormV.slice(1);
    } else if (finNormV === 'u') {
      lookupKey = 'wu';
    } else if (finNormV === 'ui' || finNormV === 'uei') {
      lookupKey = 'wei';
    } else if (finNormV === 'un' || finNormV === 'uen') {
      lookupKey = 'wen';
    } else if (finNormV === 'ueng') {
      lookupKey = 'weng';
    } else if (finNormV.startsWith('u')) {
      lookupKey = 'w' + finNormV.slice(1);
    } else if (finNormV === 'ü') {
      lookupKey = 'yu';
    } else if (finNormV === 'üe') {
      lookupKey = 'yue';
    } else if (finNormV === 'üan') {
      lookupKey = 'yuan';
    } else if (finNormV === 'ün') {
      lookupKey = 'yun';
    } else {
      lookupKey = finNormV;
    }
    displayBase = lookupKey;
  } else if (isPalatal && finNormV.startsWith('ü')) {
    // j/q/x + ü/üe/üan/ün -> ju/jue/juan/jun
    lookupKey = init + 'u' + finNormV.slice(1);
    displayBase = lookupKey;
  } else if (['n', 'l'].includes(init) && finNormV.startsWith('ü')) {
    // n/l + ü/üe -> nv/nve, lv/lve (displayed with ü)
    lookupKey = init + 'v' + finNormV.slice(1);
    displayBase = init + 'ü' + finNormV.slice(1);
  } else {
    // Normalize iou -> iu, uei -> ui, uen -> un after consonants
    let normFin = finNormV;
    if (normFin === 'iou') normFin = 'iu';
    if (normFin === 'uei') normFin = 'ui';
    if (normFin === 'uen') normFin = 'un';
    lookupKey = `${init}${normFin}`;
    displayBase = lookupKey;
  }

  const row =
    PINYIN_TONE_HANZI_MAP[lookupKey] || PINYIN_TONE_HANZI_MAP[displayBase];

  if (!row) {
    return {
      syllableKey: lookupKey,
      orthographicBase: `${init || '∅'} + -${fin}`,
      syllableDisplay: `${init || '∅'} + -${fin}`,
      hanzi: '',
      isPhonotacticallyValid: false,
      isToneGap: true
    };
  }

  let resolvedHanzi = row[safeTone - 1] || '';
  if (!resolvedHanzi) {
    resolvedHanzi = findHanziInCourseWords(lookupKey, safeTone, courseWords);
  }

  return {
    syllableKey: lookupKey,
    orthographicBase: displayBase,
    syllableDisplay: applyToneMarkToPinyin(displayBase, safeTone),
    hanzi: resolvedHanzi,
    isPhonotacticallyValid: true,
    isToneGap: resolvedHanzi === ''
  };
}

/**
 * List of Mandarin syllables that have 4 distinct, non-empty attested Hanzi across Tones 1–4,
 * ideal for the "Practice Syllable Tones" 4-Tone Ear Drill Quiz.
 */
export const QUIZ_ATTESTED_4_TONE_SYLLABLES: string[] = Object.keys(
  PINYIN_TONE_HANZI_MAP
).filter((key) => {
  const row = PINYIN_TONE_HANZI_MAP[key];
  if (!row || row.length !== 4) return false;
  if (row.some((ch) => !ch || ch.trim() === '')) return false;
  const uniqueChars = new Set(row);
  return uniqueChars.size === 4;
});
