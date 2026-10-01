import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import PriceCard from '@/posters/PriceCard'
import PriceCardPdf from '@/posters/pdf/PriceCardPdf'
import { ensurePdfFonts } from '@/posters/pdf/pdfFonts'
import type { Variant } from '@/posters/cardData'
import { isValidUrl, SegBtn, Field, Segments, TextInput, UrlField, DownloadButton } from '@/ui/form'

const POSTER_W = 1754
const POSTER_H = 2480
const DEFAULT_URL = 'https://umo.auto/'

type Model = 'umo8' | 'umo5'
type Trim = 'max' | 'ultra' | 'pro'

const DEFAULTS: Record<string, { full: string; credit: string }> = {
  'umo8-max':   { full: '5 915 000', credit: '4 990 000' },
  'umo8-ultra': { full: '6 415 000', credit: '5 490 000' },
  'umo5-max':   { full: '3 715 000', credit: '2 790 000' },
  'umo5-pro':   { full: '3 515 000', credit: '2 590 000' },
}

const MAX_PRICE = 9_999_999

function formatPrice(val: string) {
  const digits = val.replace(/\D/g, '')
  const num = Math.min(Number(digits), MAX_PRICE)
  return digits === '' ? '' : String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function ActivePoster({ model, trim, fullPrice, creditPrice, qrSvg }: { model: Model; trim: Trim; fullPrice: string; creditPrice: string; qrSvg?: string }) {
  return <PriceCard variant={`${model}-${trim}` as Variant} fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
}

export default function App() {
  const [model, setModel] = useState<Model>('umo8')
  const [trim, setTrim] = useState<Trim>('max')
  const [fullPrice, setFullPrice] = useState(DEFAULTS['umo8-max'].full)
  const [creditPrice, setCreditPrice] = useState(DEFAULTS['umo8-max'].credit)
  const [url, setUrl] = useState(DEFAULT_URL)
  const [qrSvg, setQrSvg] = useState<string | undefined>(undefined)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(0)

  const urlValid = isValidUrl(url.trim())

  const priceNum = (s: string) => Number(s.replace(/\D/g, '')) || 0
  const MIN_CREDIT = 999_999
  const creditTooLow = priceNum(creditPrice) < MIN_CREDIT
  const fullLessThanCredit = priceNum(fullPrice) < priceNum(creditPrice)
  const pricesValid = !creditTooLow && !fullLessThanCredit

  useEffect(() => {
    const effective = urlValid ? url.trim() : DEFAULT_URL
    QRCode.toString(effective, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(raw => setQrSvg(raw.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')))
      .catch(() => setQrSvg(undefined))
  }, [url])

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
    const t: Trim = m === 'umo5' ? 'pro' : 'max'
    setModel(m); setTrim(t)
    setFullPrice(DEFAULTS[`${m}-${t}`].full)
    setCreditPrice(DEFAULTS[`${m}-${t}`].credit)
  }

  const switchTrim = (t: Trim) => {
    setTrim(t)
    setFullPrice(DEFAULTS[`${model}-${t}`].full)
    setCreditPrice(DEFAULTS[`${model}-${t}`].credit)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      ensurePdfFonts()
      const qrUrl = urlValid ? url.trim() : DEFAULT_URL
      const props = { fullPrice, creditPrice, qrUrl }
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

      {/* ── Sidebar: 240px plus the 1px outside stroke from Figma, which shows only on the right ── */}
      <aside className="flex shrink-0 flex-col md:h-full md:w-[241px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-4 p-6 tracking-[-0.01em] md:pb-2">
          <div className="flex flex-col gap-4">
            <Link to="/" className="self-start text-[14px] font-medium leading-5 tracking-normal hover:underline underline-offset-[0.25em] decoration-[0.25px]">← Бренд UMO</Link>
            <h1 className="text-[24px] font-medium leading-none">Прайс-карта</h1>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-1 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo8'} onClick={() => switchModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => switchModel('umo5')}>UMO 5</SegBtn>
              </Segments>
            </Field>

            <Field label="Комплектация">
              <Segments>
                {trimOptions.map(t => (
                  <SegBtn key={t.value} active={trim === t.value} onClick={() => switchTrim(t.value)}>{t.label}</SegBtn>
                ))}
              </Segments>
            </Field>

            <Field label="Полная цена, ₽:">
              <TextInput numeric value={fullPrice} invalid={fullLessThanCredit} onChange={v => setFullPrice(formatPrice(v))} />
            </Field>

            <Field label="В кредит, ₽:">
              <TextInput numeric value={creditPrice} invalid={creditTooLow || fullLessThanCredit} onChange={v => setCreditPrice(formatPrice(v))} />
            </Field>

            <div className="col-span-2 md:col-span-1">
              <Field label="Ссылка QR:">
                <UrlField value={url} onChange={setUrl} />
              </Field>
            </div>
          </div>
        </div>

        {/* Download — right under the fields, sticking to the bottom of the sidebar when the window is shorter than the form;
            on phones pinned to the bottom of the screen, since the preview comes below the form */}
        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!urlValid || !pricesValid}>Скачать PDF</DownloadButton>
        </div>
      </aside>

      {/* ── Poster preview ── */}
      <main className="flex flex-1 items-center justify-center bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:p-16">
        <div ref={previewRef} className="flex size-full items-center justify-center">
          {scale > 0 && (
            <div className="bg-white ring-1 ring-black/10" style={{ width: POSTER_W * scale, height: POSTER_H * scale, position: 'relative', flexShrink: 0 }}>
              <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, position: 'absolute', top: 0, left: 0 }}>
                <ActivePoster model={model} trim={trim} fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
