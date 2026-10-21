import type { Font } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import { oneLine, pathCmds, wrap as wrapLines, type Fonts } from '@/ui/type'
import { withListBreak } from '@/data/positions'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { nameFault } from '@/ui/names'
import { noteLine } from '@/ui/liveText'
import { NAME_TAG_LOGO } from '@brand/logo'
import { SITE } from '@/site'

// A dealership employee's name tag, as in the hand-made source: a 70×25 mm plate with 4 mm rounded corners, the name and surname in the brand font's Medium
// 14 pt on 12 pt lines, the position in Regular 9 pt on 10.8 pt lines, both from the left margin of 4 mm, and the brand's
// logo 20×4 mm in the top right corner, 4 mm from the edges. Every number here was measured off that PDF.

const PT = 25.4 / 72

/** The PDF info entry holding the staff the tags were made from (`writePdfData`), read back when the PDF or ZIP is dropped */
export const TAGS_KEY = `${SITE.file}NameTags`

/** The plate, in millimetres */
export const TAG = { w: 70, h: 25, r: 4 }

const MARGIN = 4
/** The logo's column starts here; the name keeps 4 mm clear of it */
const LOGO_X = 46

interface Block { size: number; leading: number; baseline: number; maxWidth: number; maxLines: number }

/**
 * The name and surname: every line in the column left of the logo, 2 mm clear of it (40 mm: half the 4 mm margin, so
 * Преображенский, 39.6 mm, fits). Not running on under the logo, which looks broken: a double name or
 * surname breaks after its hyphen instead, and one too long without a hyphen is an error (Александровская, 40.3 mm),
 * as the type size can't be reduced
 */
const NAME: Block = { size: 14 * PT, leading: 12 * PT, baseline: 7.6486, maxWidth: LOGO_X - MARGIN - 2, maxLines: 1 }
/** Lines the name and surname may take together; at three the position is left one */
const NAME_LINES = 3
/**
 * The position, under the logo: the full width between the margins, up to two lines; a typed line break is kept.
 * Anchored at the bottom: `baseline` is the last line's, the source's second (21.23 mm), and a second line goes above
 * it, where the source has its first, so one line doesn't hang in the middle.
 */
const POSITION: Block = { size: 9 * PT, leading: 10.8 * PT, baseline: 17.4166 + 10.8 * PT, maxWidth: TAG.w - 2 * MARGIN, maxLines: 2 }

/** The logo of the source, in the tag's millimetres (nonzero fill) */
export const LOGO = NAME_TAG_LOGO

export interface Person { name: string; surname: string; position: string }


export type Field = keyof Person

/**
 * Where a field's text stands, for editing it on the tag: the top of its first line box as CSS sets a line of `leading`
 * (half the leading over the font's ascender), its line count, size and weight, in millimetres
 */
export interface FieldBox { cmds: Cmd[]; top: number; lines: number; size: number; leading: number; medium: boolean }

export interface Tag {
  /** Text outlines in millimetres, y down */
  cmds: Cmd[]
  fields: Record<Field, FieldBox>
  issues: string[]
}

/** The top of a CSS line box of `leading` whose baseline is at `baseline` */
function lineTop(font: Font, size: number, leading: number, baseline: number): number {
  const ascent = font.ascender / font.unitsPerEm * size
  const descent = -font.descender / font.unitsPerEm * size
  return baseline - (leading - ascent - descent) / 2 - ascent
}

const inkWidth = (font: Font, text: string, size: number) => {
  const b = font.getPath(text.replace(/ /g, ' '), 0, 0, size).getBoundingBox()
  return text.trim() ? b.x2 - Math.min(b.x1, 0) : 0
}

const wrap = (font: Font, text: string, block: Block) =>
  wrapLines(text.split('\n').map(oneLine).filter(Boolean), l => inkWidth(font, l, block.size) <= block.maxWidth)

function setLines(font: Font, lines: string[], block: Block, first: number, label: string, cmds: Cmd[], issues: string[]) {
  lines.forEach((t, i) => {
    const text = t.replace(/ /g, ' ')
    const baseline = block.baseline + (first + i) * block.leading
    const path = font.getPath(text, MARGIN, baseline, block.size)
    cmds.push(...pathCmds(path.commands))
    // Noted for the editable template, each glyph at the pen `getPath` gives it
    const pens: number[] = []
    font.forEachGlyph(text, MARGIN, baseline, block.size, {}, (_g, x) => { pens.push(x) })
    noteLine(font, block.size, baseline, text, pens)
    if (inkWidth(font, t, block.size) > block.maxWidth + 0.01) issues.push(`${label} шире ${block.maxWidth} мм`)
  })
}

