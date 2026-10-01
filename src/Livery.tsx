import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Font } from 'opentype.js'
import { Field, Segments, SegBtn, TextArea, UrlField, DownloadButton, isValidUrl } from '@/ui/form'
import { UMO8, SURFACES } from '@/livery/layout'
import { loadFont, buildSheet, toD, type Sheet, type Line } from '@/livery/geometry'

// Dealer livery generator: lettering for both sides and the rear window of a dealer's demo car (Figma: UMO | Evrone,
// node 4021:2908). The preview puts the sheets on photos of the car, with the door seam and handle marked, so a
// dealer name or tagline that would run onto them shows up before the files go to the wrap shop.

const DEFAULT_URL = 'https://umo.auto/'
const RED = '#ff2a1a'

type Model = 'umo8' | 'umo5'

function SheetPreview({ sheet, guides }: { sheet: Sheet; guides: boolean }) {
  const s = sheet.surface
  const [vx, vy, vw, vh] = s.photo.view
  const bad = (l: Line) => l.issues.length > 0
  const lines = [...sheet.dealer.lines, ...sheet.tagline.lines]
  const extra = [...sheet.dealer.lines.slice(s.dealer.maxLines), ...sheet.tagline.lines.slice(s.tagline.maxLines)]
  const hairline = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1, fill: 'none' }
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
        <span className="font-medium">{s.title}</span>
        <span className="text-[#999]">{s.w} × {s.h} мм</span>
      </figcaption>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block w-full rounded-[4px]" style={{ background: s.photo.background === '#000000' ? '#000' : '#e8e8e8' }}>
        <image
          href={s.photo.src}
          width={s.photo.w}
          height={s.photo.h}
          transform={s.photo.mirror ? `translate(${s.photo.w} 0) scale(-1 1)` : undefined}
        />
        <g transform={`translate(${s.photo.x} ${s.photo.y})`}>
          {/* QR and lettering */}
          {sheet.shapes.slice(0, 3).map((cmds, i) => <path key={i} d={toD(cmds)} fill="#fff" fillRule="evenodd" />)}
          {lines.map((l, i) => (
            <path key={`t${i}`} d={toD(l.cmds)} fill={bad(l) || extra.includes(l) ? RED : '#fff'} fillRule="evenodd" />
          ))}
          {guides && (
            <g stroke={RED} opacity={0.9}>
              <rect width={s.w} height={s.h} {...hairline} strokeDasharray="4 4" />
              {/* Where the dealer name and tagline may go */}
              {[s.dealer, s.tagline].map((b, i) => {
                const top = b.baseline - b.size * 0.85
                const h = b.leading * (b.maxLines - 1) + b.size * 1.1
                return <rect key={i} x={b.align === 'left' ? b.x : b.x - b.maxWidth} y={top} width={b.maxWidth} height={h} {...hairline} strokeDasharray="2 3" opacity={0.6} />
              })}
              {s.obstacles.map((o, i) =>
                o.kind === 'seam'
                  ? <line key={i} x1={o.top[0]} y1={o.top[1]} x2={o.bottom[0]} y2={o.bottom[1]} {...hairline} strokeWidth={2} />
                  : <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.h / 2} {...hairline} strokeWidth={2} />,
              )}
            </g>
          )}
        </g>
      </svg>
      {sheet.issues.length > 0 && (
        <ul className="text-[13px] leading-5 text-[#e30]">
          {sheet.issues.map(t => <li key={t}>{t}</li>)}
        </ul>
      )}
    </figure>
  )
}

export default function Livery() {
  const [model, setModel] = useState<Model>('umo8')
  const [dealer, setDealer] = useState('Центр UMO | Автодом')
  const [tagline, setTagline] = useState('Попробуй гибрид с технологиями Яндекса')
  const [url, setUrl] = useState(DEFAULT_URL)
  const [guides, setGuides] = useState(true)
  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Ливрея дилера UMO'
    return () => { document.title = prev }
  }, [])

  const urlValid = isValidUrl(url.trim())
  const qrUrl = urlValid ? url.trim() : DEFAULT_URL

  const sheets = useMemo(
    () => font ? SURFACES.map(id => buildSheet(font, UMO8[id], { dealer, tagline, url: qrUrl })) : [],
    [font, dealer, tagline, qrUrl],
  )
  const ok = sheets.length > 0 && sheets.every(s => s.issues.length === 0)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { liveryZip } = await import('@/livery/pdf')
      const prefix = model === 'umo8' ? 'UMO8' : 'UMO5'
      const blob = await liveryZip(prefix, sheets.slice(0, 2), sheets[2])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${prefix}_dealer-livery.zip`
      link.click()
      URL.revokeObjectURL(link.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="flex shrink-0 flex-col md:h-full md:w-[241px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-4 p-6 tracking-[-0.01em] md:pb-2">
          <div className="flex flex-col gap-4">
            <Link to="/" className="self-start text-[14px] font-medium leading-5 tracking-normal hover:underline underline-offset-[0.25em] decoration-[0.25px]">← Бренд UMO</Link>
            <h1 className="text-[24px] font-medium leading-none">Ливрея дилера</h1>
          </div>

          <div className="grid grid-cols-1 gap-y-2 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo8'} onClick={() => setModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => setModel('umo5')} disabled title="Скоро">UMO 5</SegBtn>
              </Segments>
            </Field>

            <Field label="Дилер:">
              <TextArea value={dealer} onChange={setDealer} invalid={sheets.some(s => s.dealer.issues.length > 0) || !dealer.trim()} />
            </Field>

            <Field label="Теглайн:">
              <TextArea value={tagline} onChange={setTagline} invalid={sheets.some(s => s.tagline.issues.length > 0) || !tagline.trim()} />
            </Field>

            <Field label="Ссылка QR:">
              <UrlField value={url} onChange={setUrl} />
            </Field>

            <label className="flex cursor-pointer items-center gap-2 py-2 text-[14px] leading-5">
              <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} className="size-4 accent-black" />
              Швы и границы
            </label>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok || !urlValid}>Скачать ZIP</DownloadButton>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
          {sheets.slice(0, 2).map(s => <SheetPreview key={s.surface.id} sheet={s} guides={guides} />)}
          {sheets[2] && (
            <div className="w-full md:w-1/2">
              <SheetPreview sheet={sheets[2]} guides={guides} />
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
