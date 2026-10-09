import type { Font, Glyph } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import { caseMap, pathCmds } from '@/plate/frame'
import { featureMap } from '@/pricetag/tag'
import { logo } from '@/card/card'
import { hasProfanity, PROFANITY } from '@/ui/profanity'

// The dealership's hours sign (Figma: UMO | Evrone, node 3819:4211; the source in Yandex Disk `02 UMO/Hours Sign`,
// UMO_hours-sign.pdf): a 480×680 mm plate, the UMO logo at the top, the hours large in the middle with a line under
// them, and the dealership at the bottom: its marketing name («UMO АГАТ Владимир»), address, phone and site. Figma's frame is 2400×3400, 5 px a
// millimetre; the margins and the column are sevenths of the width, the logo as wide as the column. All in CoFo Sans
// Medium. Figma's text boxes are «leading-none», so a baseline is 0.844 of the size under a box's top.

/** The key of the fields as typed in the PDF's info (`writePdfData`) */
export const SIGN_KEY = 'UMOHoursSign'

/** The sign, mm */
export const SIGN = { w: 480, h: 680 }

const MARGIN = SIGN.w / 7
const COLUMN = SIGN.w - 2 * MARGIN
const DROP = 0.844

/** The logo across the column, from the top margin */
export const LOGO = logo(MARGIN, MARGIN, COLUMN)

/** The hours, centred: 292.571 px with −0.85% tracking, lining tabular figures and the case forms (the dash raised) */
const TIME = { size: 292.571 / 5, track: -0.0085, baseline: 1428.571 / 5 + DROP * 292.571 / 5 }
/** The line under them: 155.429 px, −0.8% */
const LINE = { size: 155.429 / 5, track: -0.008, baseline: 1816 / 5 + DROP * 155.429 / 5 }
/** The dealership: 45.714 px on 1.5 lines, the block standing on its last line (its box's bottom at 3104.571 px) */
const INFO = { size: 45.714 / 5, leading: 1.5 * 45.714 / 5 }
const INFO_LAST = 3104.571 / 5 - INFO.leading + (INFO.leading - INFO.size) / 2 + DROP * INFO.size
/** The address takes two lines at most, as umo.auto's longest run to twice the column */
const ADDRESS_LINES = 2

/** The dealer's marketing name as umo.auto has it, «UMO АГАТ Владимир» (it was «Официальный дилер …», as in Figma) */
export const DEALER_PREFIX = 'UMO '
export const ADDRESS_PREFIX = 'Адрес: '
export const PHONE_PREFIX = 'Телефон: '

export type SignField = 'from' | 'to' | 'line' | 'dealer' | 'address' | 'phone' | 'site'

export interface Input { from: string; to: string; line: string; dealer: string; address: string; phone: string; site: string }

export interface Issue { field: SignField; text: string }

export interface Sign {
  /** The outlines by field; `fixed` is what never changes colour (the words before a value, the dash between the hours) */
  parts: { field: SignField | 'fixed'; cmds: Cmd[] }[]
  issues: Issue[]
}

/** Every kind of space becomes a plain one, zero-width marks and line breaks go */
export const oneLine = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()

/** A time as typed («9», «900», «09.00», «21:00»), as the sign sets it, «9:00»; null if it isn't one */
export function timeText(raw: string): string | null {
  const m = oneLine(raw).match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/)
  if (!m) return null
  const h = +m[1]
  const min = m[2] ?? '00'
  if (h > 24 || +min > 59 || (h === 24 && min !== '00')) return null
  return `${h}:${min}`
}

interface Run { field: SignField | 'fixed'; text: string }

/**
 * Runs of text set one after another from `x` on `baseline`, the features asked for, kerning (across runs too) and
 * tracking: the outlines per run and the line's advance width
 */
