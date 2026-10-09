import type { Font, Glyph } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import { caseMap, pathCmds } from '@/plate/frame'
import { logo } from '@/card/card'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import type { Fonts } from '@/nametag/tag'

// A price tag for the small goods at a dealership (Figma: UMO | Evrone, node 4202:4368; the Word template in Yandex Disk
// `02 UMO/Price Tag`): 90×60 mm, a black band 12 mm tall across the top with the UMO logo 15×3 mm, a hairline and the
// dealer's name in white, then on white the goods' name from the top, its code under it, and at the bottom the price's
// caption and the price. The layout is fixed, as in Figma: a longer name takes more lines down to the code, never
// moving it. Figma's frame is 900×600, 10 px a millimetre. Text boxes there are «leading-none» (the line as tall as the
// type, the font's 974 + 286 units centred on it, so the baseline is 0.844 of the size under the box's top), but the
// dealer's, trimmed to the capitals.

/** The tag, mm */
export const TAG = { w: 90, h: 60 }

const SIDE = 4.5
const CAP = 0.68
/** From a «leading-none» box's top to its baseline, in sizes: (1 − (974 + 286) / 1000) / 2 + 0.974 */
const DROP = 0.844

/** The black band */
export const BAND = 12
/**
 * The logo, its hairline and the dealer's name: the logo 4.5 mm in and 3 mm (30 px) before the hairline, as Figma; the
 * name 2.625 mm after it (Figma has 3; 2.25 was a touch close) and free to run to the tag's right edge, with no padding there, so the longest
 * dealers on umo.auto («АВТОПОЛЕ Санкт-Петербург», 61.1 mm) fit, the type staying as in Figma
 */
const LOGO_W = 15
const RULE_X = 22.5
const RULE_W = 0.15
const DEALER_X = RULE_X + 2.625
const DEALER = { x: DEALER_X, size: 4.4, width: TAG.w - DEALER_X }

/** The goods' name, Medium 45 px on 45 px lines, from the body's 4 mm padding down to the code */
const NAME = { top: BAND + 4, size: 4.5, width: TAG.w - 2 * SIDE, lines: 4 }
/** Regular 30 px with 1% tracking: the code, the caption */
const SMALL = 3
const TRACK = 0.01 * SMALL
const CODE_TOP = BAND + 4 + 22
const CAPTION_TOP = BAND + 30.5
/** The price, Medium 90 px, its box standing on the body's bottom padding; lining tabular figures */
const PRICE = { top: BAND + 35, size: 9 }

export const DEFAULT_CAPTION = 'Цена за штуку с НДС'

export interface Item { name: string; code: string; caption: string; price: string }

export type TagField = 'dealer' | 'name' | 'code' | 'caption' | 'price'

export interface Issue { field: TagField; text: string }

export interface Tag {
  /** By field: the dealer's white on the band, the rest black on white */
  fields: Partial<Record<TagField, Cmd[]>>
  issues: Issue[]
}

/** The band's art the same for every tag: the logo and the hairline after it */
export const BAND_ART: Cmd[] = [
  ...logo(SIDE, SIDE, LOGO_W),
  ['M', RULE_X - RULE_W / 2, SIDE], ['L', RULE_X + RULE_W / 2, SIDE], ['L', RULE_X + RULE_W / 2, SIDE + 3], ['L', RULE_X - RULE_W / 2, SIDE + 3], ['Z'],
]

/** Every kind of space becomes a plain one, zero-width marks go; line breaks are kept */
const tidy = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
const oneLine = (t: string) => tidy(t).join(' ')

/**
 * The price field as it's typed: the roubles set in threes (up to nine digits), then the kopecks after a comma (a typed
 * dot becomes one), two digits at most: «1290.5» → «1 290,5»
 */
export function formatPrice(raw: string): string {
  const t = raw.replace(/[^\d.,]/g, '').replace(/\./g, ',')
  const [int, ...rest] = t.split(',')
  const roubles = int.slice(0, 9).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return t.includes(',') ? `${roubles || '0'},${rest.join('').slice(0, 2)}` : roubles
}

/** A price typed or loaded, as the tag sets it: kopecks as two digits, left out when there are none («1 290,00» → «1 290») */
export function priceText(price: string): string {
  const [roubles, kopecks = ''] = price.trim().split(',')
  const k = kopecks.padEnd(2, '0').slice(0, 2)
  return /^0*$/.test(kopecks) ? roubles : `${roubles},${k}`
}

/** A price as the field holds it: roubles in threes, kopecks after a comma */
export const PRICE_FORMAT = /^\d{1,3}( \d{3})*(,\d{0,2})?$/

/**
 * A price however it came from a table: a number cell (30000, 1290.5) or text («30 000 ₽», «1 290,50 руб.»), rounded to
 * kopecks, which are left out when there are none; null if it isn't one
 */
