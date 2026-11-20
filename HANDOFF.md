# HANDOFF — 三级分级学习体系(2026-08-31 会话交接)

> 新会话从这份文档接手。设计/计划/执行全部完成,**只剩素材上云等三件用户侧事项**(见「待办」)。

## 状态快照

- 分支:`feature/grade-levels`(基点 80ba1d7,18 个提交:670fc07..d0b904f),**未合并**(用户选了"保持现状")
- 测试:`node scripts/smoke-test.mjs` → **41/41 全绿**(项目根,Git Bash)
- 工作区:干净(除 gitignore 的 `scripts/new-assets/` 素材产物)
- 最终全分支代码审查:通过(Ready to merge),修复波复审零发现

## 本次交付了什么

132 字/19 单元平铺 → **600 字/67 关三级体系**:

| 层 | 内容 |
|---|------|
| 数据 | 小班池 150(单元1-27+复习28)/ 中班 150(29-50+复习51)/ 大班 300(52-66+复习67);全库字不重复、非 null emojiCode 唯一 |
| 解锁 | 单元号=全局学习顺序,线性解锁自然实现阶段门控;进度键升版 `hanzi-paradise-v2`(旧 v1 进度作废,读取时自动清理) |
| 玩法 | 阶段化:小班 3 选项 2 练习温和池 / 中班 8 种全轮换 / 大班 5 选项 3 练习;无图字(emojiCode null)自动换纯字玩法;找一找/气泡/打地鼠在中大班为语音提示模式(标题不显示目标字,答错 1.2s 重播) |
| UI | 地图页三阶段页签(锁定 toast/阶段进度条/🔁 复习卡片/总进度 X/600) |
| 复习 | 每阶段末位复习单元,字池=本阶段已学字随机抽 12(大班复习轮次为 findall/whack/sound2char,无图依赖) |
| 素材 | `scripts/gen-new-assets.mjs`:读 characters.js 单一数据源;`node gen-new-assets.mjs <1|2|3>` 按阶段,`... chars 字1 字2` 指定字强制重生成;**素材已全部生成校验完毕在本地** |

文档:`docs/nbl/specs/2026-08-31-grade-levels-design.md`(设计)、`docs/nbl/plans/2026-08-31-grade-levels.md`(实施计划)。

## 待办(全部用户侧,不阻塞代码)

### 1. 素材上云 ✅ 已完成(2026-11-18 存储迁移:CloudBase → 阿里云 ECS)

素材已全量迁至 ECS 自建 nginx(`http://47.93.245.108:8081/assets`,`config.js` ASSET_BASE 已切换),
`node scripts/check-cloud.mjs` 全量 5264/5264 齐全。后续换图/加字走 `bash scripts/ecs/sync-ecs.sh`,
流程与踩坑见 `scripts/upload-assets.md`。CloudBase 环境不再续费。

### 2. 产品侧字表复核(可选)

- 7 个替换字(处理计划数据重复):奶→饺、夏→藕、伞→鼠、船→舟、念→阅、道→巷、加→式
- 4 个近似意象换码:牙→骨头、河→喷泉、石→moai、飞→气球
- u66「加/式」描述已过时:实际 u58「加」与 u66「式」均无图(大班 u58 单元主题"乌鸦喝水"几乎全无图,u66 反而有 减/乘/除 三个运算 emoji),不影响玩法但需知

### 3. 真机/开发者工具走查(上传后)

- 三页签渲染/锁定 toast/默认停"第一个未通关单元"所在阶段
- 小班找一找标题显示目标字;中班起 🔊 语音模式(答错 1.2s 重播时机是否与"再试一次"交叠,需真机听感确认)
- 无图单元(中班 41/42/43)全纯字玩法;大班 3 练习 5 选项
- 复习单元:Storage 测试姿势 `{"unlockedLevel":29,"stars":{"1":3,...}}`(**1-28 都要有星**才会默认停中班页签;只写 unlockedLevel 不填星会停小班——这是设计行为非 bug)
- 平板大屏:阶段进度条未做 @media 收紧(遗留 minor)

## 关键裁定记录(改错了可回滚这些点)

1. 不建 worktree,feature 分支即隔离
2. 大班复习"连连看"→"听音选字"(有图率 13% 会卡死);复习抽样不做有图保底(YAGNI,残余风险 ~1e-11)
3. 数据修订 21 处:7 替换字(当时经用户 AskUserQuestion 确认)+ 14 组撞码换码(清单在 task 报告与 characters.js 行内注释)
4. bubble 玩法原模板漏配(不可达死代码),已补中大班模板 + roundParams bubble 分支
5. 5 个手工关卡(太阳和月亮等)轮次随主题保留,编号重排为 1-5

## 新会话快速上手

```bash
git checkout feature/grade-levels   # 如果不在
node scripts/smoke-test.mjs          # 应 41/41
ls scripts/new-assets/assets/        # 待上传素材
```
- 改字表:只改 `miniprogram/utils/characters.js`(单一事实来源);跑冒烟;新字素材用 gen 脚本对应阶段批生成
- 改单元主题:`miniprogram/utils/levels.js` 的 THEMES;玩法难度:STAGE_PLAY;阶段区间:STAGES
- 合并分支:用户自处(当时选了"保持现状")
