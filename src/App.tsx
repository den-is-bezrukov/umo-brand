import { useState, useEffect, useRef, Fragment } from 'react'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import PriceCard from '@/posters/PriceCard'
import PriceCardPdf from '@/posters/pdf/PriceCardPdf'
import { ensurePdfFonts } from '@/posters/pdf/pdfFonts'
import type { Variant } from '@/posters/cardData'
import { goal } from '@/ui/metrika'
import { isValidUrl, SegBtn, Field, OptionalField, Segments, TextInput, UrlField, GeneratorHeader, LinkButtons, DownloadButton } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'
import { useStaff, ItemFrame, AddTile, Removed, Progress, plural, plain, ITEM_EDGE, type Row } from '@/ui/staff'

const POSTER_W = 1754
const POSTER_H = 2480
/** The QR leads to the model's own page unless another link is set */
const DEFAULT_URL: Record<Model, string> = { umo8: 'https://umo.auto/umo8', umo5: 'https://umo.auto/umo5' }

type Model = 'umo8' | 'umo5'
type Trim = 'max' | 'ultra' | 'pro'

// Full prices; the credit price defaults to a million less (`creditFor`)
const DEFAULTS: Record<string, string> = {
  'umo8-max':   '5 690 000',
  'umo8-ultra': '6 190 000',
  'umo5-max':   '3 440 000',
  'umo5-pro':   '3 095 000',
}
const CREDIT_OFF = 1_000_000

const TRIMS: Record<Model, Trim[]> = { umo8: ['max', 'ultra'], umo5: ['pro', 'max'] }

const MAX_PRICE = 9_999_999

