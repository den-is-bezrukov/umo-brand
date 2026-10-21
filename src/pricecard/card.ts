import { parse, type Font } from 'opentype.js'
import { qrOutline, type Cmd } from '@/livery/geometry'
import { missingChars, setRuns, tidy, wrap, type Fonts } from '@/ui/type'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { typografText } from '@/guide/typograf'
import { ALICE } from '@brand/fonts'
import { PRICE_CARD } from '@brand/price-card'

// The price card, an A3 poster (Figma «Price Cards», 2100×2970 px, 7.07 px a millimetre; everything here in its px,
// y down): the car's photo across the top 720 px with the wordmark and «от … ₽» on it in white; under it a 150 px
// headline, the trim's name and its list, and at the bottom, standing on the 100 px margin, the fine print with the
// prices and the QR over it, so a longer text lifts them. All in CoFo Sans Medium but the fine print (Regular), Alice's
// mark in Alice Okniks. Figma's text boxes put a baseline (lh − 1.26 em) / 2 + 0.974 em under a line's top.

export const CARD = { w: 2100, h: 2970 }
const SIDE = 125
const COLUMN = CARD.w - 2 * SIDE
const BOTTOM = CARD.h - 100
/** With no fine print the prices stand on a margin as wide as the sides */
const BOTTOM_BARE = CARD.h - SIDE

/** A model's id (`@brand/models`) and a trim's (`PRICE_CARD.trims`) */
export type Model = string
export type Trim = string

/** A run of a fixed line: Alice's mark comes from Alice Okniks */
export interface Run { text: string; alice?: boolean }

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
  /** The full cost as it comes; the dealer may raise it, never lower */
  full: string
  /** The credit's monthly payment, beside the price; none without a credit offer */
  monthly?: string
  list: string[]
  /** The fine print as it comes; the dealer edits it */
  legal: string
}

/**
 * What the brand gives the price card (`@brand/price-card`): per model its headline in lines of runs, its wordmark with
 * the model's number (absolute path data, 525×75 from the band's corner) and its trims, the first the default
 */
export interface BrandPriceCard {
  headlines: Record<Model, Run[][]>
  lettering: Record<Model, string>
  trims: Record<Model, TrimData[]>
}

/** A model's trims, the first its default */
export const TRIMS = PRICE_CARD.trims

export const trimOf = (model: Model, trim: Trim) => TRIMS[model].find(t => t.id === trim)!

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

/** Alice Okniks (`@brand/fonts`, the site's): Alice's mark on @, a thin no-break space */
let alicePromise: Promise<Font> | undefined
export const loadAlice = () => alicePromise ??= fetch(`${import.meta.env.BASE_URL}${ALICE}`).then(r => r.arrayBuffer()).then(buf => parse(buf))

export interface CardFonts extends Fonts { alice: Font }

/** What the card is drawn in */
export type Ink = 'black' | 'white' | 'grey' | 'alice'
export const INKS: Record<Ink, string> = { black: '#000000', white: '#ffffff', grey: '#808080', alice: '#7a55ff' }

export interface Art {
  photo: Photo
  /** Outlines by ink, each filled even-odd */
  parts: Record<Ink, Cmd[]>
  issues: string[]
}

/** `full`: the full cost the dealer asks, the trim's price and added equipment; empty, a grey placeholder */
export interface Input { model: Model; trim: Trim; full: string; legal: string; url: string }

/** A baseline under a line's top, as Figma sets a line `lh` tall */
const baseline = (top: number, size: number, lh = size) => top + (lh - 1.26 * size) / 2 + 0.974 * size

const HEADLINE = 150
const BODY = 75
const LABEL = 50
const PRICE = 125
const LEGAL = 25
/** The list's text 75 px in from the column, its bullets hung before it */
const LIST_X = SIDE + 75
const BULLET_X = SIDE + 5.8
/** The fine print may lift the prices this close to the list, no closer */
const MIN_GAP = 75