function setRuns(font: Font, runs: Run[], x: number, baseline: number, size: number, feats: string[] = [], track = 0) {
  const scale = size / font.unitsPerEm
  const maps = feats.map(f => f === 'case' ? caseMap(font) : featureMap(font, f))
  const glyphs: { g: Glyph; run: number }[] = runs.flatMap((r, run) =>
    font.stringToGlyphs(r.text).map(g => ({ g: font.glyphs.get(maps.reduce((i, m) => m.get(i) ?? i, g.index)), run })))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands: any[][] = runs.map(() => [])
  const ink = { x1: Infinity, x2: -Infinity }
  let pen = x
  glyphs.forEach(({ g, run }, i) => {
    const p = g.getPath(pen, baseline, size)
    commands[run].push(...p.commands)
    if (p.commands.length) {
      const b = p.getBoundingBox()
      ink.x1 = Math.min(ink.x1, b.x1)
      ink.x2 = Math.max(ink.x2, b.x2)
    }
    pen += g.advanceWidth! * scale
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1].g) * scale + track * size
  })
  return { parts: runs.map((r, i) => ({ field: r.field, cmds: pathCmds(commands[i]) })), width: pen - x, ink }
}

const width = (font: Font, text: string, size: number) => setRuns(font, [{ field: 'fixed', text }], 0, 0, size).ink.x2

/** How far from the most balanced break a break after a comma may make the longer line, in mm */
const COMMA_SLACK = 0.15 * COLUMN

/**
 * Two lines broken where a typesetter would: after the comma that leaves them nearest in length, as an address
 * breaks between its parts («…, вл5с3, | торгово-промышленная зона Алтуфьево, посёлок Вешки»), unless every comma
 * leaves the longer line much longer than it need be; then wherever the lines come nearest, `text-wrap: balance` as
 * CSS has it. Never right after the first word, the prefix «Адрес:»
 */
function balanced(font: Font, words: string[], size: number): string[] | undefined {
  let best: { k: number; long: number } | undefined
  let comma: { k: number; long: number } | undefined
  for (let k = 2; k < words.length; k++) {
    const long = Math.max(width(font, words.slice(0, k).join(' '), size), width(font, words.slice(k).join(' '), size))
    if (long > COLUMN) continue
    if (!best || long < best.long) best = { k, long }
    if (words[k - 1].endsWith(',') && (!comma || long < comma.long)) comma = { k, long }
  }
  const at = comma && best && comma.long <= best.long + COMMA_SLACK ? comma : best
  return at && [words.slice(0, at.k).join(' '), words.slice(at.k).join(' ')]
}

/** A text after its fixed words, in lines within the column, breaking between words: the runs of each line */
function wrapRuns(font: Font, prefix: string, field: SignField, text: string, size: number): Run[][] {
  const lines: string[] = []
  let line = ''
  for (const w of `${prefix}${text}`.split(' ')) {
    const candidate = line ? `${line} ${w}` : w
    if (!line || width(font, candidate, size) <= COLUMN) line = candidate
    else { lines.push(line); line = w }
  }
  lines.push(line)
  const two = lines.length === 2 && balanced(font, `${prefix}${text}`.split(' '), size)
  if (two) lines.splice(0, 2, ...two)
  // The prefix stays fixed wherever the line breaks
  let at = 0
  return lines.map(l => {
    const start = at
    at += l.length + 1
    const fixed = Math.max(0, Math.min(l.length, prefix.length - start))
    return [{ field: 'fixed' as const, text: l.slice(0, fixed) }, { field, text: l.slice(fixed) }].filter(r => r.text)
  })
}

/** The address's lines as the sign breaks them, after «Адрес: » */
export const addressLines = (font: Font, address: string) =>
  wrapRuns(font, ADDRESS_PREFIX, 'address', oneLine(address), INFO.size).map(l => l.map(r => r.text).join(''))

/**
 * The sign. The texts come as shown: the page puts placeholders in empty fields, the same layout then holding them in
 * grey. An empty `line` is left out
 */
