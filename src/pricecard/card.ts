import { parse, type Font } from 'opentype.js'
import { qrOutline, type Cmd } from '@/livery/geometry'
import { missingChars, setRuns, tidy, wrap, type Fonts } from '@/ui/type'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { typografText } from '@/guide/typograf'
import umo8MaxPhoto from '@/assets/umo8-car.jpg'
import umo8UltraPhoto from '@/assets/umo8-ultra-car.jpg'
import umo5ProPhoto from '@/assets/umo5-car.jpg'
import umo5MaxPhoto from '@/assets/umo5-max-car.jpg'
// The screen's copies, 1600 px WebP: the preview never draws the photo wider; the PDF takes the full JPEGs
import umo8MaxPreview from '@/assets/umo8-car-preview.webp'
import umo8UltraPreview from '@/assets/umo8-ultra-car-preview.webp'
import umo5ProPreview from '@/assets/umo5-car-preview.webp'
import umo5MaxPreview from '@/assets/umo5-max-car-preview.webp'

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

export type Model = 'umo8' | 'umo5'
export type Trim = 'max' | 'ultra' | 'pro'
export type Variant = 'umo8-max' | 'umo8-ultra' | 'umo5-pro' | 'umo5-max'

/** A run of a fixed line: Alice's mark (and on UMO 5 the thin no-break space before it) comes from Alice Okniks */
interface Run { text: string; alice?: boolean }

interface ModelData {
  /** The headline as Figma breaks it, a line a row */
  headline: Run[][]
}

export const MODELS: Record<Model, ModelData> = {
  umo8: {
    headline: [[{ text: 'Гибрид с\u00a0Алисой\u00a0' }, { text: '@', alice: true }], [{ text: 'и\u00a0технологиями\u00a0Яндекса' }]],
  },
  umo5: {
    headline: [[{ text: 'Электромобиль' }], [{ text: 'с\u00a0технологиями Яндекса' }], [{ text: 'и\u00a0Алисой' }, { text: '\u00a0@', alice: true }]],
  },
}

/** A trim's photo across the band */
interface Photo {
  /** The full JPEG, for the PDF */
  print: string
  /** Its screen copy */
  preview: string
  /** The photo's box: Figma fills it with the photo, cut to the band */
  box: { x: number; y: number; w: number; h: number }
  /** The photo's pixels, for filling the box */
  px: { w: number; h: number }
}

// The photos are cut to the band and 3 mm (21.2 px) round it, at their own resolution (Figma's boxes were larger:
// UMO 8 Max (−30, −350) 2560×1440, Ultra (−200, −330) 2400×1200, UMO 5 (−30, −350) 2250×1181); the boxes are the cut's
// UMO 5 Max is cut 3 px lower than Pro, so its car, that much lower in the photo, stands where Pro's does
const UMO5_BOX = { x: -21.76, y: -21.52, w: 2143.43, h: 763 }
const UMO5_PX = { w: 3902, h: 1389 }

interface TrimData {
  name: string
  photo: Photo
  /** «от … ₽» on the photo, the trim bare */
  from: string
  /** The full cost as it comes; the dealer may raise it, never lower */
  full: string
  /** The credit's monthly payment, beside the price; none on UMO 5 */
  monthly?: string
  list: string[]
  /** The fine print as it comes; the dealer edits it */
  legal: string
}

const DISCLAIMER = 'Настоящая информация носит исключительно ознакомительный характер, не является публичной офертой, определяемой положениями ст. 437 Гражданского кодекса РФ, и не влечет для Продавца каких-либо обязательств по заключению договора купли-продажи транспортного средства.'

