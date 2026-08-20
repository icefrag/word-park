const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')

Component({
  properties: {
    grids: { type: Array, value: [] }, // [{target(字对象), cells: [char,...]}]
  },

  data: {
    gi: 0,
    cells: [], // 9 格视图模型:{ch, i, left, top} — 绝对定位坐标,布局不依赖任何 flex/grid
    boardW: 0,
    boardH: 0,
    foundMap: {}, // 已点中的格子下标 → true(WXML 不支持 indexOf,用对象查找)
    wrongCell: -1,
    gridDone: false,
    total: 0, // 当前网格中目标字出现次数
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
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
      // 9 格 3 行×3 列,坐标算死:每格 150rpx、间距 16rpx,总宽 482rpx
      const CELL = 150
      const GAP = 16
      const cells = g.cells.map((ch, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return { ch, i, left: col * (CELL + GAP), top: row * (CELL + GAP) }
      })
      this.setData({ cells, boardW: 3 * CELL + 2 * GAP, boardH: 3 * CELL + 2 * GAP })
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
                this.setData({ gi: this.data.gi + 1, foundMap: {}, gridDone: false })
                this.timers.push(setTimeout(() => this.repeat(), 600))
              } else {
                this.triggerEvent('complete', { mistakes: this.mistakes })
              }
            }, 900)
          )
        }
      } else {
        this.mistakes++
        this.setData({ wrongCell: i })
        playSfx('sfx-wrong')
        playVoice('voice-try-again')
        this.timers.push(setTimeout(() => this.setData({ wrongCell: -1 }), 500))
      }
    },
  },
})
