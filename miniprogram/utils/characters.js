// 阶段:1 小班 / 2 中班 / 3 大班;unit 为全局学习顺序编号(见 levels.js STAGES)
const CHARACTERS = [
  // 单元 1:太阳和月亮
  { char: '日', pinyin: 'rì', word: '太阳', emojiCode: '2600', stage: 1, unit: 1 },
  { char: '月', pinyin: 'yuè', word: '月亮', emojiCode: '1f319', stage: 1, unit: 1 },
  { char: '水', pinyin: 'shuǐ', word: '河水', emojiCode: '1f4a7', stage: 1, unit: 1 },
  { char: '火', pinyin: 'huǒ', word: '火苗', emojiCode: '1f525', stage: 1, unit: 1 },
  { char: '山', pinyin: 'shān', word: '大山', emojiCode: '26f0', stage: 1, unit: 1 },
  // 单元 2:农场的小伙伴
  { char: '马', pinyin: 'mǎ', word: '小马', emojiCode: '1f434', stage: 1, unit: 2 },
  { char: '牛', pinyin: 'niú', word: '奶牛', emojiCode: '1f42e', stage: 1, unit: 2 },
  { char: '羊', pinyin: 'yáng', word: '小羊', emojiCode: '1f411', stage: 1, unit: 2 },
  { char: '兔', pinyin: 'tù', word: '兔子', emojiCode: '1f407', stage: 1, unit: 2 },
  { char: '鸡', pinyin: 'jī', word: '小鸡', emojiCode: '1f414', stage: 1, unit: 2 },
  // 单元 3:我的身体
  { char: '人', pinyin: 'rén', word: '大人', emojiCode: '1f9d1', stage: 1, unit: 3 },
  { char: '口', pinyin: 'kǒu', word: '嘴巴', emojiCode: '1f444', stage: 1, unit: 3 },
  { char: '手', pinyin: 'shǒu', word: '小手', emojiCode: '270b', stage: 1, unit: 3 },
  { char: '足', pinyin: 'zú', word: '足球', emojiCode: '1f9b6', stage: 1, unit: 3 },
  { char: '耳', pinyin: 'ěr', word: '耳朵', emojiCode: '1f442', stage: 1, unit: 3 },
  // 单元 4:美丽花园
  { char: '木', pinyin: 'mù', word: '树木', emojiCode: '1f333', stage: 1, unit: 4 },
  { char: '花', pinyin: 'huā', word: '小花', emojiCode: '1f33b', stage: 1, unit: 4 },
  { char: '草', pinyin: 'cǎo', word: '小草', emojiCode: '1f33f', stage: 1, unit: 4 },
  { char: '果', pinyin: 'guǒ', word: '水果', emojiCode: '1f34e', stage: 1, unit: 4 },
  { char: '虫', pinyin: 'chóng', word: '小虫', emojiCode: '1f41b', stage: 1, unit: 4 },
  // 单元 5:汉字小达人
  { char: '星', pinyin: 'xīng', word: '星星', emojiCode: '2b50', stage: 1, unit: 5 },
  { char: '云', pinyin: 'yún', word: '白云', emojiCode: '2601', stage: 1, unit: 5 },
  { char: '雨', pinyin: 'yǔ', word: '下雨', emojiCode: '1f327', stage: 1, unit: 5 },
  { char: '雪', pinyin: 'xuě', word: '雪花', emojiCode: '2744', stage: 1, unit: 5 },
  // 单元 6:一家人
  { char: '爸', pinyin: 'bà', word: '爸爸', emojiCode: '1f468', stage: 1, unit: 6 },
  { char: '妈', pinyin: 'mā', word: '妈妈', emojiCode: '1f469', stage: 1, unit: 6 },
  { char: '爷', pinyin: 'yé', word: '爷爷', emojiCode: '1f474', stage: 1, unit: 6 },
  { char: '奶', pinyin: 'nǎi', word: '奶奶', emojiCode: '1f475', stage: 1, unit: 6 },
  { char: '哥', pinyin: 'gē', word: '哥哥', emojiCode: '1f466', stage: 1, unit: 6 },
  { char: '姐', pinyin: 'jiě', word: '姐姐', emojiCode: '1f467', stage: 1, unit: 6 },
  { char: '弟', pinyin: 'dì', word: '弟弟', emojiCode: '1f9d2', stage: 1, unit: 6 },
  // 家人图区分度:妹原用 1f467 与姐完全同图,改婴儿图;爷改白胡子老爷爷拉开与爸的差别
  { char: '妹', pinyin: 'mèi', word: '妹妹', emojiCode: '1f476', stage: 1, unit: 6 },
  // 单元 7:动物园
  { char: '狗', pinyin: 'gǒu', word: '小狗', emojiCode: '1f436', stage: 1, unit: 7 },
  { char: '猫', pinyin: 'māo', word: '小猫', emojiCode: '1f431', stage: 1, unit: 7 },
  { char: '鸭', pinyin: 'yā', word: '鸭子', emojiCode: '1f986', stage: 1, unit: 7 },
  { char: '象', pinyin: 'xiàng', word: '大象', emojiCode: '1f418', stage: 1, unit: 7 },
  { char: '猴', pinyin: 'hóu', word: '猴子', emojiCode: '1f435', stage: 1, unit: 7 },
  { char: '熊', pinyin: 'xióng', word: '小熊', emojiCode: '1f43b', stage: 1, unit: 7 },
  { char: '猪', pinyin: 'zhū', word: '小猪', emojiCode: '1f437', stage: 1, unit: 7 },
  // 单元 8:数字乐园(配图 OpenMoji keycap 数字)
  { char: '一', pinyin: 'yī', word: '一个', emojiCode: '0031-fe0f-20e3', stage: 1, unit: 8 },
  { char: '二', pinyin: 'èr', word: '二十', emojiCode: '0032-fe0f-20e3', stage: 1, unit: 8 },
  { char: '三', pinyin: 'sān', word: '三个', emojiCode: '0033-fe0f-20e3', stage: 1, unit: 8 },
  { char: '四', pinyin: 'sì', word: '四个', emojiCode: '0034-fe0f-20e3', stage: 1, unit: 8 },
  { char: '五', pinyin: 'wǔ', word: '五个', emojiCode: '0035-fe0f-20e3', stage: 1, unit: 8 },
  { char: '六', pinyin: 'liù', word: '六个', emojiCode: '0036-fe0f-20e3', stage: 1, unit: 8 },
  { char: '七', pinyin: 'qī', word: '七个', emojiCode: '0037-fe0f-20e3', stage: 1, unit: 8 },
  { char: '八', pinyin: 'bā', word: '八个', emojiCode: '0038-fe0f-20e3', stage: 1, unit: 8 },
  { char: '九', pinyin: 'jiǔ', word: '九个', emojiCode: '0039-fe0f-20e3', stage: 1, unit: 8 },
  { char: '十', pinyin: 'shí', word: '十个', emojiCode: '1f51f', stage: 1, unit: 8 },
  // 单元 9:象形字乐园(字形与实物高度相似的象形字)
  { char: '鱼', pinyin: 'yú', word: '小鱼', emojiCode: '1f41f', stage: 1, unit: 9 },
  { char: '鸟', pinyin: 'niǎo', word: '小鸟', emojiCode: '1f426', stage: 1, unit: 9 },
  { char: '竹', pinyin: 'zhú', word: '竹子', emojiCode: '1f38b', stage: 1, unit: 9 },
  { char: '叶', pinyin: 'yè', word: '叶子', emojiCode: '1f343', stage: 1, unit: 9 },
  { char: '土', pinyin: 'tǔ', word: '泥土', emojiCode: '1f9f1', stage: 1, unit: 9 },
  { char: '田', pinyin: 'tián', word: '田野', emojiCode: '1f33e', stage: 1, unit: 9 },
  // 单元 29:我的家
  { char: '家', pinyin: 'jiā', word: '回家', emojiCode: '1f3e0', stage: 2, unit: 29 },
  { char: '门', pinyin: 'mén', word: '大门', emojiCode: '1f6aa', stage: 2, unit: 29 },
  { char: '窗', pinyin: 'chuāng', word: '窗户', emojiCode: '1fa9f', stage: 2, unit: 29 },
  { char: '床', pinyin: 'chuáng', word: '小床', emojiCode: '1f6cf', stage: 2, unit: 29 },
  { char: '灯', pinyin: 'dēng', word: '台灯', emojiCode: '1f4a1', stage: 2, unit: 29 },
  { char: '椅', pinyin: 'yǐ', word: '椅子', emojiCode: '1fa91', stage: 2, unit: 29 },
  { char: '桌', pinyin: 'zhuō', word: '饭桌', emojiCode: '1f37d', stage: 2, unit: 29 },
  { char: '被', pinyin: 'bèi', word: '被子', emojiCode: '1f6cc', stage: 2, unit: 29 },
  // 单元 30:好吃的
  { char: '米', pinyin: 'mǐ', word: '米饭', emojiCode: '1f35a', stage: 2, unit: 30 },
  { char: '面', pinyin: 'miàn', word: '面条', emojiCode: '1f35c', stage: 2, unit: 30 },
  { char: '菜', pinyin: 'cài', word: '青菜', emojiCode: '1f96c', stage: 2, unit: 30 },
  { char: '蛋', pinyin: 'dàn', word: '鸡蛋', emojiCode: '1f373', stage: 2, unit: 30 },
  { char: '茶', pinyin: 'chá', word: '喝茶', emojiCode: '1f375', stage: 2, unit: 30 },
  { char: '糖', pinyin: 'táng', word: '糖果', emojiCode: '1f36c', stage: 2, unit: 30 },
  { char: '豆', pinyin: 'dòu', word: '豆子', emojiCode: '1fad8', stage: 2, unit: 30 },
  // 单元 31:动一动
  { char: '看', pinyin: 'kàn', word: '看书', emojiCode: '1f440', stage: 2, unit: 31 },
  { char: '说', pinyin: 'shuō', word: '说话', emojiCode: '1f4ac', stage: 2, unit: 31 },
  { char: '走', pinyin: 'zǒu', word: '走路', emojiCode: '1f6b6', stage: 2, unit: 31 },
  { char: '睡', pinyin: 'shuì', word: '睡觉', emojiCode: '1f4a4', stage: 2, unit: 31 },
  { char: '跑', pinyin: 'pǎo', word: '跑步', emojiCode: '1f3c3', stage: 2, unit: 31 },
  { char: '跳', pinyin: 'tiào', word: '跳绳', emojiCode: '1f938', stage: 2, unit: 31 },
  { char: '笑', pinyin: 'xiào', word: '大笑', emojiCode: '1f604', stage: 2, unit: 31 },
  { char: '哭', pinyin: 'kū', word: '大哭', emojiCode: '1f62d', stage: 2, unit: 31 },
  { char: '吃', pinyin: 'chī', word: '吃饭', emojiCode: '1f372', stage: 2, unit: 31 },
  { char: '喝', pinyin: 'hē', word: '喝水', emojiCode: '1f964', stage: 2, unit: 31 },
  { char: '玩', pinyin: 'wán', word: '玩具', emojiCode: '1f9f8', stage: 2, unit: 31 },
  { char: '听', pinyin: 'tīng', word: '听话', emojiCode: '1f442', stage: 2, unit: 31 },
  // 单元 32:穿戴上
  { char: '衣', pinyin: 'yī', word: '衣服', emojiCode: '1f455', stage: 2, unit: 32 },
  { char: '裤', pinyin: 'kù', word: '裤子', emojiCode: '1f456', stage: 2, unit: 32 },
  { char: '鞋', pinyin: 'xié', word: '鞋子', emojiCode: '1f45e', stage: 2, unit: 32 },
  { char: '帽', pinyin: 'mào', word: '帽子', emojiCode: '1f452', stage: 2, unit: 32 },
  { char: '袜', pinyin: 'wà', word: '袜子', emojiCode: '1f9e6', stage: 2, unit: 32 },
  { char: '包', pinyin: 'bāo', word: '书包', emojiCode: '1f45c', stage: 2, unit: 32 },
  { char: '伞', pinyin: 'sǎn', word: '雨伞', emojiCode: '2602', stage: 2, unit: 32 },
  // 单元 33:出门去
  { char: '车', pinyin: 'chē', word: '汽车', emojiCode: '1f697', stage: 2, unit: 33 },
  { char: '船', pinyin: 'chuán', word: '小船', emojiCode: '1f6a2', stage: 2, unit: 33 },
  { char: '飞', pinyin: 'fēi', word: '飞机', emojiCode: '2708', stage: 2, unit: 33 },
  { char: '路', pinyin: 'lù', word: '马路', emojiCode: '1f6e3', stage: 2, unit: 33 },
  { char: '桥', pinyin: 'qiáo', word: '大桥', emojiCode: '1f309', stage: 2, unit: 33 },
  // 单元 34:颜色
  { char: '红', pinyin: 'hóng', word: '红色', emojiCode: '1f534', stage: 2, unit: 34 },
  { char: '黄', pinyin: 'huáng', word: '黄色', emojiCode: '1f7e1', stage: 2, unit: 34 },
  { char: '蓝', pinyin: 'lán', word: '蓝天', emojiCode: '1f535', stage: 2, unit: 34 },
  { char: '绿', pinyin: 'lǜ', word: '绿色', emojiCode: '1f7e2', stage: 2, unit: 34 },
  { char: '黑', pinyin: 'hēi', word: '黑色', emojiCode: '2b24', stage: 2, unit: 34 },
  { char: '白', pinyin: 'bái', word: '白色', emojiCode: '26aa', stage: 2, unit: 34 },
  // 单元 35:大自然
  { char: '地', pinyin: 'dì', word: '地球', emojiCode: '1f30d', stage: 2, unit: 35 },
  { char: '石', pinyin: 'shí', word: '石头', emojiCode: '1faa8', stage: 2, unit: 35 },
  { char: '风', pinyin: 'fēng', word: '大风', emojiCode: '1f32c', stage: 2, unit: 35 },
  { char: '冰', pinyin: 'bīng', word: '冰块', emojiCode: '1f9ca', stage: 2, unit: 35 },
  { char: '河', pinyin: 'hé', word: '小河', emojiCode: '1f30a', stage: 2, unit: 35 },
  { char: '雷', pinyin: 'léi', word: '打雷', emojiCode: '1f329', stage: 2, unit: 35 },
  { char: '电', pinyin: 'diàn', word: '闪电', emojiCode: '26a1', stage: 2, unit: 35 },
  { char: '雾', pinyin: 'wù', word: '大雾', emojiCode: '1f32b', stage: 2, unit: 35 },
  { char: '晴', pinyin: 'qíng', word: '晴天', emojiCode: '1f324', stage: 2, unit: 35 },
  // 单元 36:一天四季
  { char: '早', pinyin: 'zǎo', word: '早上', emojiCode: '1f305', stage: 2, unit: 36 },
  { char: '夜', pinyin: 'yè', word: '夜晚', emojiCode: '1f303', stage: 2, unit: 36 },
  { char: '春', pinyin: 'chūn', word: '春天', emojiCode: '1f338', stage: 2, unit: 36 },
  { char: '夏', pinyin: 'xià', word: '夏天', emojiCode: '1f3d6', stage: 2, unit: 36 },
  { char: '秋', pinyin: 'qiū', word: '秋天', emojiCode: '1f341', stage: 2, unit: 36 },
  { char: '冬', pinyin: 'dōng', word: '冬天', emojiCode: '26c4', stage: 2, unit: 36 },
  // 单元 37:方位
  { char: '上', pinyin: 'shàng', word: '上面', emojiCode: '2b06', stage: 2, unit: 37 },
  { char: '下', pinyin: 'xià', word: '下面', emojiCode: '2b07', stage: 2, unit: 37 },
  { char: '左', pinyin: 'zuǒ', word: '左边', emojiCode: '2b05', stage: 2, unit: 37 },
  { char: '右', pinyin: 'yòu', word: '右边', emojiCode: '27a1', stage: 2, unit: 37 },
  { char: '前', pinyin: 'qián', word: '前面', emojiCode: '23e9', stage: 2, unit: 37 },
  { char: '后', pinyin: 'hòu', word: '后面', emojiCode: '23ea', stage: 2, unit: 37 },
  { char: '里', pinyin: 'lǐ', word: '里面', emojiCode: '1f4e6', stage: 2, unit: 37 },
  { char: '外', pinyin: 'wài', word: '外面', emojiCode: '1f9f2', stage: 2, unit: 37 },
  { char: '大', pinyin: 'dà', word: '大树', emojiCode: '1f334', stage: 2, unit: 37 },
  { char: '小', pinyin: 'xiǎo', word: '小蚂蚁', emojiCode: '1f41c', stage: 2, unit: 37 },
  // 单元 38:小身体与文具
  { char: '牙', pinyin: 'yá', word: '牙齿', emojiCode: '1f9b7', stage: 2, unit: 38 },
  { char: '鼻', pinyin: 'bí', word: '鼻子', emojiCode: '1f443', stage: 2, unit: 38 },
  { char: '腿', pinyin: 'tuǐ', word: '小腿', emojiCode: '1f9b5', stage: 2, unit: 38 },
  { char: '书', pinyin: 'shū', word: '读书', emojiCode: '1f4d6', stage: 2, unit: 38 },
  { char: '笔', pinyin: 'bǐ', word: '铅笔', emojiCode: '270f', stage: 2, unit: 38 },
  { char: '纸', pinyin: 'zhǐ', word: '白纸', emojiCode: '1f4c4', stage: 2, unit: 38 },
  { char: '画', pinyin: 'huà', word: '画画', emojiCode: '1f3a8', stage: 2, unit: 38 },
]

const { ASSET_BASE } = require('../config')

// 与素材文件名一致:中文转 hex 码点(上.png -> 4e0a.png),纯 ASCII(panda)原样
function assetName(name) {
  return name
    .split('-')
    .map((part) =>
      /^[\x20-\x7e]*$/.test(part)
        ? part
        : [...part].map((ch) => ch.charCodeAt(0).toString(16)).join('')
    )
    .join('-')
}

const imageOf = (c) => `${ASSET_BASE}/images/${assetName(c.char)}.png`
const pandaImage = `${ASSET_BASE}/images/panda.png`

const TOTAL_UNITS = 67 // 终局单元数(小班1-28 中班29-51 大班52-67,各段末位为复习单元)
const byUnit = (unit) => CHARACTERS.filter((c) => c.unit === unit)
const byStage = (stage) => CHARACTERS.filter((c) => c.stage === stage)
module.exports = { CHARACTERS, TOTAL_UNITS, imageOf, pandaImage, byStage, byUnit, assetName }