/** UMO 8's credit terms, the same for both trims. Figma's texts word for word, its forced line breaks left out */
const TERMS = 'Параметры программы «UMO КРЕДИТ»: валюта кредита – рубли РФ; срок кредита от 12 до 96 мес.; сумма кредита - от 300 000 до 12 000 000 руб. Диапазон Полной стоимости кредита в % годовых составляет от 0,010% до 16,799% годовых. % ставка составляет от 0,01% до 16,30%, на диапазонах первоначального взноса от 10% до 90% включительно от стоимости автомобиля, при сроке кредита от 12 до 96 мес. и определяется индивидуально. Конечная ставка в пределах указанного диапазона зависит от выбранных условий: от выбранного автомобиля, срока кредитования, размера первоначального взноса, условий страхования и Вашей кредитной истории. ОЦЕНИВАЙТЕ СВОИ ФИНАНСОВЫЕ ВОЗМОЖНОСТИ И РИСКИ. ИЗУЧИТЕ ВСЕ УСЛОВИЯ КРЕДИТА.'
const BANK = 'Банк ООО «МБ РУС Банк», Лицензия № 3473 от 23.05.2024.'

/** Per trim; «от» and the monthly payment are fixed, the full cost the dealer's to raise (the form) */
export const TRIMS: Record<Variant, TrimData> = {
  'umo8-max': {
    name: 'Макс', from: '5 690 000', full: '5 690 000', monthly: '49 990',
    photo: { print: umo8MaxPhoto, preview: umo8MaxPreview, box: { x: -21.25, y: -21.87, w: 2143.13, h: 763.13 }, px: { w: 2286, h: 814 } },
    list: ['Разгон до 100 км/ч за 6.7 c', 'Суммарный запас хода до 867 км', 'Массаж и вентиляция всех сидений', 'Подогрев всех сидений', 'Режим нулевой гравитации', 'Удаленный доступ со смартфона', 'Панорамная крыша'],
    legal: `Предложение распространяется на автомобили UMO 8 MAX 2026 года выпуска. ${TERMS} Пример расчета ежемесячного платежа в размере 49 990 руб. для автомобиля UMO 8 MAX при следующих условиях: - розничная цена автомобиля – 5 690 000,00 руб. первоначальный взнос по кредиту – 3 965 865,84 руб., сумма кредита – 1 724 134,16 руб., срок кредитования – 36 мес., процентная ставка – 0,01% годовых. Полная стоимость кредита: от 0,010 до 16,799% годовых. ${DISCLAIMER} ${BANK}`,
  },
  'umo8-ultra': {
    name: 'Ультра', from: '6 190 000', full: '6 190 000', monthly: '51 990',
    photo: { print: umo8UltraPhoto, preview: umo8UltraPreview, box: { x: -21.87, y: -21.41, w: 2143.75, h: 763.28 }, px: { w: 2744, h: 977 } },
    list: ['Разгон до 100 км/ч за 6.7 c', 'Суммарный запас хода до 867 км', 'Массаж и вентиляция всех сидений', 'Кожа наппа в салоне', 'Режим нулевой гравитации', 'Проекция на лобовое стекло', 'Панорамная крыша', 'ИИ фары с анимацией', 'Автопарковка'],
    legal: `Предложение распространяется на автомобили UMO 8 ULTRA 2026 года выпуска. ${TERMS} Пример расчета ежемесячного платежа в размере 51 990 руб. для автомобиля UMO 8 ULTRA при следующих условиях: розничная цена автомобиля – 6 190 000,00 руб., первоначальный взнос по кредиту – 4 318 648,00 руб. сумма кредита – 1 871 352,00 руб., срок кредитования – 36 мес., процентная ставка – 0,01% годовых. Полная стоимость кредита: от 0,010 до 16,799% годовых. ${DISCLAIMER} ${BANK}`,
  },
  'umo5-pro': {
    name: 'Про', from: '3 095 000', full: '3 095 000',
    photo: { print: umo5ProPhoto, preview: umo5ProPreview, box: UMO5_BOX, px: UMO5_PX },
    list: ['Запас хода до 420 км', 'Разгон до 100 км/ч за 8.7 c', 'Круиз контроль', 'Электрический привод багажника', 'Удаленный доступ со смартфона', 'Диски 17 дюймов'],
    legal: DISCLAIMER,
  },
  'umo5-max': {
    name: 'Макс', from: '3 440 000', full: '3 440 000',
    photo: { print: umo5MaxPhoto, preview: umo5MaxPreview, box: UMO5_BOX, px: UMO5_PX },
    list: ['Запас хода до 420 км', 'Разгон до 100 км/ч за 8.7 c', 'Адаптивный круиз контроль', 'Система удержания в полосе', 'Адаптивное управление дальним светом', 'Интерактивная подсветка салона', 'Панорамная крыша', 'Диски 18 дюймов'],
    legal: DISCLAIMER,
  },
}

