# 学习效果 P0 优化设计(2026-09-08)

> 背景:分级体系(600字/67关)已交付,玩法趣味达标但记忆科学层空缺。本设计补齐四个学习效果短板,全部落在数据/策略层 + 少量组件事件,零新增素材。

## 方向裁定(用户已确认)

| # | 决策点 | 裁定 |
|---|--------|------|
| 1 | 优化北极星 | 学习效果优先,趣味保持现状 |
| 2 | 改动边界 | 可新增玩法组件,不做页面级 meta 系统 |
| 3 | 使用场景假设 | 孩子独自玩,单次 5-10 分钟 |
| 4 | 激励路线 | 轻量认字图鉴(P2,本轮不做) |

## 四个短板 → 四项改动

| 项 | 短板 | 方案 |
|----|------|------|
| P0-1 | 无间隔重复(学完 27 关不见面) | 练习轮掺旧字 + 复习单元按遗忘风险抽样 |
| P0-2 | 错误不回流(只用来算星) | 测验组件回传错字,关内优先重现 + 关末 mini 复习轮 |
| P0-3 | 干扰项纯随机 | 音近自动(拼音去调匹配)+ 形近手工表(25 对),中班起启用 |
| P0-4 | 大班 20 字一关过重 | 关卡内拆段:5字×4段,段=识字卡+1练习,段间休息过场 |

## P0-1 掺旧字(间隔效应)

### 数据模型(progress.js)

存档新增 `charStats: { [char]: { lastUnit, wrong } }`(与 v2 键同存,旧档读取时默认 `{}`):
- `lastUnit`:最后出现的单元号(近似时间轴,单元号即全局学习顺序)
- `wrong`:累计答错次数
- 旧档无记录的字:`lastUnit ?? char.unit`(该字随其单元被学会),`wrong ?? 0`
- `completeLevel(levelId, mistakes, wrongChars=[])`:本单元字 + 错字的 `lastUnit=levelId`,错字 `wrong++`(复习单元只刷新错字,正确复习到的字不刷新——近似,可接受)
- `resetProgress` 一并清空

### 出题(engine.js 纯函数)

- `pickReviewTargets(oldChars, currentUnit, n, stats)`:得分 = `(currentUnit - lastUnit) + wrong*10`;**常错字(wrong>0)必进样本**(错字回流兜底),其余从 top-3n 高分池随机抽(保多样性,不是永远同一批)
- `mixTargets(unitChars, wrongChars, oldChars, count)`:错字优先(≤2)→ 旧字(基础配额 count≥5?2:1,且保证至少留 1 个本单元新字)→ 新字填满,结果打乱去重
- 旧字池:当前单元之前的已学字,池 < 6 字(开局几关)自然跳过
- 复习单元本身就是旧字池,不再二次掺入

### 接入点(play.js)

- `sound2char` / `findall` 轮:mixTargets 混入(pic2char 的旧字仅取有图字)
- 复习单元 `charsFor`:`shuffle().slice(0,12)` → `pickReviewTargets(byStage(stage), reviewId, 12, stats)`
- **不改**:bubble/whack 目标本就从已学池均匀随机(天然无偏复习,加权属过度设计);match/link 配对需图且 4 对上限,单元内最稳
  - 修订(P0-4 拆段后):"已学池"按段收缩——band 轮的池 = 之前单元全部字 + 本单元已教段(`levels.poolFor(unit, band)`),否则第 1 段的 bubble/whack 会抽到第 2-4 段未教字,破坏先学后练

## P0-2 错字回流

- quiz-picture / quiz-sound / quiz-findall 答错分支新增 `triggerEvent('wrong', { char: <该题目标字> })`(混淆的诊断对象是目标字而非误选项)
- play.js `this.wrongChars` 跨轮累计去重;后续轮出题经 mixTargets 优先重现(即 P0-1 的 wrongChars 参数)
- 全部轮次结束时若有错字:追加 1 个 **mini 复习轮**(sound2char,错字前 3 个,3 选项),该轮错误**不计星级**,只跑一次
- mini 轮答错的字仍累计 → 进 charStats,下次旧字抽样权重升高
- 星级按 mini 前累计 mistakes 计算(零惩罚哲学:过关必得星不变)
- 不加 wrong 事件的组件:match/link/bubble/whack(误操作语义模糊,mistakes 仍计星)

