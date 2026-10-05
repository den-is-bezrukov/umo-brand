import { parse, type Font } from 'opentype.js'
import { loadFont, type Cmd } from '@/livery/geometry'

// A dealership employee's name tag (Figma: UMO | Evrone, node 4021:2878), as in the hand-made Illustrator source in
// Yandex Disk `02 UMO/Name Tag`: a 70×25 mm plate with 4 mm rounded corners, the name and surname in CoFo Sans Medium
// 14 pt on 12 pt lines, the position in Regular 9 pt on 10.8 pt lines, both from the left margin of 4 mm, and the UMO
// logo 20×4 mm in the top right corner, 4 mm from the edges. Every number here was measured off that PDF.

const PT = 25.4 / 72

/** The plate, in millimetres */
export const TAG = { w: 70, h: 25, r: 4 }

const MARGIN = 4
/** The logo's column starts here; the name keeps 4 mm clear of it */
const LOGO_X = 46

interface Block { size: number; leading: number; baseline: number; maxWidth: number; maxLines: number }

/** The name on the first line, 4 mm clear of the logo */
const NAME: Block = { size: 14 * PT, leading: 12 * PT, baseline: 7.6486, maxWidth: LOGO_X - MARGIN - MARGIN, maxLines: 1 }
/**
 * The surname on the second, under the logo's bottom edge, so it may run the full width between the margins: long
 * surnames (Александровская is 40 mm) don't fit beside the logo, and the type size can't be reduced
 */
const SURNAME: Block = { ...NAME, maxWidth: TAG.w - 2 * MARGIN }
/**
 * The position, under the logo: the full width between the margins, up to two lines; a typed line break is kept.
 * Anchored at the bottom: `baseline` is the last line's, the source's second (21.23 mm), and a second line goes above
 * it, where the source has its first, so one line doesn't hang in the middle.
 */
const POSITION: Block = { size: 9 * PT, leading: 10.8 * PT, baseline: 17.4166 + 10.8 * PT, maxWidth: TAG.w - 2 * MARGIN, maxLines: 2 }

/** The UMO logo of the source, in the tag's millimetres (nonzero fill) */
export const LOGO = 'M61.6 6.55L64.5 6.55L64.5 5.445L61.6 5.45ZM64.499 4C65.512 4 66 4.418 66 5.445L66 6.555C66 7.582 65.512 8 64.499 8L61.601 8C60.588 8 60.1 7.582 60.1 6.555L60.1 5.445C60.1 4.419 60.588 4 61.601 4ZM50.1 6.55L47.5 6.55L47.5 4L46 4L46 6.555C46 7.582 46.488 8 47.501 8L50.099 8C51.112 8 51.6 7.582 51.6 6.555L51.6 4L50.1 4ZM58.1 4C59.112 4 59.6 4.418 59.6 5.445L59.6 8L58.1 8L58.1 5.45L56.6 5.45L56.6 8L55.1 8L55.1 5.45L56.6 5.45L56.6 4ZM55.1 5.45L53.6 5.45L53.6 8L52.1 8L52.1 5.445C52.1 4.419 52.587 4 53.6 4L55.1 4Z'

export interface Person { name: string; surname: string; position: string }

export interface Fonts { medium: Font; regular: Font }

export interface Tag {
  /** Text outlines in millimetres, y down */
  cmds: Cmd[]
  issues: string[]
}

let regularPromise: Promise<Font> | undefined
export function loadFonts(): Promise<Fonts> {
  regularPromise ??= fetch(`${import.meta.env.BASE_URL}fonts/CoFoSans-Regular.ttf`)
    .then(r => r.arrayBuffer())
    .then(buf => parse(buf))
  return Promise.all([loadFont(), regularPromise]).then(([medium, regular]) => ({ medium, regular }))
}

/** Every kind of space becomes a plain one, zero-width marks and line breaks go */
export function clean(text: string): string {
  return text.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()
}

