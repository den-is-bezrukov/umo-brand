import type { Font } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import { missingChars, oneLine, setLine, tidy, wrap as wrapLines, type Fonts } from '@/ui/type'
import { noteLine } from '@/ui/liveText'
import { logo } from '@/card/card'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { WORDS } from '@brand/words'
import { PRICE_TAG as L } from '@brand/price-tag'
import { METRICS } from 'virtual:font-metrics'

// A price tag for the small goods at a point, laid out as the brand's `@brand/price-tag` says (`BrandPriceTag`): a black
// band across the top with the brand's logo, a hairline and the point's name in white, then on white the goods' name
// from the top, its code under it, and at the bottom the price's caption and the price. The layout is fixed, as in
// Figma: a longer name takes more lines down to the code, never moving it. Figma's frame is 10 px a millimetre. Text
// boxes there are «leading-none» (the line as tall as the type, the font's ascent and descent centred on it, so the
// baseline is `DROP` of the size under the box's top), but the point's, trimmed to the capitals.

/**
 * `@brand/price-tag`: the tag's layout, mm, from Figma, whose frame is 10 px a millimetre. `side` is the padding, `band` the
 * band's height; `logo` the logo's width and the hairline after it (`x` where it stands, `w` its thickness, `h` its
 * height), the point's name `gap` after it in `point.size`; below the band, `name` (its top, `size`, at most `lines`
 * lines), then `code` and `caption` (tops, in `small`, tracked `tracking` em) and the `price` (top, `size`)
 */
export interface BrandPriceTag {
  size: { w: number; h: number }
  side: number
  band: number
  logo: { w: number }
  rule: { x: number; w: number; h: number }
  point: { gap: number; size: number }
  name: { top: number; size: number; lines: number }
  small: number
  tracking: number
  code: number
  caption: number
  price: { top: number; size: number }
}

/** The tag, mm */
export const TAG = L.size

export const SIDE = L.side
export const CAP = METRICS.cap
/** From a «leading-none» box's top to its baseline, in sizes: (1 − (ascent + descent)) / 2 + ascent */
export const DROP = (1 - (METRICS.ascent + METRICS.descent)) / 2 + METRICS.ascent

/** The black band */
export const BAND = L.band
/**
 * The logo, its hairline and the point's name: the logo `side` in and, as Figma, before the hairline; the name `gap` after
 * it and free to run to the tag's right edge, with no padding there, so the longest points the brand lists fit, the type
 * staying as in Figma
 */
const LOGO_W = L.logo.w
const RULE_X = L.rule.x
const RULE_W = L.rule.w
const RULE_H = L.rule.h
const POINT_X = RULE_X + L.point.gap
export const POINT = { x: POINT_X, size: L.point.size, width: TAG.w - POINT_X }

/** The goods' name, Medium on lines as tall as its size, from the body's padding down to the code */
export const NAME = { top: BAND + L.name.top, size: L.name.size, width: TAG.w - 2 * SIDE, lines: L.name.lines }
/** Regular with tracking: the code, the caption */
export const SMALL = L.small
export const TRACK = L.tracking * SMALL
export const CODE_TOP = BAND + L.code
export const CAPTION_TOP = BAND + L.caption
/** The price, Medium, its box standing on the body's bottom padding; lining tabular figures */
export const PRICE = { top: BAND + L.price.top, size: L.price.size }

export const DEFAULT_CAPTION = 'Цена за штуку с НДС'

export interface Item { name: string; code: string; caption: string; price: string }

export type TagField = 'point' | 'name' | 'code' | 'caption' | 'price'

export interface Issue { field: TagField; text: string }

export interface Tag {
  /** By field: the point's white on the band, the rest black on white */
  fields: Partial<Record<TagField, Cmd[]>>
  issues: Issue[]
}

/** The band's art the same for every tag: the logo and the hairline after it */
export const BAND_ART: Cmd[] = [
  ...logo(SIDE, SIDE, LOGO_W),
  ['M', RULE_X - RULE_W / 2, SIDE], ['L', RULE_X + RULE_W / 2, SIDE], ['L', RULE_X + RULE_W / 2, SIDE + RULE_H], ['L', RULE_X - RULE_W / 2, SIDE + RULE_H], ['Z'],
]

/**
 * The price field as it's typed: the roubles set in threes (up to seven digits: 9 999 999,99 at most), then the kopecks after a comma (a typed
 * dot becomes one), two digits at most: «1290.5» → «1 290,5»
 */
