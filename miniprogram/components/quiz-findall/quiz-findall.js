const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')
const { rpx2px } = require('../../utils/layout')

Component({
  properties: {
    grids: { type: Array, value: [] }, // [{target(字对象), cells: [char,...]}]
    voice: { type: Boolean, value: false }, // 语音提示模式:不显示目标字,只听音
  },

  data: {
    gi: 0,
    cells: [], // 9 格视图模型:{ch, i, left, top} — 绝对定位坐标,布局不依赖任何 flex/grid
    boardW: 0,
    boardH: 0,
    cell: 0, // 单格边长 px(随屏宽缩放封顶,行内样式使用)
    charFont: 0,
    starFont: 0,
    foundMap: {}, // 已点中的格子下标 → true(WXML 不支持 indexOf,用对象查找)
    wrongCell: -1,
    gridDone: false,
    total: 0, // 当前网格中目标字出现次数
    pulseMap: {}, // 提示脉冲的格子下标 → true(错3次起短暂高亮剩余目标)
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.wrongCount = 0
      this.timers = []
      this.foundCount = 0
      this.calcTotal()
      playVoice('voice-instr-findall')
      this.timers.push(setTimeout(() => this.repeat(), 1800))
    },
    detached() {
      this.timers.forEach(clearTimeout)
    },
  },

  observers: {
    'grids, gi'() {
      this.calcTotal()
      this.buildBoard()
    },
  },

  methods: {
    calcTotal() {
      const g = this.data.grids[this.data.gi]
      if (!g) return
      this.setData({ total: g.cells.filter((c) => c === g.target.char).length })
    },

    buildBoard() {
      const g = this.data.grids[this.data.gi]
      if (!g) return
      // 9 格 3 行×3 列,像素坐标随屏宽缩放封顶(utils/layout)
      const px = rpx2px()
      const CELL = px(150)
      const GAP = px(16)
      const cells = g.cells.map((ch, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return { ch, i, left: col * (CELL + GAP), top: row * (CELL + GAP) }
      })
      this.setData({
        cells,
        boardW: 3 * CELL + 2 * GAP,
        boardH: 3 * CELL + 2 * GAP,
        cell: CELL,
        charFont: Math.round(CELL * 0.5),
        starFont: Math.round(CELL * 0.4),
      })
    },

    repeat() {
      playChar(this.data.grids[this.data.gi].target.char)
    },

    clickCell(e) {
      const i = e.currentTarget.dataset.i
      if (this.data.gridDone || this.data.foundMap[i]) return
      const g = this.data.grids[this.data.gi]
      if (g.cells[i] === g.target.char) {
        this.foundCount++
        this.setData({ foundMap: { ...this.data.foundMap, [i]: true } })
        playSfx('sfx-correct')
        if (this.foundCount === this.data.total) {
          this.setData({ gridDone: true })
          playPraise()
          this.timers.push(
            setTimeout(() => {
              if (this.data.gi < this.data.grids.length - 1) {
                this.foundCount = 0
                this.wrongCount = 0
                this.setData({ gi: this.data.gi + 1, foundMap: {}, gridDone: false, pulseMap: {} })
                this.timers.push(setTimeout(() => this.repeat(), 600))
              } else {
                this.triggerEvent('complete', { mistakes: this.mistakes })
              }
            }, 900)
          )
        }
      } else {
        this.mistakes++
        this.wrongCount++
        this.setData({ wrongCell: i })
        playSfx('sfx-wrong')
        playVoice('voice-try-again')
        this.timers.push(setTimeout(() => this.setData({ wrongCell: -1 }), 500))
        if (this.data.voice) this.timers.push(setTimeout(() => this.repeat(), 1200))
        // 错3次起:短暂脉冲剩余目标格,提示后收回,不打穿玩法
        if (this.wrongCount >= 3) {
          const pulseMap = {}
          g.cells.forEach((c, idx) => {
            if (c === g.target.char && !this.data.foundMap[idx]) pulseMap[idx] = true
          })
          this.setData({ pulseMap })
          this.timers.push(setTimeout(() => this.setData({ pulseMap: {} }), 1500))
        }
      }
    },
  },
})