function formatPrice(val: string) {
  const digits = val.replace(/\D/g, '')
  const num = Math.min(Number(digits), MAX_PRICE)
  return digits === '' ? '' : String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const priceNum = (s: string) => Number(s.replace(/\D/g, '')) || 0

/** The credit price that goes with a full price unless set by hand: a million less */
function creditFor(full: string) {
  const v = priceNum(full) - CREDIT_OFF
  return v > 0 ? formatPrice(String(v)) : ''
}

/** One price card: model and trim, its prices and the QR's link */
interface Card {
  model: Model
  trim: Trim
  full: string
  credit: string
  /** The credit price was set by hand; until then it follows the full one, a million less */
  creditSet: boolean
  /** A card may have no credit offer: one price then, under «Цена:» */
  creditOn: boolean
  url: string
}

/** A model's card as it comes: its first trim at its price, no credit, the QR to the model's page */
function defaultCard(model: Model): Card {
  const trim = TRIMS[model][0]
  const full = DEFAULTS[`${model}-${trim}`]
  return { model, trim, full, credit: creditFor(full), creditSet: false, creditOn: false, url: DEFAULT_URL[model] }
}

const sameCard = (a: Card, b: Card) => (Object.keys(b) as (keyof Card)[]).every(k => a[k] === b[k])

/** At most this many cards come from a link */
const MAX_CARDS = 20

/**
 * The cards the page was opened with. The first card's settings have no suffix, as links from when there was one card;
 * the next ones carry their number (`model2`, `full3`), and `cards` says how many there are
 */
function fromLink(): Card[] {
  const link = linkParams()
  const count = Math.min(Math.max(Number(link.get('cards')) || 1, 1), MAX_CARDS)
  return Array.from({ length: count }, (_, i) => {
    const n = i === 0 ? '' : String(i + 1)
    const model: Model = link.get(`model${n}`) === 'umo8' ? 'umo8' : 'umo5'
    const asked = link.get(`trim${n}`) as Trim | null
    const trim = asked && TRIMS[model].includes(asked) ? asked : TRIMS[model][0]
    // A price is taken as it is in the link only if it looks like one: seven digits, 1 000 000 to 9 999 999
    const price = (key: string) => {
      const v = link.get(key + n) ?? ''
      return /^[1-9]\d{6}$/.test(v) ? formatPrice(v) : null
    }
    const full = price('full') ?? DEFAULTS[`${model}-${trim}`]
    const credit = price('credit')
    return {
      model,
      trim,
      full,
      credit: credit ?? creditFor(full),
      creditSet: credit !== null,
      // Off unless the link has it: `credit=auto` follows the full price, seven digits are a price set by hand
      creditOn: link.has(`credit${n}`),
      url: link.get(`link${n}`) ?? DEFAULT_URL[model],
    }
  })
}

const MIN_CREDIT = 999_999

/** What's wrong with a card, field by field */
function check(c: Card) {
  const fullMissing = priceNum(c.full) === 0
  const creditTooLow = c.creditOn && priceNum(c.credit) < MIN_CREDIT
  const fullLessThanCredit = c.creditOn && priceNum(c.full) < priceNum(c.credit)
  const urlBad = !isValidUrl(c.url.trim())
  return { fullMissing, creditTooLow, fullLessThanCredit, urlBad, ok: !fullMissing && !creditTooLow && !fullLessThanCredit && !urlBad }
}

/** The link the QR leads to: the card's own if it's a link, the model's page otherwise */
const qrUrlOf = (c: Card) => isValidUrl(c.url.trim()) ? c.url.trim() : DEFAULT_URL[c.model]

/** прайс-карту, прайс-карты, прайс-карт: «Скачать 3 прайс-карты» */
const cardsWord = (n: number) => ({ '': 'прайс-карту', 'а': 'прайс-карты', 'ей': 'прайс-карт' })[plural(n)]

export default function App() {
  const [initial] = useState(fromLink)
  // The cards are a list as the business cards are: one selected and edited in the sidebar, each with its number and
  // actions beside it, «Добавить» under them. There's no table mode, and one card is always selected
  const staff = useStaff<Card>({ blank: defaultCard('umo5'), readFile: () => [], readPasted: () => [], initial })
  const { items, update } = staff
  const card: Row<Card> = staff.current ?? items[0]
  const set = (patch: Partial<Card>) => update(card.key, patch)
  staff.useDeleteKey(false)
  // A card's «Сбросить» brings it back to its model's defaults, as the sidebar's does; it isn't offered on one that is
  const frame = {
    ...staff,
    clear: (key: number) => { const c = items.find(it => it.key === key); if (c) update(key, defaultCard(c.model)) },
    isBlank: (c: Card) => sameCard(c, defaultCard(c.model)),
  }

  const changeFull = (v: string) => {
    const full = formatPrice(v)
    set(card.creditSet ? { full } : { full, credit: creditFor(full) })
  }
  const changeCredit = (v: string) => set({ credit: formatPrice(v), creditSet: true })

  const switchModel = (m: Model) => {
    // The link follows the model while it's still the old model's own page; the credit stays on or off
    const url = card.url.trim() === DEFAULT_URL[card.model] ? DEFAULT_URL[m] : card.url
    set({ ...defaultCard(m), url, creditOn: card.creditOn })
  }
  const switchTrim = (t: Trim) => {
    const full = DEFAULTS[`${card.model}-${t}`]
    set({ trim: t, full, credit: creditFor(full), creditSet: false })
  }

  // The address carries what differs from the defaults, every card's, so the set can be sent as a link
  const digits = (v: string) => v.replace(/\D/g, '')
  useLinkState({
    cards: items.length > 1 ? String(items.length) : null,
    ...Object.fromEntries(items.flatMap((c, i) => {
      const n = i === 0 ? '' : String(i + 1)
      return [
        // UMO 5 by default (it was UMO 8, so links from then without `model` now open UMO 5)
        [`model${n}`, c.model === 'umo5' ? null : c.model],
        [`trim${n}`, c.trim === TRIMS[c.model][0] ? null : c.trim],
        [`full${n}`, c.full === DEFAULTS[`${c.model}-${c.trim}`] ? null : digits(c.full)],
        [`credit${n}`, !c.creditOn ? null : c.creditSet ? digits(c.credit) : 'auto'],
        [`link${n}`, c.url.trim() === DEFAULT_URL[c.model] ? null : c.url.trim()],
      ]
    })),
  })

  // The QR codes, one per link in use, kept as they're made
  const [qrSvgs, setQrSvgs] = useState<Record<string, string>>({})
  const urls = [...new Set(items.map(qrUrlOf))]
  useEffect(() => {
    const missing = urls.filter(u => !(u in qrSvgs))
    if (!missing.length) return
    Promise.all(missing.map(u => QRCode.toString(u, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(raw => [u, raw.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')] as const)
      .catch(() => null)))
      .then(made => setQrSvgs(q => ({ ...q, ...Object.fromEntries(made.filter(m => m !== null)) })))
  }, [urls.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps

  const [exporting, setExporting] = useState(false)
  // The cards' width on the canvas: on wide screens each card fits its height, as the one card did; on phones its width
  const [cardW, setCardW] = useState(0)
  const [wide, setWide] = useState(true)

  useEffect(() => {
    const prev = document.title
    document.title = 'Прайс-карта UMO'
    return () => { document.title = prev }
  }, [])

  const canvasRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // On phones the card's number and actions take 40 + 8 px beside it, mirrored on the left (`BESIDE`)
      const md = window.matchMedia('(min-width: 768px)').matches
      setWide(md)
      setCardW(Math.floor(md ? Math.min(width, height * POSTER_W / POSTER_H) : width - 96))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const scale = cardW / POSTER_W
  /** A row's width: the card, and on phones the room beside it for its number and actions */
  const rowW = wide ? cardW : cardW + 96

  const issues = check(card)
  const failing = items.filter(c => !check(c).ok).map(c => c.key)

  const handleExport = async () => {
    setExporting(true)
    try {
      ensurePdfFonts()
      const pages = items.map(c => ({ variant: `${c.model}-${c.trim}` as Variant, fullPrice: c.full, creditPrice: c.creditOn ? c.credit : undefined, qrUrl: qrUrlOf(c) }))
      const blob = await pdf(<PriceCardPdf pages={pages} />).toBlob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const one = items.length === 1 ? items[0] : null
      link.download = one ? `UMO-${one.model === 'umo8' ? '8' : '5'}-${one.trim.toUpperCase()}.pdf` : 'UMO_price-cards.pdf'
      link.click()
      // QR links other than the model's page go along: where dealers send people
      const ownLinks = [...new Set(items.map(qrUrlOf).filter(u => !Object.values(DEFAULT_URL).includes(u)))].join(' ').slice(0, 300)
      goal('download_price_card', {
        ...(one
          ? { model: one.model, trim: one.trim, credit: one.creditOn, ownLink: qrUrlOf(one) !== DEFAULT_URL[one.model] }
          : { cards: items.length, credit: items.some(c => c.creditOn), ownLink: items.some(c => qrUrlOf(c) !== DEFAULT_URL[c.model]) }),
        ...(ownLinks && { link: ownLinks }),
      })
      URL.revokeObjectURL(link.href)
    } finally {
      setExporting(false)
    }
  }

  const trims8: { value: Trim; label: string }[] = [{ value: 'max', label: 'MAX' }, { value: 'ultra', label: 'ULTRA' }]
  const trims5: { value: Trim; label: string }[] = [{ value: 'pro', label: 'PRO' }, { value: 'max', label: 'MAX' }]
  const trimOptions = card.model === 'umo8' ? trims8 : trims5

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      {/* ── Sidebar: 320px plus the 1px outside stroke from Figma (4844:6865), which shows only on the right ── */}
      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/price-card" />

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-1 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={card.model === 'umo5'} onClick={() => switchModel('umo5')}>UMO 5</SegBtn>
                <SegBtn active={card.model === 'umo8'} onClick={() => switchModel('umo8')}>UMO 8</SegBtn>
              </Segments>
            </Field>

            <Field label="Комплектация">
              <Segments>
                {trimOptions.map(t => (
                  <SegBtn key={t.value} active={card.trim === t.value} onClick={() => switchTrim(t.value)}>{t.label}</SegBtn>
                ))}
              </Segments>
            </Field>

            {/* The link before the prices, as in Figma 4844:6865 */}
            <div className="col-span-2 md:col-span-1">
              <Field label="Ссылка QR-кода">
                <UrlField value={card.url} onChange={url => set({ url })} />
              </Field>
            </div>

            <Field label="Полная цена, ₽">
              <TextInput numeric value={card.full} invalid={issues.fullMissing || issues.fullLessThanCredit} onChange={changeFull} />
            </Field>

            <OptionalField label="В кредит, ₽" on={card.creditOn} onChange={creditOn => set({ creditOn })}>
              <TextInput numeric value={card.credit} invalid={issues.creditTooLow || issues.fullLessThanCredit} onChange={changeCredit} />
            </OptionalField>
          </div>

          <div className="pt-2 tracking-normal">
            {/* No «Сбросить» here: each card has its own beside it */}
            <LinkButtons />
          </div>
        </div>

        {/* Download — 8px under «Копировать» and «Сбросить», sticking to the bottom of the sidebar when the window is shorter
            than the form; on phones pinned to the bottom of the screen, since the preview comes below the form. With
            several cards and some in work, the progress leading through them stands in its place, as the business card's */}
        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          {failing.length > 0 && items.length > 1 ? (
            <Progress failing={failing.length} total={items.length} onClick={() => staff.nextOf(failing)} />
          ) : (
            <DownloadButton onClick={handleExport} busy={exporting} disabled={failing.length > 0}>
              {items.length > 1 ? `Скачать ${items.length} ${cardsWord(items.length)}` : 'Скачать PDF'}
            </DownloadButton>
          )}
        </div>
      </aside>

      {/* ── The cards ── */}
      <main ref={canvasRef} className="flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        {scale > 0 && (
          <div className="m-auto grid w-full grid-cols-1 gap-8">
            {items.map((c, i) => {
              const active = c.key === card.key
              return (
                <Fragment key={c.key}>
                  <Removed staff={staff} at={i} />
                  <figure ref={staff.figureRef(c.key)} onClick={() => staff.pick(c.key)} className="group/row flex cursor-pointer justify-center">
                    <div className="w-full" style={{ maxWidth: rowW }}>
                      <ItemFrame staff={frame} item={c} n={i + 1}>
                        {/* A plain box, not a button: a button's centred text shifted the card's own layout. Clipped to
                            the card, so the photo doesn't run past its edge, and edged as every generator's items
                            (`ITEM_EDGE`) */}
                        <div
                          className={`relative overflow-hidden bg-white ${ITEM_EDGE} transition-opacity duration-150
                            ${!active ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                          style={{ width: cardW, height: Math.round(POSTER_H * scale) }}
                        >
                          <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, position: 'absolute', top: 0, left: 0 }}>
                            <PriceCard variant={`${c.model}-${c.trim}` as Variant} fullPrice={c.full} creditPrice={c.creditOn ? c.credit : undefined} qrSvg={qrSvgs[qrUrlOf(c)]} />
                          </div>
                        </div>
                      </ItemFrame>
                    </div>
                  </figure>
                </Fragment>
              )
            })}
            <Removed staff={staff} at={items.length} />
            {/* The next card starts as the last one: most often the same model in another trim or at another price */}
            <AddTile onClick={() => staff.add(plain(items[items.length - 1]))} />
          </div>
        )}
      </main>

    </div>
  )
}