## P0-3 音近/形近干扰项

- `pickDistractors(target, pool, n, opts?)`,`opts = { pinyin: {char→拼音}, confusable: {char→[形近字]} }`,不传时行为与现在完全一致(小班)
- 分层填充:①拼音去声调相同(如 妈/马、蛙/娃、汽/气)→ ②形近表 → ③随机补足;各层内部打乱
- 拼音格式:声调符号小写串(`rì`),引擎内置声调剥离表
- **stage ≥ 2 才传 opts**(小班保持随机,避免挫败)
- `CONFUSABLE` 25 对手工表挂在 characters.js 导出(字库领域数据):

```
日/目 日/白 日/田 月/目 白/百 石/右 鸟/乌 天/大 八/人 儿/几 见/贝 半/羊
山/出 左/右 木/本 爸/爷 水/冰 火/灰 雨/雷 四/西 高/亮 双/又 谁/推 话/活 上/土
```

(音近自动层已覆盖大量"声旁相同"对——去调同音组 113 组,故形近表只收非同音的纯视觉对)

## P0-4 大班关卡内拆段

- 仅 stage 3(恒 20 字):`SEG=5` → 4 段
- 轮次结构:`[fc·段0, 练·段0, break, fc·段1, 练·段1, break, fc·段2, 练·段2, break, fc·段3, 练·段3]` 共 11 轮
- 段练习玩法从单元模板池循环取(`tpls[i % 3]`,段3 回到 tpls[0]);PIC_FALLBACK/voice 按段内字判定
- round 携带 `band` 索引,play.js 按段切字(flashcard 只显示本段 5 字;练习目标 = 本段字 + 掺旧字)
- break 轮:play.wxml 内联过场(熊猫休息文案),点击或 4s 自动继续,计时器 onUnload 清理
- 每段 ≈ 2 分钟,单关 8 分钟内且每段有自然退出点;小班/中班/手工关/复习关结构不变
- **不变量**:band 轮可抽字池(目标+干扰)不含未教段字(`poolFor`,冒烟有断言)
- 练习密度说明:大班每字曝光 = 段内识字卡 + 段练 ~80%,缺口由 P0-1 旧字回流在后续关卡补足(这正是间隔效应的设计意图)

## 非目标

- 不做每日任务/连续签到/后端/账号
- 不动星级规则与解锁逻辑
- 零新增音频/图片素材
- bubble/whack 目标不做加权(match/link 不掺旧字)

## 测试断言(smoke-test 新增)

1. pickReviewTargets:无 stats 时最久未学单元的字优先;wrong 高分字优先;结果全部来自 top-3n 得分集
2. mixTargets:长度=count、含错字/旧字、无重复、至少 1 个新字
3. 干扰项:传 opts 时同音(去调)优先命中、形近表优先命中;不传 opts 行为不变;候选不足回退随机
4. progress:completeLevel 带错字更新 charStats;旧档(无 charStats 字段)读取默认 {};resetProgress 清空
5. levels:大班单元 11 轮/4 段/break 不在末尾;小中班生成关无 band 无 break;玩法类型合法表加入 break
6. CONFUSABLE 25 对的每个字都在 600 字库中

## 组件事件接线(真机走查项,不可 node 测)

- 三个测验组件 wrong 事件 → play.js 累计
- mini 复习轮触发与星级不受影响
- break 过场点击/自动推进、退出页面计时器清理

## 后续(P1/P2,另立设计)

- P1-1 大班描红(网格点亮法,无需笔顺数据)
- P1-2 听词选字(复用 `-word.wav` 素材与选择题基建)
- P2 认字图鉴页
