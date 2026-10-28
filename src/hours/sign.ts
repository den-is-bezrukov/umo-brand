import type { Font } from 'opentype.js'
import { logo } from '@/card/card'
import type { Cmd } from '@/livery/geometry'
import { missingChars, oneLine, setRuns as setType, wrapWords } from '@/ui/type'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { noteLine } from '@/ui/liveText'
import { HOURS_SIGN as L } from '@brand/hours-sign'
import { SITE } from '@/site'

// The hours sign, laid out as the brand's `@brand/hours-sign` says (`BrandHoursSign`): a plate or sheet of blocks —
// the logo, the hours, lines and columns of rows — whose texts are templates of the brand's fields
// («Адрес: {address}»), all in the brand font's Medium, in one or more variants (white, black).

/** The key of the fields as typed in the PDF's info (`writePdfData`) */
export const SIGN_KEY = `${SITE.file}HoursSign`

/** A field of the sign: the hours' `from` and `to`, or one of the brand's (`BrandHoursSign.fields`) */
export type SignField = string

/** A text set as a template: `{id}` puts in a field (`{id:title}` as a title, `titleOf`), the rest stays fixed */
type Template = string

/** Where a text starts: from `x`, or centred on the sheet by its ink */
type At = number | 'centre'

/** One piece of the sign, mm, y down; a size in mm, tracking of it, OpenType features to apply */
export type SignBlock =
  /** The brand's logo `w` wide from (x, y) */
  | { kind: 'logo'; x: number; y: number; w: number }
  /**
   * The hours, «9:00—21:00» with `dash` between them, the minutes `always` or `unlessZero` («10–19»): as wide as `fit`
   * set at `size` always, or `size` and smaller when wider than `width`
   */
  | { kind: 'hours'; x: At; baseline: number; size: number; track?: number; feats?: string[]; dash: string; minutes: 'always' | 'unlessZero'; fit?: [string, string]; width: number }
  /** A line within `width`, or, with `lines`, up to that many lines from `baseline` down, `leading` apart */
  | { kind: 'line'; x: At; baseline: number; size: number; track?: number; feats?: string[]; text: Template; label: string; width: number; lines?: number; leading?: number }
  /**
   * Rows from the left, `leading` apart, hanging from a first baseline (`top`) or standing on the last (`bottom`); a
   * row of more `lines` than one breaks between words, two of them balanced
   */
  | { kind: 'rows'; x: number; size: number; leading: number; track?: number; width: number; top?: number; bottom?: number; rows: { text: Template; label: string; lines?: number }[] }

/**
 * A field of the brand's form: `dealer` picks one of the brand's points of sale and puts in their address, phone and
 * hours; `site` follows the dealer's name until edited; `phone` takes the phone mask; `address` and `text` are plain.
 * `param` its name in a link (`id` without), `default` what it starts with, `missing` what the download button asks
 * while it's empty
 */
export interface SignFieldSpec { id: string; param?: string; kind: 'dealer' | 'address' | 'phone' | 'site' | 'text'; label: string; placeholder: string; missing: string; default?: string }

/** `@brand/hours-sign`: the sheet, mm, the hours' placeholders and defaults, the fields in the form's order, the variants */
export interface BrandHoursSign {
  size: { w: number; h: number }
  hours: { placeholder: [string, string]; default?: [string, string] }
  fields: SignFieldSpec[]
  /** The first the default; `dark` a black sheet, the text white */
  variants: { label: string; dark: boolean; blocks: SignBlock[] }[]
}

/** The sign, mm */
export const SIGN = L.size
export const FIELDS = L.fields
export const HOURS = L.hours
export const VARIANTS = L.variants

/** The logo of a variant, if it has one */
export const signLogo = (variant = 0) => {
  const b = (L.variants[variant] ?? L.variants[0]).blocks.find(b => b.kind === 'logo')
  return b ? logo(b.x, b.y, b.w) : []
}

/** What the sign is made from: `from`, `to` and the brand's fields by id */
export type Input = Record<SignField, string>

export interface Issue { field: SignField; text: string }

export interface Sign {
  /** The logo, fixed */
  logo: Cmd[]
  /** The outlines by field; `fixed` is what never changes colour (the words before a value, the dash between the hours) */
  parts: { field: SignField | 'fixed'; cmds: Cmd[] }[]
  issues: Issue[]
}

/** A time as typed («9», «900», «09.00», «21:00»), as the sign sets it, «9:00»; null if it isn't one */
export function timeText(raw: string): string | null {
  const m = oneLine(raw).match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/)
  if (!m) return null
  const h = +m[1]
  const min = m[2] ?? '00'
  if (h > 24 || +min > 59 || (h === 24 && min !== '00')) return null
  return `${h}:${min}`
}