export function readPrice(raw: string): string | null {
  const t = raw.replace(/[\s ]/g, '').replace(/(₽|руб\.?|р\.?)$/i, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const kopecks = Math.round(Number(t) * 100)
  return priceText(formatPrice(`${Math.floor(kopecks / 100)},${String(kopecks % 100).padStart(2, '0')}`))
}

/** Single substitutions of a feature (`lnum`, `tnum`), glyph by glyph, as opentype.js doesn't apply them */
const features = new WeakMap<Font, Map<string, Map<number, number>>>()
function featureMap(font: Font, tag: string): Map<number, number> {
  let byTag = features.get(font)
  if (!byTag) features.set(font, byTag = new Map())
  let map = byTag.get(tag)
  if (!map) {
    map = new Map()
    const single = (font.substitution as unknown as { getSingle(f: string, s: string, l: string): { sub: number; by: number }[] }).getSingle
    for (const script of ['DFLT', 'cyrl', 'latn']) {
      for (const { sub, by } of single.call(font.substitution, tag, script, 'dflt')) map.set(sub, by)
    }
    byTag.set(tag, map)
  }
  return map
}

/** One line from `x` on `baseline`: the features asked for, kerning, tracking */
function setLine(font: Font, text: string, x: number, baseline: number, size: number, feats: string[] = [], track = 0) {
  const scale = size / font.unitsPerEm
  const maps = feats.map(f => f === 'case' ? caseMap(font) : featureMap(font, f))
  const glyphs: Glyph[] = font.stringToGlyphs(text).map(g => font.glyphs.get(maps.reduce((i, m) => m.get(i) ?? i, g.index)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands: any[] = []
  let right = x
  let pen = x
  glyphs.forEach((g, i) => {
    const p = g.getPath(pen, baseline, size)
    commands.push(...p.commands)
    if (p.commands.length) right = Math.max(right, p.getBoundingBox().x2)
    pen += g.advanceWidth! * scale
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale + track
  })
  return { cmds: pathCmds(commands), width: right - x }
}

/** Words of one or two characters (prepositions) stick to the next word */
function bindShortWords(text: string): string {
  let prev
  do {
    prev = text
    text = text.replace(/(^|[\s ])([^\s ]{1,2}) +(?=\S)/g, '$1$2 ')
  } while (text !== prev)
  return text
}

/**
 * A word wider than the line, in pieces that fit: broken after its last hyphen or slash that fits («YNDX-00053/» |
 * «графитовый»), else between letters, as goods' names carry codes and models with no spaces
 */
function splitWord(font: Font, word: string, size: number, width: number): string[] {
  const pieces: string[] = []
  let rest = word
  while (setLine(font, rest, 0, 0, size).width > width) {
    let fit = 1
    while (fit < rest.length && setLine(font, rest.slice(0, fit + 1), 0, 0, size).width <= width) fit++
    const soft = Math.max(rest.lastIndexOf('-', fit - 1), rest.lastIndexOf('/', fit - 1))
    const at = soft > 0 ? soft + 1 : fit
    pieces.push(rest.slice(0, at))
    rest = rest.slice(at)
  }
  return [...pieces, rest]
}

/** Lines within `width`, breaking where typed, between words and inside a word too long for a line */
function wrap(font: Font, text: string, size: number, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of tidy(text)) {
    let line = ''
    for (const w of bindShortWords(paragraph).split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${w}` : w
      if (setLine(font, candidate, 0, 0, size).width <= width) { line = candidate; continue }
      if (line) lines.push(line)
      const pieces = splitWord(font, w, size, width)
      lines.push(...pieces.slice(0, -1))
      line = pieces[pieces.length - 1]
    }
    if (line) lines.push(line)
  }
  return lines.map(l => l.replace(/ /g, ' '))
}

/**
 * One tag. The texts come as shown: the page puts placeholders in empty fields, the same layout then holding them in
 * grey. `price` is the digits as typed or formatted
 */
export function buildTag(fonts: Fonts, dealer: string, item: Item): Tag {
  const fields: Partial<Record<TagField, Cmd[]>> = {}
  const issues: Issue[] = []

  const check = (field: TagField, label: string, text: string, font: Font) => {
    const absent = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /** A one-line field, checked against its width */
  const line = (field: TagField, label: string, text: string, font: Font, x: number, baseline: number, size: number, width: number, feats: string[] = [], track = 0) => {
    const t = oneLine(text)
    const l = setLine(font, t, x, baseline, size, feats, track)
    if (l.width > width + 0.01) issues.push({ field, text: `${label} шире ${width} мм` })
    check(field, label, t, font)
    return l.cmds
  }

  fields.dealer = line('dealer', 'Название дилера', dealer, fonts.medium, DEALER.x, SIDE + CAP * DEALER.size, DEALER.size, DEALER.width, ['case'])

  const name = wrap(fonts.medium, item.name, NAME.size, NAME.width)
  fields.name = name.flatMap((t, i) => {
    const l = setLine(fonts.medium, t, SIDE, NAME.top + DROP * NAME.size + i * NAME.size, NAME.size)
    if (l.width > NAME.width + 0.01) issues.push({ field: 'name', text: `Наименование шире ${NAME.width} мм` })
    return l.cmds
  })
  if (name.length > NAME.lines) issues.push({ field: 'name', text: `Наименование — не больше ${NAME.lines} строк` })
  check('name', 'Наименование', item.name, fonts.medium)

  if (item.code.trim()) fields.code = line('code', 'Артикул', item.code, fonts.regular, SIDE, CODE_TOP + DROP * SMALL, SMALL, NAME.width, [], TRACK)
  fields.caption = line('caption', 'Подпись', item.caption, fonts.regular, SIDE, CAPTION_TOP + DROP * SMALL, SMALL, NAME.width, [], TRACK)
  fields.price = line('price', 'Цена', `${priceText(oneLine(item.price))} ₽`, fonts.medium, SIDE, PRICE.top + DROP * PRICE.size, PRICE.size, NAME.width, ['lnum', 'tnum'])

  return { fields, issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text && o.field === v.field) === i) }
}
