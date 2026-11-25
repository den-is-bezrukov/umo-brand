import { parse, type Font } from 'opentype.js'
import { shapeSafely } from '@/ui/type'
import { qrOutline, type Cmd } from '@/livery/geometry'
import { missingChars, setRuns, tidy, wrap, type Fonts } from '@/ui/type'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { typografText } from '@/guide/typograf'
import { PRICE_CARD } from '@brand/price-card'
import { WORDS } from '@brand/words'
import { METRICS } from 'virtual:font-metrics'

// The price card, an A3 poster laid out as the brand's `@brand/price-card` says (`PriceCardLayout`, in Figma's px, y
// down): the car's photo across the top with the wordmark and «от … ₽» on it in white; under it the headline, the trim's
// name and its list, and at the bottom, standing on the margin, the fine print with the prices and the QR over it, so a
// longer text lifts them. All in the brand font's Medium but the fine print (Regular) and a headline's run in a font of
// its own. Figma's text boxes put a baseline (lh − (ascent + descent) em) / 2 + ascent em under a line's top, the brand font's (`METRICS`).

const L = PRICE_CARD.layout

export const CARD = L.size
const SIDE = L.side
const COLUMN = CARD.w - 2 * SIDE
const BOTTOM = CARD.h - L.bottom
/** With no fine print the prices stand on a margin as wide as the sides */
const BOTTOM_BARE = CARD.h - SIDE

/** A product's id (`@brand/products`) and a variant's, its trim (`PRICE_CARD.trims`) */
export type Product = string
export type Trim = string

/** A run of a fixed line, as in a Figma text layer: its own font (a file under the brand's `public/`) and colour if set */
export interface Run { text: string; font?: string; color?: string }

/** A trim's photo across the band */
export interface Photo {
  /** The full JPEG, for the PDF */
  print: string
  /** Its screen copy */
  preview: string
  /** The photo's box: Figma fills it with the photo, cut to the band */
  box: { x: number; y: number; w: number; h: number }
  /** The photo's pixels, for filling the box */
  px: { w: number; h: number }
}

export interface TrimData {
  id: string
  name: string
  photo: Photo
  /** «от … ₽» on the photo, the trim bare */
  from: string
  /** The full cost as it comes; the point may raise it, never lower */
  full: string
  /** The credit's monthly payment, beside the price; none without a credit offer */
  monthly?: string
  list: string[]
  /** The fine print as it comes; the point edits it */
  legal: string
}

/**
 * The card's layout, Figma px (7.07 px a millimetre on A3): `size` the sheet, `side` the margin each side, `bottom` the
 * margin under the fine print, `band` the photo's height; `from` the «от … ₽» on the photo (the top of its line box, `lineHeight`);
 * `headline` the first line's top and the size of every one; `body` the size of the trim's name and its list, `label`
 * of the price's label, `price` of the prices, `legal` of the fine print; `listIndent` and `bullet` where the list's
 * text and its bullets stand from the side; `afterHeadline`, `afterTrim` and `itemGap` the gaps over the trim's name, the
 * list and between its items; `minGap` the least between the list and the prices, `legalGap` between the prices and the fine print,
 * `row` the height of the prices' row and the QR (`qr` its side), `priceTop` the price under its label, `monthlyGap` the
 * space between the full cost and the monthly payment
 */
export interface PriceCardLayout {
  size: { w: number; h: number }
  side: number
  bottom: number
  band: number
  from: { top: number; lineHeight: number }
  headline: { top: number; size: number }
  body: number
  label: number
  price: number
  legal: number
  listIndent: number
  bullet: number
  afterHeadline: number
  afterTrim: number
  itemGap: number
  minGap: number
  legalGap: number
  row: number
  qr: number
  priceTop: number
  monthlyGap: number
}

/**
 * What the brand gives the price card (`@brand/price-card`): its `layout`, the words on the card, per product its
 * headline in lines of runs, its wordmark with the product's number (absolute path data, 525×75 from the band's
 * corner) and its trims, the first the default
 */