/**
 * A company's name as a title: its quotes gone and its legal form on a line of its own, «ООО «Компания»» as «ООО» over
 * «Компания»
 */
export const titleOf = (name: string) =>
  oneLine(name).replace(/[«»"„“”]/g, '').replace(/^(ООО|ОАО|ЗАО|ПАО|АО|ИП|НКО|АНО)\s+/, '$1\n')

interface Run { field: SignField | 'fixed'; text: string }

/** A template's runs: the fixed words, and each field as typed (one line, or as a title) */
function runsOf(template: Template, input: Input): Run[] {
  return template.split(/(\{\w+(?::title)?\})/).filter(Boolean).map(part => {
    const m = part.match(/^\{(\w+)(:title)?\}$/)
    if (!m) return { field: 'fixed', text: part }
    const value = input[m[1]] ?? ''
    return { field: m[1], text: m[2] ? titleOf(value) : oneLine(value) }
  })
}

/** The fields a template puts in */
const fieldsOf = (template: Template) => [...template.matchAll(/\{(\w+)(?::title)?\}/g)].map(m => m[1])

/**
 * Runs of text set one after another from `x` on `baseline`, the features asked for, kerning (across runs too) and
 * tracking: the outlines per run, the line's advance width and each glyph's pen
 */
function setRuns(font: Font, runs: Run[], x: number, baseline: number, size: number, feats: string[] = [], track = 0) {
  const set = setType(font, runs.map(r => r.text), x, baseline, size, feats, track * size)
  return { ...set, parts: runs.map((r, i) => ({ field: r.field, cmds: set.parts[i] })) }
}

/** Sets the runs as `setRuns` and notes the line for the editable template */
function placeRuns(font: Font, runs: Run[], x: number, baseline: number, size: number, feats: string[] = [], track = 0) {
  const set = setRuns(font, runs, x, baseline, size, feats, track)
  noteLine(font, size, baseline, runs.map(r => r.text).join(''), set.pens)
  return set
}

const width = (font: Font, text: string, size: number, track = 0) => setRuns(font, [{ field: 'fixed', text }], 0, 0, size, [], track).ink.x2

/**
 * Two lines broken where a typesetter would: after the comma that leaves them nearest in length, as an address
 * breaks between its parts («…, вл5с3, | торгово-промышленная зона Алтуфьево, посёлок Вешки»), unless every comma
 * leaves the longer line more than 15% of the column longer than it need be; then wherever the lines come nearest,
 * `text-wrap: balance` as CSS has it. Never right after the first word, a prefix («Адрес:»)
 */
function balanced(font: Font, words: string[], size: number, column: number, track = 0): string[] | undefined {
  let best: { k: number; long: number } | undefined
  let comma: { k: number; long: number } | undefined
  for (let k = 2; k < words.length; k++) {
    const long = Math.max(width(font, words.slice(0, k).join(' '), size, track), width(font, words.slice(k).join(' '), size, track))
    if (long > column) continue
    if (!best || long < best.long) best = { k, long }
    if (words[k - 1].endsWith(',') && (!comma || long < comma.long)) comma = { k, long }
  }
  const at = comma && best && comma.long <= best.long + 0.15 * column ? comma : best
  return at && [words.slice(0, at.k).join(' '), words.slice(at.k).join(' ')]
}

/**
 * Runs in lines within `column`, breaking where typed and between words, two lines of one paragraph balanced: the
 * runs of each line, each character keeping its field
 */
function wrapRuns(font: Font, runs: Run[], size: number, column: number, track = 0): Run[][] {
  const text = runs.map(r => r.text).join('')
  const owner = runs.flatMap(r => [...r.text].map(() => r.field))
  const out: Run[][] = []
  let at = 0
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ')
    const lines = wrapWords(words, l => width(font, l, size, track) <= column)
    const two = lines.length === 2 && balanced(font, words, size, column, track)
    if (two) lines.splice(0, 2, ...two)
    for (const l of lines) {
      const line: Run[] = []
      ;[...l].forEach((c, i) => {
        const field = owner[at + i]
        if (line.length && line[line.length - 1].field === field) line[line.length - 1].text += c
        else line.push({ field, text: c })
      })
      out.push(line)
      at += l.length + 1
    }
    if (!lines.length) at += 1
  }
  return out
}

/** The time as the block sets it: «9:00», or «10» for «10:00» with `unlessZero` */
const timeAs = (t: string, minutes: 'always' | 'unlessZero') => minutes === 'unlessZero' ? t.replace(/:00$/, '') : t

/**
 * The sign in a variant. The texts come as shown: the page puts placeholders in empty fields, the same layout then
 * holding them in grey
 */
export function buildSign(font: Font, input: Input, variant = 0): Sign {
  const parts: Sign['parts'] = []
  const issues: Issue[] = []
  const checks: [SignField, string][] = []
  const check = (field: SignField, label: string, text: string) => {
    const absent = missingChars(font, text)
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /**
   * One line from `x` or centred, its type scaled to `fit` mm of ink when given, or down to `column` with `shrink`,
   * else checked against the column
   */
  const line = (runs: Run[], spec: { x: At; size: number; track?: number; baseline: number }, feats: string[], column: number, label: string, field: SignField, fit?: number, shrink?: boolean) => {
    const track = spec.track ?? 0
    const probe = setRuns(font, runs, 0, 0, spec.size, feats, track)
    const full = probe.ink.x2 - probe.ink.x1
    const size = fit && full > 0 ? spec.size * fit / full : shrink && full > column ? spec.size * column / full : spec.size
    if (!fit && !shrink && full > column + 0.01) issues.push({ field, text: `${label} шире ${Math.round(column)} мм` })
    const k = size / spec.size
    // Centred by the ink, as the source's line sits
    const x = spec.x === 'centre' ? (SIGN.w - full * k) / 2 - probe.ink.x1 * k : spec.x
    parts.push(...placeRuns(font, runs, x, spec.baseline, size, feats, track).parts)
  }

  for (const b of L.variants[variant]?.blocks ?? L.variants[0].blocks) {
    if (b.kind === 'logo') continue
    if (b.kind === 'hours') {
      const from = timeText(input.from)
      const to = timeText(input.to)
      if (!from) issues.push({ field: 'from', text: 'Открытие: проверьте время' })
      if (!to) issues.push({ field: 'to', text: 'Закрытие: проверьте время' })
      const runs = (a: string, z: string): Run[] => [{ field: 'from', text: a }, { field: 'fixed', text: b.dash }, { field: 'to', text: z }]
      const feats = b.feats ?? []
      const ref = b.fit && setRuns(font, runs(...b.fit), 0, 0, b.size, feats, b.track ?? 0).ink
      line(runs(from ? timeAs(from, b.minutes) : oneLine(input.from), to ? timeAs(to, b.minutes) : oneLine(input.to)), b, feats, b.width, 'Время', 'from', ref ? ref.x2 - ref.x1 : undefined, !ref)
    } else if (b.kind === 'line') {
      const runs = runsOf(b.text, input)
      const field = runs.find(r => r.field !== 'fixed')?.field ?? 'fixed'
      if (!b.lines) line(runs, b, b.feats ?? [], b.width, b.label, field)
      else {
        const lines = wrapRuns(font, runs, b.size, b.width, b.track)
        if (lines.length > b.lines) issues.push({ field, text: `${b.label} — не больше ${b.lines} строк` })
        lines.forEach((l, i) => line(l, { ...b, baseline: b.baseline + i * (b.leading ?? b.size) }, b.feats ?? [], b.width, b.label, field))
      }
      for (const f of fieldsOf(b.text)) checks.push([f, b.label])
    } else {
      const rows = b.rows.flatMap(row => {
        const runs = runsOf(row.text, input)
        const field = [...runs].reverse().find(r => r.field !== 'fixed')?.field ?? 'fixed'
        if (!row.lines || row.lines === 1) return [{ runs, row, field }]
        const lines = wrapRuns(font, runs, b.size, b.width, b.track)
        if (lines.length > row.lines) issues.push({ field, text: `${row.label} — не больше ${row.lines} строк` })
        return lines.map(l => ({ runs: l, row, field }))
      })
      rows.forEach(({ runs, row, field }, i) => {
        const baseline = b.bottom !== undefined ? b.bottom - (rows.length - 1 - i) * b.leading : b.top! + i * b.leading
        const set = placeRuns(font, runs, b.x, baseline, b.size, [], b.track ?? 0)
        if (set.ink.x2 - b.x > b.width + 0.01 && (!row.lines || row.lines === 1)) issues.push({ field, text: `${row.label} шире ${Math.round(b.width)} мм` })
        parts.push(...set.parts)
      })
      for (const row of b.rows) for (const f of fieldsOf(row.text)) checks.push([f, row.label])
    }
  }
  for (const [field, label] of checks) check(field, label, input[field] ?? '')

  return {
    logo: signLogo(variant),
    parts: parts.filter(p => p.cmds.length),
    issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text) === i),
  }
}