export function formatPrice(raw: string): string {
  const t = raw.replace(/[^\d.,]/g, '').replace(/\./g, ',')
  const [int, ...rest] = t.split(',')
  const roubles = int.slice(0, 7).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
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
/** The largest price, in kopecks: 9 999 999,99 */
export const MAX_KOPECKS = 999_999_999

/**
 * A price however it came from a table: a number cell (30000, 1290.5) or text («30 000 ₽», «1 290,50 руб.»), rounded to
 * kopecks, which are left out when there are none; null if it isn't one or is over 9 999 999,99 (left as it is, to be
 * said wrong)
 */
export function readPrice(raw: string): string | null {
  const t = raw.replace(/[\s ]/g, '').replace(/(₽|руб\.?|р\.?)$/i, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const kopecks = Math.round(Number(t) * 100)
  if (kopecks > MAX_KOPECKS) return null
  return priceText(formatPrice(`${Math.floor(kopecks / 100)},${String(kopecks % 100).padStart(2, '0')}`))
}

/**
 * A word wider than the line, in pieces that fit: broken after its last hyphen or slash that fits («YNDX-00053/» |
 * «графитовый»), else between letters, as goods' names carry codes and models with no spaces
 */
function splitWord(font: Font, word: string, size: number, width: number): string[] {
  const pieces: string[] = []
  let rest = word
  while (setLine(font, rest, 0, 0, size).right > width) {
    let fit = 1
    while (fit < rest.length && setLine(font, rest.slice(0, fit + 1), 0, 0, size).right <= width) fit++
    const soft = Math.max(rest.lastIndexOf('-', fit - 1), rest.lastIndexOf('/', fit - 1))
    const at = soft > 0 ? soft + 1 : fit
    pieces.push(rest.slice(0, at))
    rest = rest.slice(at)
  }
  return [...pieces, rest]
}

/** Lines within `width`, breaking where typed, between words and inside a word too long for a line */
const wrap = (font: Font, text: string, size: number, width: number) =>
  wrapLines(tidy(text), l => setLine(font, l, 0, 0, size).right <= width, w => splitWord(font, w, size, width)).map(l => l.replace(/\u00a0/g, ' '))

/**
 * One tag. The texts come as shown: the page puts placeholders in empty fields, the same layout then holding them in
 * grey. `price` is the digits as typed or formatted
 */
export function buildTag(fonts: Fonts, point: string, item: Item): Tag {
  const fields: Partial<Record<TagField, Cmd[]>> = {}
  const issues: Issue[] = []

  const check = (field: TagField, label: string, text: string, font: Font) => {
    const absent = missingChars(font, text)
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /** A one-line field, checked against its width */
  const line = (field: TagField, label: string, text: string, font: Font, x: number, baseline: number, size: number, width: number, feats: string[] = [], track = 0) => {
    const t = oneLine(text)
    const l = setLine(font, t, x, baseline, size, feats, track)
    // Noted for the editable template; the point's name stands white on the band
    noteLine(font, size, baseline, t, l.pens, field === 'point')
    if (l.right > width + 0.01) issues.push({ field, text: `${label} шире ${width} мм` })
    check(field, label, t, font)
    return l.cmds
  }

  fields.point = line('point', `Название ${WORDS.point.of}`, point, fonts.medium, POINT.x, SIDE + CAP * POINT.size, POINT.size, POINT.width, ['case'])

  const name = wrap(fonts.medium, item.name, NAME.size, NAME.width)
  fields.name = name.flatMap((t, i) => {
    const l = setLine(fonts.medium, t, SIDE, NAME.top + DROP * NAME.size + i * NAME.size, NAME.size)
    noteLine(fonts.medium, NAME.size, NAME.top + DROP * NAME.size + i * NAME.size, t, l.pens)
    if (l.right > NAME.width + 0.01) issues.push({ field: 'name', text: `Наименование шире ${NAME.width} мм` })
    return l.cmds
  })
  if (name.length > NAME.lines) issues.push({ field: 'name', text: `Наименование — не больше ${NAME.lines} строк` })
  check('name', 'Наименование', item.name, fonts.medium)

  if (item.code.trim()) fields.code = line('code', 'Артикул', item.code, fonts.regular, SIDE, CODE_TOP + DROP * SMALL, SMALL, NAME.width, [], TRACK)
  fields.caption = line('caption', 'Подпись', item.caption, fonts.regular, SIDE, CAPTION_TOP + DROP * SMALL, SMALL, NAME.width, [], TRACK)
  fields.price = line('price', 'Цена', `${priceText(oneLine(item.price))} ₽`, fonts.medium, SIDE, PRICE.top + DROP * PRICE.size, PRICE.size, NAME.width, ['lnum', 'tnum'])

  return { fields, issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text && o.field === v.field) === i) }
}
