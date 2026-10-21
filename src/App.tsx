import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { goal } from '@/ui/metrika'
import { isValidUrl, SegBtn, Field, Segments, TextArea, TextInput, UrlField, GeneratorHeader, LinkButtons, DownloadBar, unfilled, itemOf } from '@/ui/form'
import { linkParams, useLinkState, saveAndOpenPdf } from '@/ui/share'
import { useStaff, ItemFrame, useAddKey, Removed, plain, ITEM_EDGE_OVER, type Row } from '@/ui/staff'
import { MobileEditor, usePhone } from '@/ui/mobile'
import { TemplateButton, useTemplateLink } from '@/ui/template'
import { loadFonts } from '@/ui/type'
import { CARD, buildCard, loadAlice, trimOf, type CardFonts, type Model, type Trim } from '@/pricecard/card'
import CardArt from '@/pricecard/CardArt'
import { SITE } from '@/site'

const POSTER_W = CARD.w
const POSTER_H = CARD.h
/** The QR leads to the model's own page unless another link is set */
const DEFAULT_URL: Record<Model, string> = { umo8: 'https://umo.auto/umo8', umo5: 'https://umo.auto/umo5' }

const TRIMS: Record<Model, Trim[]> = { umo8: ['max', 'ultra'], umo5: ['pro', 'max'] }

const MAX_PRICE = 9_999_999