export function buildSign(font: Font, input: Input): Sign {
  const parts: Sign['parts'] = []
  const issues: Issue[] = []
  const check = (field: SignField, label: string, text: string) => {
    const absent = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /** One centred line, its type scaled to `fit` mm of ink when given, else checked against the column */
  const centred = (runs: Run[], spec: { size: number; track: number; baseline: number }, feats: string[], fit: number | undefined, label: string, field: SignField) => {
    const probe = setRuns(font, runs, 0, 0, spec.size, feats, spec.track)
    const full = probe.ink.x2 - probe.ink.x1
    const size = fit && full > 0 ? spec.size * fit / full : spec.size
    if (!fit && full > COLUMN + 0.01) issues.push({ field, text: `${label} шире ${Math.round(COLUMN)} мм` })
    const k = size / spec.size
    // Centred by the ink, as the source's line sits
    const x = (SIGN.w - full * k) / 2 - probe.ink.x1 * k
    parts.push(...setRuns(font, runs, x, spec.baseline, size, feats, spec.track).parts)
  }

  // The hours: always as wide as Figma's «9:00—21:00» at its size, so that one stands exactly as there, a longer range
  // («10:00—22:00», which would run out of the column) smaller and a shorter one («9:30—7:30») larger, on the same baseline
  const from = timeText(input.from) ?? oneLine(input.from)
  const to = timeText(input.to) ?? oneLine(input.to)
  if (!timeText(input.from)) issues.push({ field: 'from', text: 'Открытие: проверьте время' })
  if (!timeText(input.to)) issues.push({ field: 'to', text: 'Закрытие: проверьте время' })
  const timeRuns = (a: string, b: string): Run[] => [{ field: 'from', text: a }, { field: 'fixed', text: '—' }, { field: 'to', text: b }]
  const feats = ['case', 'lnum', 'tnum']
  const ref = setRuns(font, timeRuns('9:00', '21:00'), 0, 0, TIME.size, feats, TIME.track).ink
  centred(timeRuns(from, to), TIME, feats, ref.x2 - ref.x1, 'Время', 'from')

  const line = oneLine(input.line)
  if (line) {
    centred([{ field: 'line', text: line }], LINE, ['case'], undefined, 'Подпись', 'line')
    check('line', 'Подпись', line)
  }

  // The dealership, from the bottom up: site, phone, address (up to two lines), name
  const dealer = oneLine(input.dealer)
  const rows: Run[][] = [
    [{ field: 'fixed', text: DEALER_PREFIX }, { field: 'dealer', text: dealer }],
    ...wrapRuns(font, ADDRESS_PREFIX, 'address', oneLine(input.address), INFO.size),
    [{ field: 'fixed', text: PHONE_PREFIX }, { field: 'phone', text: oneLine(input.phone) }],
    [{ field: 'site', text: oneLine(input.site) }],
  ]
  const addressLines = rows.length - 3
  if (addressLines > ADDRESS_LINES) issues.push({ field: 'address', text: `Адрес — не больше ${ADDRESS_LINES} строк` })
  rows.forEach((runs, i) => {
    const set = setRuns(font, runs, MARGIN, INFO_LAST - (rows.length - 1 - i) * INFO.leading, INFO.size)
    const field = runs[runs.length - 1].field as SignField
    if (set.ink.x2 - MARGIN > COLUMN + 0.01 && field !== 'address') {
      issues.push({ field, text: `${field === 'dealer' ? 'Название дилера' : field === 'phone' ? 'Телефон' : 'Сайт'} шире ${Math.round(COLUMN)} мм` })
    }
    parts.push(...set.parts)
  })
  check('dealer', 'Название дилера', dealer)
  check('address', 'Адрес', input.address)
  check('site', 'Сайт', input.site)

  return {
    parts: parts.filter(p => p.cmds.length),
    issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text) === i),
  }
}