/** Words of one or two characters (prepositions) stick to the next word */
function bindShortWords(text: string): string {
  let prev
  do {
    prev = text
    text = text.replace(/(^|[\s ])([^\s ]{1,2}) +(?=\S)/g, '$1$2 ')
  } while (text !== prev)
  return text
}

const inkWidth = (font: Font, text: string, size: number) => {
  const b = font.getPath(text.replace(/ /g, ' '), 0, 0, size).getBoundingBox()
  return text.trim() ? b.x2 - Math.min(b.x1, 0) : 0
}

function wrap(font: Font, text: string, block: Block): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n').map(clean).filter(Boolean)) {
    let line = ''
    for (const w of bindShortWords(paragraph).split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${w}` : w
      if (line && inkWidth(font, candidate, block.size) > block.maxWidth) {
        lines.push(line)
        line = w
      } else line = candidate
    }
    if (line) lines.push(line)
  }
  return lines
}

function setLines(font: Font, lines: string[], block: Block, first: number, label: string, cmds: Cmd[], issues: string[]) {
  lines.forEach((t, i) => {
    const path = font.getPath(t.replace(/ /g, ' '), MARGIN, block.baseline + (first + i) * block.leading, block.size)
    cmds.push(...pathCmds(path.commands))
    if (inkWidth(font, t, block.size) > block.maxWidth + 0.01) issues.push(`${label} шире ${block.maxWidth} мм`)
  })
}

/**
 * A double surname too long for its line breaks after a hyphen, as on passports and door plates
 * («Петропавловская-» / «Преображенская»): at the last hyphen that leaves the first part fitting. The type size never
 * shrinks; a surname without a hyphen stays one line and turns red if it's too long.
 */
function splitSurname(font: Font, surname: string): string[] {
  if (!surname) return []
  if (inkWidth(font, surname, SURNAME.size) <= SURNAME.maxWidth) return [surname]
  const hyphens = [...surname.matchAll(/-/g)].map(m => m.index!).filter(i => i > 0 && i < surname.length - 1).reverse()
  const at = hyphens.find(i => inkWidth(font, surname.slice(0, i + 1), SURNAME.size) <= SURNAME.maxWidth) ?? hyphens[hyphens.length - 1]
  return at === undefined ? [surname] : [surname.slice(0, at + 1), surname.slice(at + 1)]
}

export function buildTag(fonts: Fonts, person: Person): Tag {
  const name = clean(person.name)
  // A typed line break splits the surname; without one a long double surname breaks after a hyphen
  const typed = person.surname.split('\n').map(clean).filter(Boolean)
  const surname = typed.join(' ')
  const position = person.position.replace(/\r/g, '')
  const cmds: Cmd[] = []
  const issues: string[] = []
  setLines(fonts.medium, name ? [name] : [], NAME, 0, 'Имя', cmds, issues)
  const surnameLines = typed.length > 1 ? typed : splitSurname(fonts.medium, surname)
  if (surnameLines.length > 2) issues.push('Фамилия — не больше двух строк')
  setLines(fonts.medium, surnameLines.slice(0, 3), SURNAME, 1, 'Фамилия', cmds, issues)
  // A surname in two lines leaves the position room for one
  const block = surnameLines.length > 1 ? { ...POSITION, maxLines: 1 } : POSITION
  const lines = wrap(fonts.regular, position, POSITION)
  const shown = lines.slice(0, block.maxLines + 1)
  setLines(fonts.regular, shown, block, 1 - shown.length, 'Должность', cmds, issues)
  if (lines.length > block.maxLines) {
    issues.push(block.maxLines === 1 ? 'При фамилии в две строки должность — в одну: сократите её' : 'Должность длиннее двух строк: сократите её')
  }
  const missing = (font: Font, t: string) => [...t.replace(/\s/g, '')].filter(c => !font.hasChar(c))
  const absent = [...new Set([...missing(fonts.medium, name + surname), ...missing(fonts.regular, clean(position))])]
  if (absent.length) issues.push(`Нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}`)
  return { cmds, issues: [...new Set(issues)] }
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