const NUMS = ['lnum', 'tnum']

export function buildCard(fonts: CardFonts, input: Input): Art {
  const trim = trimOf(input.model, input.trim)
  const parts: Record<Ink, Cmd[]> = { black: [], white: [], grey: [], alice: [] }
  const issues: string[] = []

  /** Runs one after another on a baseline, each in its font, ink and features; the pen after them */
  const runs = (list: { text: string; font?: Font; ink?: Ink; feats?: string[] }[], x: number, base: number, size: number) => {
    for (const r of list) {
      const set = setRuns(r.font ?? fonts.medium, [r.text], x, base, size, r.feats ?? [])
      parts[r.ink ?? 'black'].push(...set.parts[0])
      x = set.end
    }
    return x
  }
  const price = (value: string, x: number, base: number, size: number, ink: Ink = 'black') =>
    runs([{ text: value, ink, feats: NUMS }, { text: ' ₽', ink }], x, base, size)

  // The band: the wordmark, «от … ₽» on the band's bottom padding
  parts.white.push(...fromD(PRICE_CARD.lettering[input.model], SIDE, SIDE))
  const fromBase = baseline(539, BODY, 56.25)
  price(trim.from, runs([{ text: 'от ', ink: 'white' }], SIDE, fromBase, BODY), fromBase, BODY, 'white')

  // The headline, Figma's lines
  let top = 820
  for (const line of PRICE_CARD.headlines[input.model]) {
    const end = runs(line.map(r => r.alice ? { text: r.text, font: fonts.alice, ink: 'alice' as Ink } : { text: r.text }), SIDE, baseline(top, HEADLINE), HEADLINE)
    if (end - SIDE > COLUMN + 0.5) issues.push('Заголовок не помещается')
    top += HEADLINE
  }

  // The trim and its list
  top += 100
  runs([{ text: `Комплектация ${trim.name}:` }], SIDE, baseline(top, BODY), BODY)
  top += BODY + 50
  for (const item of trim.list) {
    const base = baseline(top, BODY)
    runs([{ text: '•' }], BULLET_X, base, BODY)
    runs([{ text: item }], LIST_X, base, BODY)
    top += BODY + 25
  }
  const listEnd = top - 25

  // From the bottom up: the fine print, the prices and the QR on one top
  const legalFits = (line: string) => setRuns(fonts.regular, [line], 0, 0, LEGAL).width <= COLUMN
  // Through the guide's typograph: short words, a sentence's first word and a paragraph's last held to the next;
  // numbers aren't broken between their digit groups, nor «ст.» from its number
  const legal = wrap(tidy(input.legal).map(p => typografText(p).replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0').replace(/\bст\. (?=\d)/g, 'ст.\u00a0')), legalFits)
  const legalTop = legal.length ? BOTTOM - legal.length * LEGAL : BOTTOM_BARE
  legal.forEach((line, i) => runs([{ text: line, font: fonts.regular, ink: 'grey' }], SIDE, baseline(legalTop + i * LEGAL, LEGAL), LEGAL))
  const row = legalTop - (legal.length ? 75 : 0) - 200
  if (row < listEnd + MIN_GAP) issues.push('Сноска слишком длинная')

  // «от …» in the band is the trim bare, this the car as it stands, with the dealer's equipment: the law asks for it whole
  runs([{ text: 'Полная стоимость' }], SIDE, baseline(row, LABEL), LABEL)
  const after = price(input.full || '9 999 999', SIDE, baseline(row + 75, PRICE), PRICE, input.full ? 'black' : 'grey')
  if (trim.monthly) {
    const x = after + 125
    runs([{ text: 'Ежемесячный платёж' }], x, baseline(row, LABEL), LABEL)
    price(trim.monthly, x, baseline(row + 75, PRICE), PRICE)
  }
  parts.black.push(...qrOutline(input.url, CARD.w - SIDE - 200, row, 200))

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
export const BAND = 720
