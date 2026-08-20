// WXML 良构性检查:标签闭合匹配(考虑自闭合),捕获编译期最常见错误
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'miniprogram'
const files = []
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.wxml')) files.push(p)
  }
}
walk(ROOT)

// WXML 非严格 XML:允许 <tag/> 自闭合;void 标签(image/input 等仍要求闭合写法)
let failed = 0
for (const file of files) {
  const src = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '') // 去注释
  const stack = []
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>/g
  let m
  let ok = true
  while ((m = re.exec(src))) {
    const [, closing, tag, , selfClose] = m
    if (closing) {
      const top = stack.pop()
      if (top !== tag) {
        console.log(`FAIL ${file}: </${tag}> 匹配到 <${top ?? '无'}>(位置 ${m.index})`)
        ok = false
        break
      }
    } else if (!selfClose) {
      stack.push(tag)
    }
  }
  if (ok && stack.length) {
    console.log(`FAIL ${file}: 未闭合标签 ${stack.join(',')}`)
    ok = false
  }
  if (ok) console.log(`OK   ${file}`)
  else failed++
}
process.exit(failed ? 1 : 0)