function formatPrice(val: string) {
  const digits = val.replace(/\D/g, '')
  const num = Math.min(Number(digits), MAX_PRICE)
  return digits === '' ? '' : String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const priceNum = (s: string) => Number(s.replace(/\D/g, '')) || 0

/**
 * One price card: model and trim, the full cost, the QR's link and the fine print. «от …» and the monthly payment are the
 * trim's, fixed (`TRIMS` in card.ts); the full cost is the dealer's, the trim's price with what equipment they add
 */
interface Card {
  model: Model
  trim: Trim
  /** The full cost; it follows the trim until edited */
  full: string
  fullSet: boolean
  /** The fine print; it follows the trim until edited */
  legal: string
  legalSet: boolean
  url: string
}

/** A model's card as it comes: its first trim, its fine print, the QR to the model's page */
function defaultCard(model: Model): Card {
  const trim = TRIMS[model][0]
  return { model, trim, full: trimOf(model, trim).full, fullSet: false, legal: trimOf(model, trim).legal, legalSet: false, url: DEFAULT_URL[model] }
}

const sameCard = (a: Card, b: Card) => (Object.keys(b) as (keyof Card)[]).every(k => a[k] === b[k])

/** At most this many cards come from a link */
const MAX_CARDS = 20

/**
 * The cards the page was opened with. The first card's settings have no suffix, so links made for a single card open as they are;
 * the next ones carry their number (`model2`, `legal3`), and `cards` says how many there are. `full`, seven digits,
 * is the full cost (a `credit` in a link is ignored)
 */
function fromLink(): Card[] {
  const link = linkParams()
  const count = Math.min(Math.max(Number(link.get('cards')) || 1, 1), MAX_CARDS)
  return Array.from({ length: count }, (_, i) => {
    const n = i === 0 ? '' : String(i + 1)
    const model: Model = link.get(`model${n}`) === 'umo8' ? 'umo8' : 'umo5'
    const asked = link.get(`trim${n}`) as Trim | null
    const trim = asked && TRIMS[model].includes(asked) ? asked : TRIMS[model][0]
    const legal = link.get(`legal${n}`)
    const full = link.get(`full${n}`)
    const fullOk = full !== null && /^[1-9]\d{6}$/.test(full)
    return {
      model,
      trim,
      full: fullOk ? formatPrice(full) : trimOf(model, trim).full,
      fullSet: fullOk,
      legal: legal ?? trimOf(model, trim).legal,
      legalSet: legal !== null,
      url: link.get(`link${n}`) ?? DEFAULT_URL[model],
    }
  })
}

/** The link the QR leads to: the card's own if it's a link, the model's page otherwise */
const qrUrlOf = (c: Card) => isValidUrl(c.url.trim()) ? c.url.trim() : DEFAULT_URL[c.model]

const artOf = (fonts: CardFonts, c: Card) => buildCard(fonts, { model: c.model, trim: c.trim, full: c.full, legal: c.legal, url: qrUrlOf(c) })

/** The full cost may be the trim's price or more, never less */
const fullTooLow = (c: Card) => priceNum(c.full) < priceNum(trimOf(c.model, c.trim).full)

/** A card's first fault in the form's order, said over «Скачать PDF», and the field it's in */
function firstIssue(fonts: CardFonts | undefined, c: Card): { field: 'url' | 'full' | 'legal'; text: string } | null {
  if (!isValidUrl(c.url.trim())) return { field: 'url', text: c.url.trim() ? 'Проверить ссылку QR-кода' : unfilled(['Указать ссылку QR-кода']) }
  if (!priceNum(c.full)) return { field: 'full', text: unfilled(['Указать полную стоимость']) }
  if (fullTooLow(c)) return { field: 'full', text: 'Стоимость ниже цены' }
  const said = fonts && artOf(fonts, c).issues[0]
  return said ? { field: 'legal', text: said } : null
}

const fontsPromise = () => Promise.all([loadFonts(), loadAlice()]).then(([f, alice]) => ({ ...f, alice }))

/** The cards' PDF, an A3 page each; the PDF code comes in on the first call */
async function pdfOf(cards: Card[], name = pdfName(cards)) {
  const [{ cardsPdf }, fonts] = await Promise.all([import('@/pricecard/pdf'), fontsPromise()])
  return cardsPdf(cards.map(c => artOf(fonts, c)), name)
}

/** A trim's card as it comes, the QR to the model's page */
const defaultOf = (model: Model, trim: Trim): Card => ({ ...defaultCard(model), trim, full: trimOf(model, trim).full, legal: trimOf(model, trim).legal })

/**
 * What the guide's PDF link (`?t`) gives: every model's every trim as it comes, UMO 5 first, an A3 page each, ready to
 * print (the card's own file stays in its column)
 */
const DEFAULTS_FILE = `${SITE.file}_price-cards.pdf`
const allDefaults = () => (['umo5', 'umo8'] as Model[]).flatMap(m => TRIMS[m].map(trim => defaultOf(m, trim)))
const defaultsPdf = () => pdfOf(allDefaults(), DEFAULTS_FILE)

function downloadGoal(cards: Card[], extra?: Record<string, unknown>) {
  const one = cards.length === 1 ? cards[0] : null
  // QR links other than the model's page go along: where dealers send people
  const ownLinks = [...new Set(cards.map(qrUrlOf).filter(u => !Object.values(DEFAULT_URL).includes(u)))].join(' ').slice(0, 300)
  goal('download_price_card', {
    ...(one
      ? { model: one.model, trim: one.trim, ownFull: one.fullSet, ownLegal: one.legalSet, ownLink: qrUrlOf(one) !== DEFAULT_URL[one.model] }
      : { cards: cards.length, ownFull: cards.some(c => c.fullSet), ownLegal: cards.some(c => c.legalSet), ownLink: cards.some(c => qrUrlOf(c) !== DEFAULT_URL[c.model]) }),
    ...(ownLinks && { link: ownLinks }),
    ...extra,
  })
}

/** One card's file is named for it, several are «UMO_price-cards» */
function pdfName(cards: Card[]) {
  const one = cards.length === 1 ? cards[0] : null
  return one ? `UMO-${one.model === 'umo8' ? '8' : '5'}-${one.trim.toUpperCase()}.pdf` : `${SITE.file}_price-cards.pdf`
}

export default function App() {
  const [initial] = useState(fromLink)
  // `pdf` in the link (a link made for the dealer) opens the cards' PDF itself, with no editor; a card at fault
  // opens the editor instead, showing what's wrong
  const [pdfOnly, setPdfOnly] = useState(() => linkParams().has('pdf') && initial.every(c => !firstIssue(undefined, c)))
  useEffect(() => {
    if (!pdfOnly) return
    pdfOf(initial)
      .then(blob => {
        downloadGoal(initial, { via: 'link' })
        saveAndOpenPdf(blob, pdfName(initial))
      })
      .catch(() => setPdfOnly(false))
  }, [])
  // The cards are a list as the business cards are: one selected and edited in the sidebar, each with its number and
  // actions beside it, «Добавить» under them. There's no table mode, and one card is always selected
  const staff = useStaff<Card>({ blank: defaultCard('umo5'), readFile: () => [], readPasted: () => [], initial })
  const { items, update } = staff
  const card: Row<Card> = staff.current ?? items[0]
  const set = (patch: Partial<Card>) => update(card.key, patch)
  staff.useKeys(false)
  // A card's «Сбросить» brings it back to its model's defaults, as the sidebar's does; it isn't offered on one that is
  const frame = {
    ...staff,
    clear: (key: number) => { const c = items.find(it => it.key === key); if (c) update(key, defaultCard(c.model)) },
    isBlank: (c: Card) => sameCard(c, defaultCard(c.model)),
  }

  const switchModel = (m: Model) => {
    // The link follows the model while it's still the old model's own page; the fine print is the model's own (UMO 8's
    // has its credit terms), edited or not
    const url = card.url.trim() === DEFAULT_URL[card.model] ? DEFAULT_URL[m] : card.url
    set({ ...defaultCard(m), url })
  }
  const switchTrim = (t: Trim) => set({
    trim: t,
    ...(!card.fullSet && { full: trimOf(card.model, t).full }),
    ...(!card.legalSet && { legal: trimOf(card.model, t).legal }),
  })
  const changeFull = (v: string) => { const full = formatPrice(v); set({ full, fullSet: full !== trimOf(card.model, card.trim).full }) }
  const changeLegal = (legal: string) => set({ legal, legalSet: legal !== trimOf(card.model, card.trim).legal })

  // The address carries what differs from the defaults, every card's, so the set can be sent as a link
  useLinkState({
    cards: items.length > 1 ? String(items.length) : null,
    ...Object.fromEntries(items.flatMap((c, i) => {
      const n = i === 0 ? '' : String(i + 1)
      return [
        // UMO 5 by default, so a link without `model` opens UMO 5
        [`model${n}`, c.model === 'umo5' ? null : c.model],
        [`trim${n}`, c.trim === TRIMS[c.model][0] ? null : c.trim],
        [`full${n}`, c.fullSet ? c.full.replace(/\D/g, '') : null],
        [`legal${n}`, c.legalSet ? c.legal : null],
        [`link${n}`, c.url.trim() === DEFAULT_URL[c.model] ? null : c.url.trim()],
      ]
    })),
  })

  const [fonts, setFonts] = useState<CardFonts>()
  useEffect(() => { fontsPromise().then(setFonts) }, [])
  const arts = useMemo(() => new Map(fonts ? items.map(c => [c.key, artOf(fonts, c)]) : []), [fonts, items])
  const [exporting, setExporting] = useState(false)
  const phone = usePhone()
  // The cards' width on the canvas: each card fits its height (phones draw it at their slide's width)
  const [cardW, setCardW] = useState(0)

  useEffect(() => {
    const prev = document.title
    document.title = `Прайс-карта ${SITE.name}`
    return () => { document.title = prev }
  }, [])

  const canvasRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCardW(Math.floor(Math.min(width, height * POSTER_W / POSTER_H)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [phone])
  const scale = cardW / POSTER_W

  const failing = items.filter(c => firstIssue(fonts, c)).map(c => c.key)
  const issue = firstIssue(fonts, card)

  const form = useRef<HTMLDivElement>(null)
  /** The field at fault takes the focus, as the business card's dealership */
  const toIssue = () => {
    if (issue) form.current?.querySelector<HTMLElement>(`[data-field="${issue.field}"] :is(input, textarea)`)?.focus()
  }

  /** The cards' PDF for «Поделиться» to send, made again as they change */
  const shareFile = useCallback(async () => new File([await pdfOf(items)], pdfName(items), { type: 'application/pdf' }), [items])

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await pdfOf(items)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = pdfName(items)
      link.click()
      downloadGoal(items)
      URL.revokeObjectURL(link.href)
    } finally {
      setExporting(false)
    }
  }

  const trims8: { value: Trim; label: string }[] = [{ value: 'max', label: 'MAX' }, { value: 'ultra', label: 'ULTRA' }]
  const trims5: { value: Trim; label: string }[] = [{ value: 'pro', label: 'PRO' }, { value: 'max', label: 'MAX' }]
  const trimOptions = card.model === 'umo8' ? trims8 : trims5

  const sidebar = (
    <>
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/price-card" />

          {/* Model and trim side by side while each is 180 px or wider, else one under the other across the row */}
          <div ref={form} className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-3 gap-y-4 md:grid-cols-1 tracking-normal">
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

            {/* The link before the prices */}
            <div data-field="url" className="col-span-full">
              <Field label="Ссылка QR-кода">
                <UrlField value={card.url} onChange={url => set({ url })} />
              </Field>
            </div>

            {/* The full cost, the trim's price and the dealer's equipment, not under the trim's price; it follows the trim until edited */}
            <div data-field="full" className="col-span-full">
              <Field label="Полная стоимость, ₽">
                <TextInput numeric step={5000} max={MAX_PRICE} value={card.full} placeholder="9 999 999" invalid={issue?.field === 'full'} onChange={changeFull} />
              </Field>
            </div>

            {/* The fine print under the card's prices, the dealer's to edit; it follows the trim until edited */}
            <div data-field="legal" className="col-span-full">
              <Field label="Сноска">
                <TextArea value={card.legal} onChange={changeLegal} placeholder="Сноска" invalid={issue?.field === 'legal'} className="max-h-60 overflow-y-auto!" />
              </Field>
            </div>
          </div>

        </div>

        {/* Download — 8px under «Поделиться», sticking to the bottom of the sidebar when the window is shorter than
            the form; on phones pinned to the bottom of the screen, since the preview comes below the form. Over them, while
            it's off, one card's first fault (a click taking the focus there) or the cards in work, as the business card's */}
    </>
  )

  const download = (
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={failing.length > 0 || !fonts}
          note={items.length > 1 ? (failing.length ? firstIssue(fonts, items[staff.inWork(failing).index])?.text : undefined) : issue?.text}
          count={failing.length ? itemOf(staff.inWork(failing).index, items.length) : undefined}
          onNote={items.length > 1 ? () => staff.nextOf(failing) : toIssue}
          // No «Сбросить» here: each card has its own beside it
          links={<LinkButtons incomplete={failing.length > 0} file={shareFile} />}
        />
  )

  // Phones: the canvas over a sheet with the form (trial)
  /** A card drawn at a width, on a phone's slide */
  const cardAt = (c: Row<Card>, w: number) => (
    <div className={`overflow-hidden bg-white ${ITEM_EDGE_OVER}`} style={{ width: w, height: Math.round(POSTER_H * w / POSTER_W) }}>
      {arts.get(c.key) && <CardArt art={arts.get(c.key)!} />}
    </div>
  )
  // A card's reset brings back its model's defaults (`frame`)
  // «Добавить» in the card's column, ⌘↩ from anywhere (wide screens): the next card starts as the last one, most
  // often the same model in another trim or at another price
  const addCard = (after?: number) => staff.add(plain(items[items.length - 1]), undefined, after)
  useAddKey(!phone ? () => addCard(staff.selected) : undefined)
  /** The template icon in the card's column: that card as it is, what's typed in it (`UMO-5-PRO.pdf`); `?t`, every trim's default */
  const templateIcon = (c: Card) => <TemplateButton make={() => pdfOf([c])} name={pdfName([c])} goalId="download_price_card_template" title="Скачать прайс-карту" />
  const templateOnly = useTemplateLink(defaultsPdf, DEFAULTS_FILE, 'download_price_card_template')

  if (pdfOnly || templateOnly) return null
  if (phone) return <MobileEditor slides={items.map(c => ({ key: c.key, item: c.key, label: `UMO ${c.model === 'umo8' ? 8 : 5} ${c.trim.toUpperCase()}`, ratio: POSTER_H / POSTER_W, node: (w: number) => cardAt(c, w) }))} staff={frame} onAdd={addCard} sidebar={sidebar} download={download} />

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      {/* ── Sidebar: 320px plus the 1px outside stroke, which shows only on the right ── */}
      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        {sidebar}
        {download}
      </aside>

      {/* ── The cards ── */}
      <main ref={canvasRef} className="flex flex-1 flex-col bg-surface px-2 py-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        {scale > 0 && (
          <div className="m-auto grid w-full grid-cols-1 gap-8">
            {items.map((c, i) => {
              const active = c.key === card.key
              return (
                <Fragment key={c.key}>
                  <Removed staff={staff} at={i} />
                  <figure ref={staff.figureRef(c.key)} onClick={() => staff.pick(c.key)} className="group/row flex cursor-pointer justify-center">
                    <div className="w-full" style={{ maxWidth: cardW }}>
                      <ItemFrame staff={frame} item={c} n={i + 1} onAdd={addCard} extra={templateIcon(c)}>
                        {/* A plain box, not a button: a button's centred text shifted the card's own layout. Clipped to
                            the card, so the photo doesn't run past its edge, and edged as every generator's items,
                            the edge on a layer over the poster, which covers one on the box (`ITEM_EDGE_OVER`) */}
                        <div
                          className={`overflow-hidden bg-white ${ITEM_EDGE_OVER} transition-opacity duration-150
                            ${!active ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                          style={{ width: cardW, height: Math.round(POSTER_H * scale) }}
                        >
                          {arts.get(c.key) && <CardArt art={arts.get(c.key)!} />}
                        </div>
                      </ItemFrame>
                    </div>
                  </figure>
                </Fragment>
              )
            })}
            <Removed staff={staff} at={items.length} />
          </div>
        )}
      </main>

    </div>
  )
}
