import { useState, useEffect, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import PriceCard from '@/posters/PriceCard'
import PriceCardPdf from '@/posters/pdf/PriceCardPdf'
import { ensurePdfFonts } from '@/posters/pdf/pdfFonts'
import type { Variant } from '@/posters/cardData'
import { isValidUrl, SegBtn, Field, OptionalField, Segments, TextInput, UrlField, GeneratorHeader, LinkButtons, DownloadButton } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'

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

function ActivePoster({ model, trim, fullPrice, creditPrice, qrSvg }: { model: Model; trim: Trim; fullPrice: string; creditPrice?: string; qrSvg?: string }) {
  return <PriceCard variant={`${model}-${trim}` as Variant} fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
}

/** The card the page was opened with: model and trim from the link if they exist, prices as given or the trim's own */
function fromLink() {
  const link = linkParams()
  const model: Model = link.get('model') === 'umo8' ? 'umo8' : 'umo5'
  const asked = link.get('trim') as Trim | null
  const trim = asked && TRIMS[model].includes(asked) ? asked : TRIMS[model][0]
  // A price is taken as it is in the link only if it looks like one: seven digits, 1 000 000 to 9 999 999
  const price = (key: string) => {
    const v = link.get(key) ?? ''
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
    creditOn: link.has('credit'),
    url: link.get('link') ?? DEFAULT_URL[model],
  }
}

export default function App() {
  const [initial] = useState(fromLink)
  const [model, setModel] = useState<Model>(initial.model)
  const [trim, setTrim] = useState<Trim>(initial.trim)
  const [fullPrice, setFullPrice] = useState(initial.full)
  const [creditPrice, setCreditPrice] = useState(initial.credit)
  // The credit price follows the full one (a million less) until it's set by hand; a card may have no credit offer
  const [creditSet, setCreditSet] = useState(initial.creditSet)
  const [creditOn, setCreditOn] = useState(initial.creditOn)
  const [url, setUrl] = useState(initial.url)

  const changeFull = (v: string) => {
    const full = formatPrice(v)
    setFullPrice(full)
    if (!creditSet) setCreditPrice(creditFor(full))
  }
  const changeCredit = (v: string) => {
    setCreditPrice(formatPrice(v))
    setCreditSet(true)
  }
  const resetPrices = (m: Model, t: Trim) => {
    setFullPrice(DEFAULTS[`${m}-${t}`])
    setCreditPrice(creditFor(DEFAULTS[`${m}-${t}`]))
    setCreditSet(false)
  }

  // The address carries what differs from the defaults, so the card can be sent as a link
  const digits = (v: string) => v.replace(/\D/g, '')
  useLinkState({
    // UMO 5 by default (it was UMO 8, so links from then without `model` now open UMO 5)
    model: model === 'umo5' ? null : model,
    trim: trim === TRIMS[model][0] ? null : trim,
    full: fullPrice === DEFAULTS[`${model}-${trim}`] ? null : digits(fullPrice),
    credit: !creditOn ? null : creditSet ? digits(creditPrice) : 'auto',
    link: url.trim() === DEFAULT_URL[model] ? null : url.trim(),
  })
  const [qrSvg, setQrSvg] = useState<string | undefined>(undefined)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(0)

  const urlValid = isValidUrl(url.trim())

  const MIN_CREDIT = 999_999
  const fullMissing = priceNum(fullPrice) === 0
  const creditTooLow = creditOn && priceNum(creditPrice) < MIN_CREDIT
  const fullLessThanCredit = creditOn && priceNum(fullPrice) < priceNum(creditPrice)
  const pricesValid = !fullMissing && !creditTooLow && !fullLessThanCredit
  const credit = creditOn ? creditPrice : undefined

  useEffect(() => {
    const effective = urlValid ? url.trim() : DEFAULT_URL[model]
    QRCode.toString(effective, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(raw => setQrSvg(raw.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')))
      .catch(() => setQrSvg(undefined))
  }, [url, model])

  useEffect(() => {
    const prev = document.title
    document.title = 'Прайс-карта UMO'
    return () => { document.title = prev }
  }, [])

  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // Wide screens fit the card to the preview area's height; narrow ones (stacked layout) to its width.
      const byWidth = width / POSTER_W
      setScale(window.matchMedia('(min-width: 768px)').matches ? Math.min(byWidth, height / POSTER_H) : byWidth)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const switchModel = (m: Model) => {
    const t = TRIMS[m][0]
    setModel(m); setTrim(t)
    resetPrices(m, t)
    // The link follows the model while it's still the old model's own page
    if (url.trim() === DEFAULT_URL[model]) setUrl(DEFAULT_URL[m])
  }

  const switchTrim = (t: Trim) => {
    setTrim(t)
    resetPrices(model, t)
  }

  // «Сбросить» keeps the model and brings the rest back to its defaults
  const reset = () => {
    switchModel(model)
    setCreditOn(false)
    setUrl(DEFAULT_URL[model])
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      ensurePdfFonts()
      const qrUrl = urlValid ? url.trim() : DEFAULT_URL[model]
      const props = { fullPrice, creditPrice: credit, qrUrl }
      const doc = <PriceCardPdf variant={`${model}-${trim}` as Variant} {...props} />
      const blob = await pdf(doc).toBlob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `UMO-${model === 'umo8' ? '8' : '5'}-${trim.toUpperCase()}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } finally {
      setExporting(false)
    }
  }

  const trims8: { value: Trim; label: string }[] = [{ value: 'max', label: 'MAX' }, { value: 'ultra', label: 'ULTRA' }]
  const trims5: { value: Trim; label: string }[] = [{ value: 'pro', label: 'PRO' }, { value: 'max', label: 'MAX' }]
  const trimOptions = model === 'umo8' ? trims8 : trims5

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      {/* ── Sidebar: 320px plus the 1px outside stroke from Figma (4844:6865), which shows only on the right ── */}
      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/price-card" />

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-1 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo5'} onClick={() => switchModel('umo5')}>UMO 5</SegBtn>
                <SegBtn active={model === 'umo8'} onClick={() => switchModel('umo8')}>UMO 8</SegBtn>
              </Segments>
            </Field>

            <Field label="Комплектация">
              <Segments>
                {trimOptions.map(t => (
                  <SegBtn key={t.value} active={trim === t.value} onClick={() => switchTrim(t.value)}>{t.label}</SegBtn>
                ))}
              </Segments>
            </Field>

            {/* The link before the prices, as in Figma 4844:6865 */}
            <div className="col-span-2 md:col-span-1">
              <Field label="Ссылка QR-кода">
                <UrlField value={url} onChange={setUrl} />
              </Field>
            </div>

            <Field label="Полная цена, ₽">
              <TextInput numeric value={fullPrice} invalid={fullMissing || fullLessThanCredit} onChange={changeFull} />
            </Field>

            <OptionalField label="В кредит, ₽" on={creditOn} onChange={setCreditOn}>
              <TextInput numeric value={creditPrice} invalid={creditTooLow || fullLessThanCredit} onChange={changeCredit} />
            </OptionalField>
          </div>

          <div className="pt-2 tracking-normal">
            <LinkButtons onReset={reset} />
          </div>
        </div>

        {/* Download — 8px under «Копировать» and «Сбросить», sticking to the bottom of the sidebar when the window is shorter
            than the form; on phones pinned to the bottom of the screen, since the preview comes below the form */}
        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!urlValid || !pricesValid}>Скачать PDF</DownloadButton>
        </div>
      </aside>

      {/* ── Poster preview ── */}
      <main className="flex flex-1 items-center justify-center bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:p-16">
        <div ref={previewRef} className="flex size-full items-center justify-center">
          {scale > 0 && (
            <div className="bg-white ring-1 ring-black/10" style={{ width: POSTER_W * scale, height: POSTER_H * scale, position: 'relative', flexShrink: 0 }}>
              <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, position: 'absolute', top: 0, left: 0 }}>
                <ActivePoster model={model} trim={trim} fullPrice={fullPrice} creditPrice={credit} qrSvg={qrSvg} />
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