export interface BrandPriceCard {
  layout: PriceCardLayout
  /** «от » before the price on the photo, the label over the full cost, the label over the monthly payment */
  texts: { from: string; full: string; monthly: string }
  headlines: Record<Product, Run[][]>
  lettering: Record<Product, string>
  trims: Record<Product, TrimData[]>
}

/** A model's trims, the first its default */
export const TRIMS = PRICE_CARD.trims

export const trimOf = (model: Product, trim: Trim) => TRIMS[model].find(t => t.id === trim)!

/** Absolute M/L/H/V/C/Z path data to commands, moved by (dx, dy) */
function fromD(d: string, dx: number, dy: number): Cmd[] {
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const [, op, args] of d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []
    if (op === 'Z') { cmds.push(['Z']); continue }
    if (op === 'C') { cmds.push(['C', dx + n[0], dy + n[1], dx + n[2], dy + n[3], dx + n[4], dy + n[5]]); [cx, cy] = [n[4], n[5]]; continue }
    if (op === 'H') cx = n[0]
    else if (op === 'V') cy = n[0]
    else [cx, cy] = [n[0], n[1]]
    cmds.push([op === 'M' ? 'M' : 'L', dx + cx, dy + cy])
  }
  return cmds
}

/** The fonts the headlines' runs set of their own, by file */
let runFontsPromise: Promise<Record<string, Font>> | undefined
export const loadRunFonts = () => runFontsPromise ??= Promise.all(
  [...new Set(Object.values(PRICE_CARD.headlines).flat(2).flatMap(r => r.font ? [r.font] : []))].map(file =>
    fetch(`${import.meta.env.BASE_URL}${file}`).then(r => r.arrayBuffer()).then(buf => [file, shapeSafely(parse(buf))] as const)),
).then(Object.fromEntries)

export interface CardFonts extends Fonts { runs: Record<string, Font> }

/** What the card is drawn in */
/** What the card is drawn in: a colour */
export type Ink = string
const BLACK = '#000000'
const WHITE = '#ffffff'
const GREY = '#808080'

export interface Art {
  photo: Photo
  /** Outlines by ink, each filled even-odd, in the order drawn */
  parts: Record<Ink, Cmd[]>
  issues: string[]
}

/** `full`: the full cost the point asks, the trim's price and added equipment; empty, a grey placeholder */
export interface Input { model: Product; trim: Trim; full: string; legal: string; url: string }

/** A baseline under a line's top, as Figma sets a line `lh` tall */
const baseline = (top: number, size: number, lh = size) => top + (lh - (METRICS.ascent + METRICS.descent) * size) / 2 + METRICS.ascent * size

const HEADLINE = L.headline.size
const BODY = L.body
const LABEL = L.label
const PRICE = L.price
const LEGAL = L.legal
/** The list's text `listIndent` px in from the column, its bullets hung before it */
const LIST_X = SIDE + L.listIndent
const BULLET_X = SIDE + L.bullet
/** The fine print may lift the prices this close to the list, no closer */
const MIN_GAP = L.minGap

const NUMS = ['lnum', 'tnum']

