import type { Font } from 'opentype.js'
import { METRICS } from 'virtual:font-metrics'
import type { Cmd } from '@/livery/geometry'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { noteLine } from '@/ui/liveText'
import { PLATE_FRAME as L } from '@brand/plate-frame'
import { missingChars, oneLine, setLine as setType } from '@/ui/type'

// The print strip of a number plate frame: the 501×21 mm field under the plate of
// a standard 522×132 frame, where the frame maker prints in white on the black plastic. One line of the brand font's Medium
// with the case-sensitive forms, set as the brand's `@brand/plate-frame` says (`BrandPlateFrame`: the size, the tracking, how
// far its capitals stand under the top of the field), from the left edge or centred. The PDF has the field at 1:1 with the
// text in outlines, no bleed.

/** `@brand/plate-frame`: the line's size, mm, its tracking in em, and the distance from the field's top to the capitals' top, mm */
export interface BrandPlateFrame { size: number; tracking: number; top: number }

/** The strip in the frame's millimetres (the frame is 522×132) */
export const STRIP = { x: 10.5, y: 110, w: 501, h: 21 }

export const SIZE = L.size
export const TRACKING = L.tracking
/** The brand font's cap height, in em */
const CAP = METRICS.cap
/** The capitals' top `top` mm under the strip's top, so the baseline is a cap's height lower */
export const BASELINE = L.top + CAP * SIZE

export type Align = 'left' | 'center'

export interface Strip {
  cmds: Cmd[]
  /** Where the line starts in the strip, mm: 0, or centred */
  x: number
  issues: string[]
}

/** One line from `x` on `baseline`: the case-sensitive forms (on as in Figma), kerning and the tracking between letters */
const setLine = (font: Font, text: string, x: number, baseline: number) => setType(font, text, x, baseline, SIZE, ['case'], TRACKING * SIZE)

export function buildStrip(font: Font, raw: string, align: Align): Strip {
  const text = oneLine(raw)
  const { width } = setLine(font, text, 0, BASELINE)
  const x = align === 'left' ? 0 : (STRIP.w - width) / 2
  const { cmds, ink, pens } = setLine(font, text, x, BASELINE)
  // Noted for the editable template
  noteLine(font, SIZE, BASELINE, text, pens)
  const issues: string[] = []
  if (!text) issues.push('Нет текста')
  else if (width > STRIP.w || ink.x2 > STRIP.w || ink.x1 < 0) issues.push(`Текст шире ${STRIP.w} мм`)
  const missing = missingChars(font, text)
  if (missing.length) issues.push(`Нет в шрифте ${missing.map(c => `«${c}»`).join(', ')}`)
  if (hasProfanity(text)) issues.push(PROFANITY)
  return { cmds, x, issues }
}

/**
 * The fixed start of the line (the prefix) set alone from `x`, for editing the rest on the frame: its outlines and
 * where the next character starts, the tracking after its last glyph included
 */
export function lineStart(font: Font, text: string, x: number): { cmds: Cmd[]; end: number } {
  const { cmds, width } = setLine(font, text, x, BASELINE)
  return { cmds, end: x + width + TRACKING * SIZE }
}