/**
 * A double name or surname too long for its line breaks after a hyphen, as on passports and door plates
 * («Петропавловская-» / «Преображенская»): at the last hyphen that leaves the first part within `maxWidth`. The type
 * size never shrinks; one without a hyphen stays one line and turns red if it's too long.
 */
function splitAtHyphen(font: Font, text: string, maxWidth: number): string[] {
  if (!text) return []
  if (inkWidth(font, text, NAME.size) <= maxWidth) return [text]
  const hyphens = [...text.matchAll(/-/g)].map(m => m.index!).filter(i => i > 0 && i < text.length - 1).reverse()
  const at = hyphens.find(i => inkWidth(font, text.slice(0, i + 1), NAME.size) <= maxWidth) ?? hyphens[hyphens.length - 1]
  return at === undefined ? [text] : [text.slice(0, at + 1), text.slice(at + 1)]
}

export function buildTag(fonts: Fonts, person: Person): Tag {
  // A typed line break splits the name or surname; without one a long double one breaks after a hyphen
  const typedName = person.name.split('\n').map(oneLine).filter(Boolean)
  const typedSurname = person.surname.split('\n').map(oneLine).filter(Boolean)
  const name = typedName.join(' ')
  const surname = typedSurname.join(' ')
  const position = withListBreak(person.position.replace(/\r/g, ''))
  const issues: string[] = []
  const nameCmds: Cmd[] = []
  const surnameCmds: Cmd[] = []
  const positionCmds: Cmd[] = []
  const nameLines = typedName.length > 1 ? typedName : splitAtHyphen(fonts.medium, name, NAME.maxWidth)
  const surnameLines = typedSurname.length > 1 ? typedSurname : splitAtHyphen(fonts.medium, surname, NAME.maxWidth)
  // The surname starts on the second line even without a name
  const first = Math.max(nameLines.length, 1)
  nameLines.forEach((t, i) => setLines(fonts.medium, [t], NAME, i, 'Имя', nameCmds, issues))
  surnameLines.forEach((t, i) => setLines(fonts.medium, [t], NAME, first + i, 'Фамилия', surnameCmds, issues))
  const used = surnameLines.length ? first + surnameLines.length : nameLines.length
  if (used > NAME_LINES) issues.push('Имя и фамилия — не больше трёх строк')
  // Three lines of name and surname leave the position room for one
  const block = used >= NAME_LINES ? { ...POSITION, maxLines: 1 } : POSITION
  const lines = wrap(fonts.regular, position, POSITION)
  const shown = lines.slice(0, block.maxLines + 1)
  // Lines over the limit run down off the plate rather than up into the name
  const positionFirst = 1 - Math.min(Math.max(shown.length, 1), block.maxLines)
  setLines(fonts.regular, shown, block, positionFirst, 'Должность', positionCmds, issues)
  if (lines.length > block.maxLines) {
    issues.push(block.maxLines === 1 ? 'При имени и фамилии в три строки должность — в одну: сократите её' : 'Должность длиннее двух строк: сократите её')
  }
  const missing = (font: Font, t: string) => [...t.replace(/\s/g, '')].filter(c => !font.hasChar(c))
  const absent = [...new Set([...missing(fonts.medium, name + surname), ...missing(fonts.regular, oneLine(position))])]
  for (const [label, t] of [['Имя', name], ['Фамилия', surname], ['Должность', position]]) {
    if (hasProfanity(t)) issues.push(`${label}: ${PROFANITY.toLowerCase()}`)
  }
  for (const [label, t] of [['Имя', name], ['Фамилия', surname]]) {
    const fault = nameFault(t)
    if (fault) issues.push(`${label}: ${fault}`)
  }
  if (absent.length) issues.push(`Нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}`)
  const box = (cmds: Cmd[], font: Font, b: Block, firstLine: number, lines: number, medium: boolean): FieldBox =>
    ({ cmds, top: lineTop(font, b.size, b.leading, b.baseline + firstLine * b.leading), lines: Math.max(lines, 1), size: b.size, leading: b.leading, medium })
  return {
    cmds: [...nameCmds, ...surnameCmds, ...positionCmds],
    fields: {
      name: box(nameCmds, fonts.medium, NAME, 0, nameLines.length, true),
      surname: box(surnameCmds, fonts.medium, NAME, first, surnameLines.length, true),
      position: box(positionCmds, fonts.regular, block, positionFirst, shown.length, false),
    },
    issues: [...new Set(issues)],
  }
}
