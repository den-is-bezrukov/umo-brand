// Takes the owner's memo (Figma: UMO | Evrone, section 5222:5427) out of Figma into brand/umo/assets/memo and src/memo.
// Its two A4 pages (5228:2, 5228:40) come as SVG with the text in outlines, the dealership's contacts on the second
// page (5222:6042, drawn by the generator) taken out, numbers rounded to 0,01 px, every path that is text marked
// `data-text`, so the editable template leaves those out and sets the text live. The texts themselves, with their
// styles, lists and spacing, go to src/memo/texts.json for that live text. Run it by hand with a Figma token
// (FIGMA_TOKEN=figd_… node scripts/fetch-memo.mjs) after the memo changes in Figma, and review the changes with git diff.

import { writeFileSync } from "node:fs"

const FILE = "i6PdEDo72Vab0cAixG0nIz"
const PAGES = ["5228:2", "5228:40"]
/** The contacts, drawn by the generator */
const BLOCK = "5222:6042"
const TOKEN = process.env.FIGMA_TOKEN
if (!TOKEN) throw new Error("FIGMA_TOKEN=figd_… node scripts/fetch-memo.mjs")

const api = async path => {
  const res = await fetch(`https://api.figma.com/v1/${path}`, { headers: { "X-Figma-Token": TOKEN } })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

const { nodes } = await api(`files/${FILE}/nodes?ids=${PAGES.join(",")}`)
const { images } = await api(`images/${FILE}?ids=${PAGES.join(",")}&format=svg&svg_outline_text=true&svg_include_id=true`)

/** Every node under `n` */
const all = n => [n, ...(n.children ?? []).flatMap(all)]
const decode = s => Buffer.from(s.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c)), "latin1").toString("utf8")

const texts = []
for (const [p, id] of PAGES.entries()) {
  const page = nodes[id].document
  const box = page.absoluteBoundingBox
  const block = all(page).find(n => n.id === BLOCK)
  const inBlock = new Set(block ? all(block).map(n => n.id) : [])
  const textNodes = all(page).filter(n => n.type === "TEXT" && n.visible !== false)
  const names = new Set(textNodes.map(n => n.name))

  let svg = await (await fetch(images[id])).text()
  // The contacts' group, by its id (the block's name) and its first text's name inside it
  if (block) {
    const open = svg.indexOf(`<g id="${block.name}"`)
    if (open < 0) throw new Error(`No group «${block.name}» in page ${p + 1}`)
    let depth = 0
    let at = open
    for (const m of svg.slice(open).matchAll(/<g\b|<\/g>/g)) {
      depth += m[0] === "</g>" ? -1 : 1
      if (!depth) { at = open + m.index + 4; break }
    }
    svg = svg.slice(0, open) + svg.slice(at)
  }
  svg = svg
    // Text outlines are named after their text (Figma adds _2, _3 to repeats)
    .replace(/<path id="([^"]*)"/g, (_, name) => names.has(decode(name).replace(/_\d+$/, "")) || names.has(decode(name)) ? "<path data-text=\"1\"" : "<path")
    .replace(/ id="[^"]*"/g, "")
    .replace(/<g>|<\/g>/g, "")
    // White on white: the page's own fill, the contacts' frames
    .replace(/<rect [^>]*fill="white"[^>]*\/>/g, "")
    .replace(/-?\d+\.\d{3,}/g, n => String(Math.round(+n * 100) / 100))
    .replace(/>\s+</g, "><")
  writeFileSync(new URL(`../brand/umo/assets/memo/page-${p + 1}.svg`, import.meta.url), svg)

  for (const n of textNodes) {
    if (inBlock.has(n.id)) continue
    const b = n.absoluteBoundingBox
    const s = n.style
    const font = f => (f?.fontPostScriptName ?? s.fontPostScriptName).endsWith("Medium") ? "m" : "r"
    // Runs of one font: [from, to, font]
    const over = n.characterStyleOverrides ?? []
    const runs = []
    for (let i = 0; i < n.characters.length; i++) {
      const f = font(n.styleOverrideTable?.[over[i]])
      if (runs.length && runs.at(-1)[2] === f) runs.at(-1)[1] = i + 1
      else runs.push([i, i + 1, f])
    }
    texts.push({
      page: p, id: n.id,
      // A text as wide as its words (the title) never breaks
      x: Math.round(b.x - box.x), y: Math.round(b.y - box.y), w: s.textAutoResize === "WIDTH_AND_HEIGHT" ? 2100 : Math.round(b.width),
      size: s.fontSize, lineHeight: Math.round(s.lineHeightPx * 100) / 100,
      paragraphSpacing: s.paragraphSpacing ?? 0, listSpacing: s.listSpacing ?? 0,
      align: s.textAlignHorizontal === "CENTER" ? "center" : "left",
      text: n.characters, runs,
      lists: n.lineTypes?.some(t => t !== "NONE") ? n.lineTypes.map((t, i) => (t === "ORDERED" ? n.lineIndentations[i] : 0)) : undefined,
    })
  }
}
// Figma numbers a list on across the texts of a section (III: 1, then 2 and 3 in texts of their own) until the next
// heading, a larger size
let n = 0
for (const t of texts) {
  if (t.size > 36) n = 0
  if (!t.lists) continue
  if (n) t.start = n + 1
  n += t.lists.filter(Boolean).length
}
writeFileSync(new URL("../src/memo/texts.json", import.meta.url), JSON.stringify(texts, null, 1) + "\n")
console.log(`${texts.length} texts`)
