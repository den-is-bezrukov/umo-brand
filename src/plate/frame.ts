import type { Font, Glyph } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import { hasProfanity, PROFANITY } from '@/ui/profanity'

// The print strip of a number plate frame (Figma: UMO | Evrone, node 4970:2419): the 501×21 mm field under the plate of
// a standard 522×132 frame, where the frame maker prints in white on the black plastic. One line of CoFo Sans Medium,
// 18 mm with −1% tracking and the case-sensitive forms, its capitals 2.5 mm under the top of the field, set from the left edge or centred. The PDF has
// the field at 1:1 with the text in outlines, no bleed.

/** The strip in the frame's millimetres (the frame is 522×132) */
export const STRIP = { x: 10.5, y: 110, w: 501, h: 21 }

export const SIZE = 18
export const TRACKING = -0.01
/** CoFo Sans cap height, 680 of 1000 units */
const CAP = 0.68
/**
 * The capitals' top 2.5 mm under the strip's top: half a millimetre above Figma's 3, as the line is mostly lowercase
 * and Ц's tail, and its weight sat low between the plate and the frame's rounded bottom
 */
export const BASELINE = 2.5 + CAP * SIZE

export type Align = 'left' | 'center'

export interface Strip {
  cmds: Cmd[]
  /** Where the line starts in the strip, mm: 0, or centred */
  x: number
  issues: string[]
}

/** Every kind of space becomes a plain one, zero-width marks and line breaks go (the strip holds one line) */
export function cleanText(text: string): string {
  return text.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * The font's case-sensitive forms (`case`: the bar, brackets and dashes raised to the capitals), on as in Figma.
 * opentype.js doesn't apply this feature itself; it's a single substitution, done here glyph by glyph.
 */
const caseForms = new WeakMap<Font, Map<number, number>>()
export function caseMap(font: Font): Map<number, number> {
  let map = caseForms.get(font)
  if (!map) {
    map = new Map()
    for (const script of ['DFLT', 'cyrl', 'latn']) {
      // getSingle is in opentype.js, not in its typings
      const single = (font.substitution as unknown as { getSingle(f: string, s: string, l: string): { sub: number; by: number }[] }).getSingle
      for (const { sub, by } of single.call(font.substitution, 'case', script, 'dflt')) map.set(sub, by)
    }
    caseForms.set(font, map)
  }
  return map
}

/** One line from `x` on `baseline`: case forms, kerning and the tracking between letters */
function setLine(font: Font, text: string, x: number, baseline: number) {
  const scale = SIZE / font.unitsPerEm
  const forms = caseMap(font)
  const glyphs: Glyph[] = font.stringToGlyphs(text).map(g => font.glyphs.get(forms.get(g.index) ?? g.index))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands: any[] = []
  const ink = { x1: Infinity, x2: -Infinity }
  let pen = x
  glyphs.forEach((g, i) => {
    const p = g.getPath(pen, baseline, SIZE)
    commands.push(...p.commands)
    const b = p.getBoundingBox()
    if (p.commands.length) { ink.x1 = Math.min(ink.x1, b.x1); ink.x2 = Math.max(ink.x2, b.x2) }
    pen += g.advanceWidth! * scale
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale + TRACKING * SIZE
  })
  return { commands, ink, width: pen - x }
}

export function buildStrip(font: Font, raw: string, align: Align): Strip {
  const text = cleanText(raw)
  const { width } = setLine(font, text, 0, BASELINE)
  const x = align === 'left' ? 0 : (STRIP.w - width) / 2
  const { commands, ink } = setLine(font, text, x, BASELINE)
  const issues: string[] = []
  if (!text) issues.push('Нет текста')
  else if (width > STRIP.w || ink.x2 > STRIP.w || ink.x1 < 0) issues.push(`Текст шире ${STRIP.w} мм`)
  const missing = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
  if (missing.length) issues.push(`Нет в шрифте ${missing.map(c => `«${c}»`).join(', ')}`)
  if (hasProfanity(text)) issues.push(PROFANITY)
  return { cmds: pathCmds(commands), x, issues }
}

/**
 * The fixed start of the line (the prefix) set alone from `x`, for editing the rest on the frame: its outlines and
 * where the next character starts, the tracking after its last glyph included
 */
export function lineStart(font: Font, text: string, x: number): { cmds: Cmd[]; end: number } {
  const { commands, width } = setLine(font, text, x, BASELINE)
  return { cmds: pathCmds(commands), end: x + width + TRACKING * SIZE }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pathCmds(commands: any[]): Cmd[] {
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') { cmds.push([c.type, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'C') { cmds.push(['C', c.x1, c.y1, c.x2, c.y2, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'Q') {
      cmds.push(['C', cx + (2 / 3) * (c.x1 - cx), cy + (2 / 3) * (c.y1 - cy), c.x + (2 / 3) * (c.x1 - c.x), c.y + (2 / 3) * (c.y1 - c.y), c.x, c.y])
      cx = c.x; cy = c.y
    } else if (c.type === 'Z') cmds.push(['Z'])
  }
  return cmds
}
