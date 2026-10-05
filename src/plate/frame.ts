import type { Font } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'

// The print strip of a number plate frame (Figma: UMO | Evrone, node 4970:2419): the 501×21 mm field under the plate of
// a standard 522×132 frame, where the frame maker prints in white on the black plastic. One line of CoFo Sans Medium,
// 18 mm with −1% tracking, its capitals 3 mm under the top of the field, set from the left edge or centred. The PDF has
// the field at 1:1 with the text in outlines, no bleed.

/** The strip in the frame's millimetres (the frame is 522×132) */
export const STRIP = { x: 10.5, y: 110, w: 501, h: 21 }

const SIZE = 18
const TRACKING = -0.01
/** CoFo Sans cap height, 680 of 1000 units */
const CAP = 0.68
/** The capitals' top 3 mm under the strip's top, as Figma's cap-height trim places them */
const BASELINE = 3 + CAP * SIZE

export type Align = 'left' | 'center'

export interface Strip {
  cmds: Cmd[]
  issues: string[]
}

/** Every kind of space becomes a plain one, zero-width marks and line breaks go (the strip holds one line) */
export function cleanText(text: string): string {
  return text.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()
}

export function buildStrip(font: Font, raw: string, align: Align): Strip {
  const text = cleanText(raw)
  const options = { letterSpacing: TRACKING }
  const width = font.getAdvanceWidth(text, SIZE, options)
  const x = align === 'left' ? 0 : (STRIP.w - width) / 2
  const path = font.getPath(text, x, BASELINE, SIZE, options)
  const ink = path.getBoundingBox()
  const issues: string[] = []
  if (!text) issues.push('Нет текста')
  else if (width > STRIP.w || ink.x2 > STRIP.w || ink.x1 < 0) issues.push(`Текст шире ${STRIP.w} мм`)
  const missing = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
  if (missing.length) issues.push(`Нет в шрифте ${missing.map(c => `«${c}»`).join(', ')}`)
  return { cmds: pathCmds(path.commands), issues }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pathCmds(commands: any[]): Cmd[] {
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
