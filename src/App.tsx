import { useState, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import svgPaths from '@/imports/App/svg-pzn2qwx547'
import Umo8Max from '@/posters/Umo8MaxCard'
import Umo8Ultra from '@/posters/Umo8UltraCard'
import Umo5Max from '@/posters/Umo5MaxCard'
import Umo5Pro from '@/posters/Umo5ProCard'
import Umo8MaxPdf from '@/posters/pdf/Umo8MaxPdf'
import Umo8UltraPdf from '@/posters/pdf/Umo8UltraPdf'
import Umo5MaxPdf from '@/posters/pdf/Umo5MaxPdf'
import Umo5ProPdf from '@/posters/pdf/Umo5ProPdf'
import { ensurePdfFonts } from '@/posters/pdf/pdfFonts'

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
  'umo8-max':   { full: '6 515 000', credit: '5 000 000' },
  'umo8-ultra': { full: '6 515 000', credit: '5 000 000' },
  'umo5-max':   { full: '3 715 000', credit: '2 790 000' },
  'umo5-pro':   { full: '3 515 000', credit: '2 590 000' },
}

const MAX_PRICE = 9_999_999

function formatPrice(val: string) {
  const digits = val.replace(/\D/g, '')
  const num = Math.min(Number(digits), MAX_PRICE)
  return digits === '' ? '' : String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 flex items-center justify-center px-3 py-3 xs:px-5 xs:min-w-[90px] cursor-pointer transition-colors outline-none
        focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset
        ${active
          ? 'bg-[#606066] hover:bg-[#72727a]'
          : 'bg-[#303033] hover:bg-[#3e3e42]'
        }`}
    >
      <span className={`font-['Geist',sans-serif] font-semibold text-[14px] leading-5 whitespace-nowrap ${active ? 'text-white' : 'text-[#969699]'}`}>
        {children}
      </span>
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="font-['Geist',sans-serif] font-normal text-[14px] leading-5 text-[#969699] whitespace-nowrap">{children}</p>
    </div>
  )
}

function DarkInput({ value, onChange, onBlur, placeholder, invalid, numeric }: { value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; invalid?: boolean; numeric?: boolean }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className={`min-w-0 w-full xs:min-w-[180px] border-l-2 transition-colors ${
      invalid   ? 'border-red-500 bg-[#2d1a1a]' :
      focused   ? 'border-white/60 bg-[#3e3e42]' :
                  'border-transparent bg-[#303033] hover:bg-[#3a3a3e]'
    }`}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); onBlur?.() }}
        placeholder={placeholder}
        inputMode={numeric ? 'numeric' : undefined}
        pattern={numeric ? '[0-9 ]*' : undefined}
        className="bg-transparent font-['Geist',sans-serif] font-normal text-[14px] leading-5 text-white w-full p-3 outline-none placeholder:text-[#969699]"
      />
    </div>
  )
}

function ActivePoster({ model, trim, fullPrice, creditPrice, qrSvg }: { model: Model; trim: Trim; fullPrice: string; creditPrice: string; qrSvg?: string }) {
  if (model === 'umo8' && trim === 'max')   return <Umo8Max   fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
  if (model === 'umo8' && trim === 'ultra') return <Umo8Ultra fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
  if (model === 'umo5' && trim === 'max')   return <Umo5Max   fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
  if (model === 'umo5' && trim === 'pro')   return <Umo5Pro   fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
  return null
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
  const [scale, setScale] = useState(0.3)

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
    const compute = () => setScale(Math.min((window.innerWidth - 48) / POSTER_W, 0.48))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
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
      const doc =
        model === 'umo8' && trim === 'max'   ? <Umo8MaxPdf   {...props} /> :
        model === 'umo8' && trim === 'ultra' ? <Umo8UltraPdf {...props} /> :
        model === 'umo5' && trim === 'max'   ? <Umo5MaxPdf   {...props} /> :
                                               <Umo5ProPdf   {...props} />
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

  const trims8: { value: Trim; label: string }[] = [{ value: 'max', label: 'Макс' }, { value: 'ultra', label: 'Ультра' }]
  const trims5: { value: Trim; label: string }[] = [{ value: 'pro', label: 'Про' }, { value: 'max', label: 'Макс' }]
  const trimOptions = model === 'umo8' ? trims8 : trims5

  return (
    <div className="bg-black min-h-screen flex flex-col">

      {/* ── Toolbar ── */}
      <div className="bg-black sticky top-0 z-50 w-full">
        <div className="flex flex-col gap-3 p-6">

          {/* Title */}
          <p className="font-['Geist',sans-serif] font-semibold text-[24px] leading-none text-white">Прайс-карта</p>

          {/* Controls — 2-col grid on mobile (<sm), flex-wrap on wider */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">

            {/* Model */}
            <div className="flex flex-col justify-center">
              <FieldLabel>Модель</FieldLabel>
              <div className="flex">
                <SegBtn active={model === 'umo8'} onClick={() => switchModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => switchModel('umo5')}>UMO 5</SegBtn>
              </div>
            </div>

            {/* Trim */}
            <div className="flex flex-col justify-center">
              <FieldLabel>Комплектация</FieldLabel>
              <div className="flex">
                {trimOptions.map(t => (
                  <SegBtn key={t.value} active={trim === t.value} onClick={() => switchTrim(t.value)}>{t.label}</SegBtn>
                ))}
              </div>
            </div>

            {/* Full price */}
            <div className="flex flex-col justify-center">
              <FieldLabel>Полная цена, ₽:</FieldLabel>
              <DarkInput numeric value={fullPrice} invalid={fullLessThanCredit} onChange={v => setFullPrice(formatPrice(v))} />
            </div>

            {/* Credit price */}
            <div className="flex flex-col justify-center">
              <FieldLabel>В кредит, ₽:</FieldLabel>
              <DarkInput numeric value={creditPrice} invalid={creditTooLow || fullLessThanCredit} onChange={v => setCreditPrice(formatPrice(v))} />
            </div>

            {/* QR URL — full width on mobile */}
            <div className="col-span-2 sm:col-auto flex flex-col justify-center">
              <FieldLabel>Ссылка QR:</FieldLabel>
              <div className="flex items-center w-full xs:min-w-[272px]">
                <div className="flex-1 min-w-0 -mr-[34px]">
                  <DarkInput
                    value={url}
                    onChange={v => { setUrl(v); setUrlBlurred(false) }}
                    invalid={urlBlurred && url.trim() !== '' && !urlValid}
                    onBlur={() => {
                      setUrlBlurred(true)
                      const v = url.trim()
                      if (v && !/^https?:\/\//i.test(v)) { setUrl('https://' + v); setUrlBlurred(false) }
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div className="shrink-0 size-[34px] relative z-10 flex items-center justify-center">
                  {urlValid ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d={svgPaths.p3de7e600} stroke="#00C950" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45833" />
                    </svg>
                  ) : urlBlurred && url.trim() !== '' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.4" />
                      <line x1="7" y1="4" x2="7" y2="7.5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="7" cy="9.5" r="0.7" fill="#ef4444" />
                    </svg>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Download button — full width on mobile */}
            <div className="col-span-2 sm:col-auto flex flex-col justify-end pt-3">
              <button
                onClick={handleExport}
                disabled={exporting || !urlValid || !pricesValid}
                className="w-full sm:w-auto bg-white flex items-center justify-center gap-2 px-5 py-3 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[#e0e0e0] active:enabled:bg-[#cacaca]"
              >
                {exporting ? (
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d={svgPaths.p3c0592d0} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    <path d={svgPaths.p581d980}  stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    <path d="M7.5 9.375V1.875" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                  </svg>
                )}
                <span className="font-['Geist',sans-serif] font-medium text-[14px] leading-5 text-black whitespace-nowrap">
                  {exporting ? 'Генерация…' : 'Скачать PDF'}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Poster preview ── */}
      <div className="flex-1 flex justify-center p-6">
        <div style={{ width: POSTER_W * scale, height: POSTER_H * scale, position: 'relative', flexShrink: 0 }}>
          <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, position: 'absolute', top: 0, left: 0 }}>
            <ActivePoster model={model} trim={trim} fullPrice={fullPrice} creditPrice={creditPrice} qrSvg={qrSvg} />
          </div>
        </div>
      </div>

    </div>
  )
}
