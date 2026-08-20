// 单元 1-5 为原 5 关字表:保持 level 字段兼容,unit 与 level 同值
// 单元 6-17 为 v2 新增字:不带 level,统一走 unit
const CHARACTERS = [
  // 单元 1:太阳和月亮
  { char: '日', pinyin: 'rì', word: '太阳', emojiCode: '2600', level: 1, unit: 1 },
  { char: '月', pinyin: 'yuè', word: '月亮', emojiCode: '1f319', level: 1, unit: 1 },
  { char: '水', pinyin: 'shuǐ', word: '河水', emojiCode: '1f4a7', level: 1, unit: 1 },
  { char: '火', pinyin: 'huǒ', word: '火苗', emojiCode: '1f525', level: 1, unit: 1 },
  { char: '山', pinyin: 'shān', word: '大山', emojiCode: '26f0', level: 1, unit: 1 },
  // 单元 2:农场的小伙伴
  { char: '马', pinyin: 'mǎ', word: '小马', emojiCode: '1f434', level: 2, unit: 2 },
  { char: '牛', pinyin: 'niú', word: '奶牛', emojiCode: '1f42e', level: 2, unit: 2 },
  { char: '羊', pinyin: 'yáng', word: '小羊', emojiCode: '1f411', level: 2, unit: 2 },
  { char: '兔', pinyin: 'tù', word: '兔子', emojiCode: '1f407', level: 2, unit: 2 },
  { char: '鸡', pinyin: 'jī', word: '小鸡', emojiCode: '1f414', level: 2, unit: 2 },
  // 单元 3:我的身体
  { char: '人', pinyin: 'rén', word: '大人', emojiCode: '1f9d1', level: 3, unit: 3 },
  { char: '口', pinyin: 'kǒu', word: '嘴巴', emojiCode: '1f444', level: 3, unit: 3 },
  { char: '手', pinyin: 'shǒu', word: '小手', emojiCode: '270b', level: 3, unit: 3 },
  { char: '足', pinyin: 'zú', word: '足球', emojiCode: '1f9b6', level: 3, unit: 3 },
  { char: '耳', pinyin: 'ěr', word: '耳朵', emojiCode: '1f442', level: 3, unit: 3 },
  // 单元 4:美丽花园
  { char: '木', pinyin: 'mù', word: '树木', emojiCode: '1f333', level: 4, unit: 4 },
  { char: '花', pinyin: 'huā', word: '小花', emojiCode: '1f33b', level: 4, unit: 4 },
  { char: '草', pinyin: 'cǎo', word: '小草', emojiCode: '1f33f', level: 4, unit: 4 },
  { char: '果', pinyin: 'guǒ', word: '水果', emojiCode: '1f34e', level: 4, unit: 4 },
  { char: '虫', pinyin: 'chóng', word: '小虫', emojiCode: '1f41b', level: 4, unit: 4 },
  // 单元 5:汉字小达人
  { char: '星', pinyin: 'xīng', word: '星星', emojiCode: '2b50', level: 5, unit: 5 },
  { char: '云', pinyin: 'yún', word: '白云', emojiCode: '2601', level: 5, unit: 5 },
  { char: '雨', pinyin: 'yǔ', word: '下雨', emojiCode: '1f327', level: 5, unit: 5 },
  { char: '雪', pinyin: 'xuě', word: '雪花', emojiCode: '2744', level: 5, unit: 5 },
  // 单元 6:一家人
  { char: '爸', pinyin: 'bà', word: '爸爸', emojiCode: '1f468', unit: 6 },
  { char: '妈', pinyin: 'mā', word: '妈妈', emojiCode: '1f469', unit: 6 },
  { char: '爷', pinyin: 'yé', word: '爷爷', emojiCode: '1f473', unit: 6 },
  { char: '奶', pinyin: 'nǎi', word: '奶奶', emojiCode: '1f475', unit: 6 },
  { char: '哥', pinyin: 'gē', word: '哥哥', emojiCode: '1f466', unit: 6 },
  { char: '姐', pinyin: 'jiě', word: '姐姐', emojiCode: '1f467', unit: 6 },
  // 单元 7:我的家
  { char: '家', pinyin: 'jiā', word: '回家', emojiCode: '1f3e0', unit: 7 },
  { char: '门', pinyin: 'mén', word: '大门', emojiCode: '1f6aa', unit: 7 },
  { char: '窗', pinyin: 'chuāng', word: '窗户', emojiCode: '1fa9f', unit: 7 },
  { char: '床', pinyin: 'chuáng', word: '小床', emojiCode: '1f6cf', unit: 7 },
  { char: '灯', pinyin: 'dēng', word: '台灯', emojiCode: '1f4a1', unit: 7 },
  { char: '椅', pinyin: 'yǐ', word: '椅子', emojiCode: '1fa91', unit: 7 },
  // 单元 8:好吃的
  { char: '米', pinyin: 'mǐ', word: '米饭', emojiCode: '1f35a', unit: 8 },
  { char: '面', pinyin: 'miàn', word: '面条', emojiCode: '1f35c', unit: 8 },
  { char: '菜', pinyin: 'cài', word: '青菜', emojiCode: '1f96c', unit: 8 },
  { char: '蛋', pinyin: 'dàn', word: '鸡蛋', emojiCode: '1f373', unit: 8 },
  { char: '茶', pinyin: 'chá', word: '喝茶', emojiCode: '1f375', unit: 8 },
  { char: '糖', pinyin: 'táng', word: '糖果', emojiCode: '1f36c', unit: 8 },
  { char: '豆', pinyin: 'dòu', word: '豆子', emojiCode: '1fad8', unit: 8 },
  // 单元 9:动一动
  { char: '看', pinyin: 'kàn', word: '看书', emojiCode: '1f440', unit: 9 },
  { char: '说', pinyin: 'shuō', word: '说话', emojiCode: '1f4ac', unit: 9 },
  { char: '走', pinyin: 'zǒu', word: '走路', emojiCode: '1f6b6', unit: 9 },
  { char: '睡', pinyin: 'shuì', word: '睡觉', emojiCode: '1f4a4', unit: 9 },
  { char: '跑', pinyin: 'pǎo', word: '跑步', emojiCode: '1f3c3', unit: 9 },
  { char: '跳', pinyin: 'tiào', word: '跳绳', emojiCode: '1f938', unit: 9 },
  { char: '笑', pinyin: 'xiào', word: '大笑', emojiCode: '1f604', unit: 9 },
  { char: '哭', pinyin: 'kū', word: '大哭', emojiCode: '1f62d', unit: 9 },
  // 单元 10:穿戴上
  { char: '衣', pinyin: 'yī', word: '衣服', emojiCode: '1f455', unit: 10 },
  { char: '裤', pinyin: 'kù', word: '裤子', emojiCode: '1f456', unit: 10 },
  { char: '鞋', pinyin: 'xié', word: '鞋子', emojiCode: '1f45e', unit: 10 },
  { char: '帽', pinyin: 'mào', word: '帽子', emojiCode: '1f452', unit: 10 },
  { char: '袜', pinyin: 'wà', word: '袜子', emojiCode: '1f9e6', unit: 10 },
  { char: '包', pinyin: 'bāo', word: '书包', emojiCode: '1f45c', unit: 10 },
  { char: '伞', pinyin: 'sǎn', word: '雨伞', emojiCode: '2602', unit: 10 },
  // 单元 11:出门去
  { char: '车', pinyin: 'chē', word: '汽车', emojiCode: '1f697', unit: 11 },
  { char: '船', pinyin: 'chuán', word: '小船', emojiCode: '1f6a2', unit: 11 },
  { char: '飞', pinyin: 'fēi', word: '飞机', emojiCode: '2708', unit: 11 },
  { char: '路', pinyin: 'lù', word: '马路', emojiCode: '1f6e3', unit: 11 },
  { char: '桥', pinyin: 'qiáo', word: '大桥', emojiCode: '1f309', unit: 11 },
  // 单元 12:颜色
  { char: '红', pinyin: 'hóng', word: '红色', emojiCode: '1f534', unit: 12 },
  { char: '黄', pinyin: 'huáng', word: '黄色', emojiCode: '1f7e1', unit: 12 },
  { char: '蓝', pinyin: 'lán', word: '蓝天', emojiCode: '1f535', unit: 12 },
  { char: '绿', pinyin: 'lǜ', word: '绿色', emojiCode: '1f7e2', unit: 12 },
  { char: '黑', pinyin: 'hēi', word: '黑色', emojiCode: '2b24', unit: 12 },
  { char: '白', pinyin: 'bái', word: '白色', emojiCode: '26aa', unit: 12 },
  // 单元 13:大自然
  { char: '地', pinyin: 'dì', word: '地球', emojiCode: '1f30d', unit: 13 },
  { char: '石', pinyin: 'shí', word: '石头', emojiCode: '1faa8', unit: 13 },
  { char: '风', pinyin: 'fēng', word: '大风', emojiCode: '1f32c', unit: 13 },
  { char: '冰', pinyin: 'bīng', word: '冰块', emojiCode: '1f9ca', unit: 13 },
  { char: '河', pinyin: 'hé', word: '小河', emojiCode: '1f30a', unit: 13 },
  // 单元 14:动物园
  { char: '狗', pinyin: 'gǒu', word: '小狗', emojiCode: '1f436', unit: 14 },
  { char: '猫', pinyin: 'māo', word: '小猫', emojiCode: '1f431', unit: 14 },
  { char: '鸭', pinyin: 'yā', word: '鸭子', emojiCode: '1f986', unit: 14 },
  { char: '象', pinyin: 'xiàng', word: '大象', emojiCode: '1f418', unit: 14 },
  { char: '猴', pinyin: 'hóu', word: '猴子', emojiCode: '1f435', unit: 14 },
  { char: '熊', pinyin: 'xióng', word: '小熊', emojiCode: '1f43b', unit: 14 },
  { char: '猪', pinyin: 'zhū', word: '小猪', emojiCode: '1f437', unit: 14 },
  // 单元 15:一天四季
  { char: '早', pinyin: 'zǎo', word: '早上', emojiCode: '1f305', unit: 15 },
  { char: '夜', pinyin: 'yè', word: '夜晚', emojiCode: '1f303', unit: 15 },
  { char: '春', pinyin: 'chūn', word: '春天', emojiCode: '1f338', unit: 15 },
  { char: '夏', pinyin: 'xià', word: '夏天', emojiCode: '1f3d6', unit: 15 },
  { char: '秋', pinyin: 'qiū', word: '秋天', emojiCode: '1f341', unit: 15 },
  { char: '冬', pinyin: 'dōng', word: '冬天', emojiCode: '26c4', unit: 15 },
  // 单元 16:方位
  { char: '上', pinyin: 'shàng', word: '上面', emojiCode: '2b06', unit: 16 },
  { char: '下', pinyin: 'xià', word: '下面', emojiCode: '2b07', unit: 16 },
  { char: '左', pinyin: 'zuǒ', word: '左边', emojiCode: '2b05', unit: 16 },
  { char: '右', pinyin: 'yòu', word: '右边', emojiCode: '27a1', unit: 16 },
  { char: '前', pinyin: 'qián', word: '前面', emojiCode: '23e9', unit: 16 },
  { char: '后', pinyin: 'hòu', word: '后面', emojiCode: '23ea', unit: 16 },
  // 单元 17:小身体与文具
  { char: '牙', pinyin: 'yá', word: '牙齿', emojiCode: '1f9b7', unit: 17 },
  { char: '鼻', pinyin: 'bí', word: '鼻子', emojiCode: '1f443', unit: 17 },
  { char: '腿', pinyin: 'tuǐ', word: '小腿', emojiCode: '1f9b5', unit: 17 },
  { char: '书', pinyin: 'shū', word: '读书', emojiCode: '1f4d6', unit: 17 },
  { char: '笔', pinyin: 'bǐ', word: '铅笔', emojiCode: '270f', unit: 17 },
  { char: '纸', pinyin: 'zhǐ', word: '白纸', emojiCode: '1f4c4', unit: 17 },
  { char: '画', pinyin: 'huà', word: '画画', emojiCode: '1f3a8', unit: 17 },
]

// 单元总数(v2 主题单元制)
const TOTAL_UNITS = 17

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
const byLevel = (level) => CHARACTERS.filter((c) => c.level === level)
const byUnit = (unit) => CHARACTERS.filter((c) => c.unit === unit)

module.exports = { CHARACTERS, TOTAL_UNITS, imageOf, pandaImage, byLevel, byUnit, assetName }