export const trimOf = (model: Model, trim: Trim) => TRIMS[`${model}-${trim}` as Variant]

/** The wordmark with the model's number, 525×75, Figma's paths */
const UMO = [
  'M170.626 27.1875H142.499V75H114.375V27.0896C114.375 7.84702 123.512 0 142.499 0H170.626V27.1875ZM226.873 0C245.854 0 255 7.83582 255 27.0896V75H226.873V27.1875H198.749V75H170.626V27.1875H198.749V0H226.873Z',
  'M76.875 47.8125H28.125V0H0V47.9105C0 67.1642 9.15654 75 28.1485 75H76.8487C95.8547 75 105 67.153 105 47.9105V0H76.875V47.8125Z',
  'M346.854 0C365.847 0 375 7.83582 375 27.0896V47.9105C375 67.153 365.858 75 346.854 75H292.524C273.528 75 264.375 67.1642 264.375 47.9105V27.0896C264.375 7.84702 273.528 0 292.524 0H346.854ZM292.5 47.8125H346.875V27.0896L292.5 27.1875V47.8125Z',
].join('')
const NUMBER: Record<Model, string> = {
  umo8: 'M509.87 0H446.375C436.641 0 431.25 3.60705 431.25 13.0777V23.2962C431.25 33.2156 438.587 34.1173 443.229 35.1687V36.9722C437.237 38.1731 431.25 42.6819 431.25 52.1525V61.0206C431.25 70.1878 436.939 75 447.874 75H508.376C519.307 75 525 70.192 525 61.0206V52.1525C525 42.6819 519.009 38.1731 513.021 36.9722V35.1687C517.663 34.1173 525 33.2156 525 23.2962V13.0777C525 3.60705 519.609 0 509.875 0H509.87ZM509.572 60.871H446.678V43.4384H509.572V60.871ZM509.572 30.2111H446.678V14.129H509.572V30.2111Z',
  umo5: 'M508.191 30.2086H454.062V14.1255H520.387C521.875 14.1255 522.767 13.3733 522.767 12.0227V2.10281C522.767 0.747954 522.023 0 520.687 0H440.238C439.198 0 438.75 0.752223 438.75 1.80363V30.9608C438.75 39.3763 443.063 43.4366 454.066 43.4366H509.684V60.8702H440.534C439.494 60.8702 438.75 61.4728 438.75 62.8234V73.1964C438.75 74.3974 439.346 75 440.534 75H508.492C519.346 75 525 68.6873 525 58.3143V48.544C525 35.316 520.687 30.2086 508.196 30.2086H508.191Z',
}

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

/** Alice Okniks (`public/fonts`, the site's): Alice's mark on @, a thin no-break space */
let alicePromise: Promise<Font> | undefined
export const loadAlice = () => alicePromise ??= fetch(`${import.meta.env.BASE_URL}fonts/AliceOkniks.woff`).then(r => r.arrayBuffer()).then(buf => parse(buf))

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
  const data = MODELS[input.model]
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
  parts.white.push(...fromD(UMO + NUMBER[input.model], SIDE, SIDE))
  const fromBase = baseline(539, BODY, 56.25)
  price(trim.from, runs([{ text: 'от ', ink: 'white' }], SIDE, fromBase, BODY), fromBase, BODY, 'white')

  // The headline, Figma's lines
  let top = 820
  for (const line of data.headline) {
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
