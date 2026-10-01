import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import svgPaths from '@/icons/ui'
import PriceCard from '@/posters/PriceCard'
import PriceCardPdf from '@/posters/pdf/PriceCardPdf'
import { ensurePdfFonts } from '@/posters/pdf/pdfFonts'
import type { Variant } from '@/posters/cardData'

const POSTER_W = 1754
const POSTER_H = 2480
const DEFAULT_URL = 'https://umo.auto/'

function isValidUrl(v: string): boolean {
  if (!v.trim()) return false
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname
    if (!host || host.includes(' ')) return false
    if (!host.includes('.')) return false
    if (host.startsWith('.') || host.endsWith('.')) return false
    const parts = host.split('.')
    const tld = parts[parts.length - 1]
    if (tld.length < 2) return false
    // each label must be non-empty and contain only valid chars
    if (parts.some(p => p.length === 0 || /[^a-zA-Z0-9\-_]/.test(p))) return false
    return true
  } catch {
    return false
  }
}

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

// Light UI per the Figma layout (UMO | Evrone, node 4844:6864), matching the brand guide.

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 min-w-0 flex items-center justify-center rounded-[4px] border px-3 py-[9px] cursor-pointer outline-none
        focus-visible:ring-2 focus-visible:ring-black/30
        ${active ? 'border-black' : 'border-transparent hover:border-black/20'}`}
    >
      <span className="font-medium text-[14px] leading-5 text-black whitespace-nowrap">{children}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="py-2 text-[14px] leading-5 text-[#999] whitespace-nowrap">{label}</p>
      {children}
    </div>
  )
}

function Segments({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-[4px] bg-[#f5f5f5]">{children}</div>
}

function TextInput({ value, onChange, onBlur, placeholder, invalid, numeric, className = '' }: { value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; invalid?: boolean; numeric?: boolean; className?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => onBlur?.()}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      inputMode={numeric ? 'numeric' : undefined}
      pattern={numeric ? '[0-9 ]*' : undefined}
      className={`h-10 w-full min-w-0 rounded-[4px] bg-[#f5f5f5] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]
        ${invalid ? 'ring-1 ring-inset ring-[#e30]' : 'focus:ring-1 focus:ring-inset focus:ring-black'} ${className}`}
    />
  )
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
  const [urlBlurred, setUrlBlurred] = useState(false)
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

  const urlError = urlBlurred && url.trim() !== '' && !urlValid

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
                <div className="relative">
                  <TextInput
                    className="pr-9"
                    value={url}
                    onChange={v => { setUrl(v); setUrlBlurred(false) }}
                    invalid={urlError}
                    onBlur={() => {
                      setUrlBlurred(true)
                      const v = url.trim()
                      if (v && !/^https?:\/\//i.test(v)) { setUrl('https://' + v); setUrlBlurred(false) }
                    }}
                    placeholder="https://..."
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center">
                    {urlValid ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Ссылка в порядке">
                        <path d={svgPaths.p3de7e600} stroke="#00C950" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45833" />
                      </svg>
                    ) : urlError ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Проверьте ссылку">
                        <circle cx="7" cy="7" r="6" stroke="#e30" strokeWidth="1.4" />
                        <line x1="7" y1="4" x2="7" y2="7.5" stroke="#e30" strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="7" cy="9.5" r="0.7" fill="#e30" />
                      </svg>
                    ) : null}
                  </div>
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* Download — right under the fields, sticking to the bottom of the sidebar when the window is shorter than the form;
            on phones pinned to the bottom of the screen, since the preview comes below the form */}
        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !urlValid || !pricesValid}
            className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-black p-3 text-[16px] font-medium leading-none tracking-[-0.01em] text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#333]"
          >
            {exporting && (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {exporting ? 'Генерация…' : 'Скачать PDF'}
          </button>
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