export function buildCard(fonts: CardFonts, input: Input): Art {
  const trim = trimOf(input.model, input.trim)
  const parts: Record<Ink, Cmd[]> = { [BLACK]: [], [WHITE]: [], [GREY]: [] }
  const issues: string[] = []

  /** Runs one after another on a baseline, each in its font, ink and features; the pen after them */
  const runs = (list: { text: string; font?: Font; ink?: Ink; feats?: string[] }[], x: number, base: number, size: number) => {
    for (const r of list) {
      const set = setRuns(r.font ?? fonts.medium, [r.text], x, base, size, r.feats ?? [])
      const ink = r.ink ?? BLACK
      parts[ink] ??= []
      parts[ink].push(...set.parts[0])
      x = set.end
    }
    return x
  }
  const price = (value: string, x: number, base: number, size: number, ink: Ink = BLACK) =>
    runs([{ text: value, ink, feats: NUMS }, { text: ' ₽', ink }], x, base, size)

  // The band: the wordmark, «от … ₽» on the band's bottom padding
  parts[WHITE].push(...fromD(PRICE_CARD.lettering[input.model], SIDE, SIDE))
  const fromBase = baseline(L.from.top, BODY, L.from.lineHeight)
  price(trim.from, runs([{ text: PRICE_CARD.texts.from, ink: WHITE }], SIDE, fromBase, BODY), fromBase, BODY, WHITE)

  // The headline, Figma's lines
  let top = L.headline.top
  for (const line of PRICE_CARD.headlines[input.model]) {
    const end = runs(line.map(r => ({ text: r.text, font: r.font ? fonts.runs[r.font] : undefined, ink: r.color })), SIDE, baseline(top, HEADLINE), HEADLINE)
    if (end - SIDE > COLUMN + 0.5) issues.push('Заголовок не помещается')
    top += HEADLINE
  }

  // The trim and its list
  top += L.afterHeadline
  runs([{ text: `${WORDS.product.variant} ${trim.name}:` }], SIDE, baseline(top, BODY), BODY)
  top += BODY + L.afterTrim
  for (const item of trim.list) {
    const base = baseline(top, BODY)
    runs([{ text: '•' }], BULLET_X, base, BODY)
    runs([{ text: item }], LIST_X, base, BODY)
    top += BODY + L.itemGap
  }
  const listEnd = top - L.itemGap

  // From the bottom up: the fine print, the prices and the QR on one top
  const legalFits = (line: string) => setRuns(fonts.regular, [line], 0, 0, LEGAL).width <= COLUMN
  // Through the guide's typograph: short words, a sentence's first word and a paragraph's last held to the next;
  // numbers aren't broken between their digit groups, nor «ст.» from its number
  const legal = wrap(tidy(input.legal).map(p => typografText(p).replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0').replace(/\bст\. (?=\d)/g, 'ст.\u00a0')), legalFits)
  const legalTop = legal.length ? BOTTOM - legal.length * LEGAL : BOTTOM_BARE
  legal.forEach((line, i) => runs([{ text: line, font: fonts.regular, ink: GREY }], SIDE, baseline(legalTop + i * LEGAL, LEGAL), LEGAL))
  const row = legalTop - (legal.length ? L.legalGap : 0) - L.row
  if (row < listEnd + MIN_GAP) issues.push('Сноска слишком длинная')

  // «от …» in the band is the trim bare, this the car as it stands, with the point's equipment: the law asks for it whole
  runs([{ text: PRICE_CARD.texts.full }], SIDE, baseline(row, LABEL), LABEL)
  const after = price(input.full || '9 999 999', SIDE, baseline(row + L.priceTop, PRICE), PRICE, input.full ? BLACK : GREY)
  if (trim.monthly) {
    const x = after + L.monthlyGap
    runs([{ text: PRICE_CARD.texts.monthly }], x, baseline(row, LABEL), LABEL)
    price(trim.monthly, x, baseline(row + L.priceTop, PRICE), PRICE)
  }
  parts[BLACK].push(...qrOutline(input.url, CARD.w - SIDE - L.qr, row, L.qr))

  const absent = missingChars(fonts.regular, input.legal)
  if (absent.length) issues.push(`Сноска: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}`)
  if (hasProfanity(input.legal)) issues.push(`Сноска: ${PROFANITY.toLowerCase()}`)

  return { photo: trim.photo, parts, issues }
}

/** The photo's place when it fills its box, cut to the band as Figma's fill is */
export function photoRect({ box, px }: Pick<Art['photo'], 'box' | 'px'>) {
  const k = Math.max(box.w / px.w, box.h / px.h)
  const w = px.w * k
  const h = px.h * k
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/** The band the photo is cut to */
export const BAND = L.band
