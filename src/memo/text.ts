import type { Font, Glyph } from 'opentype.js'

// The memo's texts as Figma sets them, line by line, for the editable template's live text (the brand's memo/texts.json,
// written by scripts/fetch-memo.mjs; the PDF in outlines takes Figma's own outlines instead). Figma px, 10 a
// millimetre, y down. Figma centres the font's height (hhea, 974 + 286 of 1000) in each line's box, breaks lines
// between words (a no-break space holds two together), puts `paragraphSpacing` after a paragraph and `listSpacing`
// between a list's items, and hangs an ordered list's number in its indent.

export type FontKey = 'r' | 'm'
export type MemoFonts = Record<FontKey, Font>

export interface MemoText {
  page: number
  id: string
  x: number
  y: number
  w: number
  size: number
  lineHeight: number
  paragraphSpacing: number
  listSpacing: number
  align: 'left' | 'center'
  text: string
  /** [from, to, font] over `text` */
  runs: [number, number, FontKey][]
  /** Each paragraph's list level (0: none), where the text has a list */
  lists?: number[]
  /** The number of its first list item, where a list goes on from the text before it */
  start?: number
}

/** One font's stretch of a line, from `x` */
export interface Seg { font: FontKey; text: string; x: number }
export interface Line { baseline: number; segs: Seg[] }

/** A list's indent, a level; its number ends `MARKER_GAP` short of the text */
const INDENT = 55
const MARKER_GAP = 13

const ASCENT = 0.974
const HEIGHT = 0.974 + 0.286

/** Advances and kerning of one font's text from `x`: each glyph's pen position */
function advance(font: Font, text: string, size: number): { glyphs: Glyph[]; pens: number[]; end: number } {
  const k = size / font.unitsPerEm
  const glyphs = font.stringToGlyphs(text)
  const pens: number[] = []
  let pen = 0
  glyphs.forEach((g, i) => {
    pens.push(pen)
    pen += (g.advanceWidth ?? 0) * k
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * k
  })
  return { glyphs, pens, end: pen }
}

/** A text's lines, set as Figma sets them */
export function layoutText(fonts: MemoFonts, t: MemoText, start = t.start ?? 1): Line[] {
  const fontAt = (i: number): FontKey => t.runs.find(([a, b]) => i >= a && i < b)?.[2] ?? t.runs[0][2]
  const lines: Line[] = []
  let top = t.y
  let n = start
  let offset = 0
  const paragraphs = t.text.replace(/\r/g, '').split('\n')
  paragraphs.forEach((paragraph, p) => {
    const from = offset
    offset += paragraph.length + 1
    if (!paragraph && p === paragraphs.length - 1) return
    const level = t.lists?.[p] ?? 0
    const indent = level * INDENT
    if (p > 0) top += level && t.lists?.[p - 1] ? t.listSpacing : t.paragraphSpacing
    const baselineIn = (t.lineHeight - HEIGHT * t.size) / 2 + ASCENT * t.size

    // Words with the font of each character; a line separator (U+2028) breaks a line within the paragraph
    let at = from
    const hardLines = paragraph.split(' ').map(s => { const b = at; at += s.length + 1; return { s, b } })
    hardLines.forEach(({ s, b }, h) => {
      const words: { text: string; at: number }[] = []
      let i = 0
      for (const w of s.split(' ')) { if (w) words.push({ text: w, at: b + i }); i += w.length + 1 }
      /** A line's segments from its first word, the space between words in the font of the word before */
      const set = (ws: typeof words): { segs: Seg[]; width: number } => {
        const segs: Seg[] = []
        let x = 0
        let text = ''
        let font: FontKey | null = null
        const flush = () => {
          if (!text || !font) return
          segs.push({ font, text, x })
          x += advance(fonts[font], text, t.size).end
          text = ''
        }
        ws.forEach((w, wi) => {
          const chars = wi ? [' ', ...w.text] : [...w.text]
          chars.forEach((c, ci) => {
            const f = fontAt(c === ' ' ? ws[wi - 1].at + ws[wi - 1].text.length : w.at + ci - (wi ? 1 : 0))
            if (f !== font) { flush(); font = f }
            text += c
          })
        })
        flush()
        return { segs, width: x }
      }
      let line: typeof words = []
      const emit = (ws: typeof words, first: boolean) => {
        const { segs, width } = set(ws)
        const left = t.x + indent + (t.align === 'center' ? (t.w - indent - width) / 2 : 0)
        const out: Line = { baseline: top + baselineIn, segs: segs.map(sg => ({ ...sg, x: sg.x + left })) }
        // The list's number in its indent, in the first word's font
        if (first && level) {
          const marker = `${n}.`
          const f = fontAt(ws[0]?.at ?? from)
          out.segs.unshift({ font: f, text: marker, x: t.x + indent - MARKER_GAP - advance(fonts[f], marker, t.size).end })
        }
        lines.push(out)
        top += t.lineHeight
      }
      let first = h === 0
      for (const w of words) {
        const next = [...line, w]
        if (line.length && set(next).width > t.w - indent + 0.01) {
          emit(line, first)
          first = false
          line = [w]
        } else line = next
      }
      emit(line, first)
    })
    if (level) n++
  })
  return lines
}

/** A line's segments as glyphs, for outlines: each glyph's path at its pen */
export function glyphRuns(fonts: MemoFonts, size: number, seg: Seg, baseline: number): { glyph: Glyph; x: number; y: number }[] {
  const { glyphs, pens } = advance(fonts[seg.font], seg.text, size)
  return glyphs.map((glyph, i) => ({ glyph, x: seg.x + pens[i], y: baseline }))
}

export { advance }
