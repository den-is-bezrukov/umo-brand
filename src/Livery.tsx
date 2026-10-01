import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Font } from 'opentype.js'
import { Field, Segments, SegBtn, TextArea, UrlField, Checkbox, DownloadButton, isValidUrl } from '@/ui/form'
import { UMO8, SURFACES } from '@/livery/layout'
import { loadFont, buildSheet, specMarks, toD, type Sheet, type Line } from '@/livery/geometry'

// Dealer livery generator: lettering for both sides and the rear window of a dealer's demo car (Figma: UMO | Evrone,
// node 4021:2908). The preview puts the sheets on photos of the car, with the door seam and handle marked, so a
// dealer name or tagline that would run onto them shows up before the files go to the wrap shop.

const DEFAULT_URL = 'https://umo.auto/'
const RED = '#ff2a1a'

type Model = 'umo8' | 'umo5'

type View = 'car' | 'plan'

function SheetPreview({ sheet, view, seams, dims }: { sheet: Sheet; view: View; seams: boolean; dims: boolean }) {
  const s = sheet.surface
  const marks = specMarks(s)
  // The drawing is the sheet alone with its dimensions, close enough to read the numbers off the screen
  const plan = view === 'plan'
  const [vx, vy, vw, vh] = plan ? (() => {
    const xs = marks.lines.flatMap(l => [l[0], l[2]])
    const ys = marks.lines.flatMap(l => [l[1], l[3]])
    const padX = marks.size * 2.5
    const padY = marks.size * 1.5
    const x = Math.min(...xs) - padX
    const y = Math.min(...ys) - padY
    return [s.photo.x + x, s.photo.y + y, Math.max(...xs) + padX - x, Math.max(...ys) + padY - y]
  })() : s.photo.view
  const bad = (l: Line) => l.issues.length > 0
  const lines = [...sheet.dealer.lines, ...sheet.tagline.lines]
  const extra = [...sheet.dealer.lines.slice(0, -s.dealer.maxLines), ...sheet.tagline.lines.slice(0, -s.tagline.maxLines)]
  const hairline = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1, fill: 'none' }
  const anchor = { left: 'start', center: 'middle', right: 'end' } as const
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
        <span className="font-medium">{s.title}</span>
        <span className="text-[#999]">{s.w} × {s.h} мм</span>
      </figcaption>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block w-full rounded-[4px]" style={{ background: plan ? '#1a1a1a' : s.photo.background === '#000000' ? '#000' : '#e8e8e8' }}>
        {!plan && (
          <image
            href={s.photo.src}
            width={s.photo.w}
            height={s.photo.h}
            transform={s.photo.mirror ? `translate(${s.photo.w} 0) scale(-1 1)` : undefined}
          />
        )}
        <g transform={`translate(${s.photo.x} ${s.photo.y})`}>
          {plan && <rect width={s.w} height={s.h} fill="#000" />}
          {/* QR and lettering */}
          {sheet.shapes.slice(0, 3).map((cmds, i) => <path key={i} d={toD(cmds)} fill="#fff" fillRule="evenodd" />)}
          {lines.map((l, i) => (
            <path key={`t${i}`} d={toD(l.cmds)} fill={bad(l) || extra.includes(l) ? RED : '#fff'} fillRule="evenodd" />
          ))}
          {seams && (
            <g stroke={RED} opacity={0.9}>
              {/* Where the dealer name and tagline may go */}
              {[s.dealer, s.tagline].map((b, i) => {
                const top = b.baseline - b.leading * (b.maxLines - 1) - b.size * 0.85
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
          {/* The spec's dimensions */}
          {(dims || plan) && (
            <g>
              {marks.lines.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={RED} {...hairline} />)}
              {marks.labels.map((l, i) => (
                <text key={i} x={l.x} y={l.y} textAnchor={anchor[l.align]} fontSize={marks.size} fontFamily="Helvetica, Arial, sans-serif" fontWeight={700} fill={RED}>{l.text}</text>
              ))}
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
  const [dealer, setDealer] = useState('Автодом\nЦентр UMO')
  const [tagline, setTagline] = useState('Попробуй гибрид с технологиями Яндекса')
  // Text of its own on the rear window; filled from the sides the first time it's turned on
  const [ownRear, setOwnRear] = useState(false)
  const [rear, setRear] = useState<{ dealer: string; tagline: string }>()
  const [url, setUrl] = useState(DEFAULT_URL)
  const [view, setView] = useState<View>('car')
  const [seams, setSeams] = useState(false)
  const [dims, setDims] = useState(false)
  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Ливрея UMO'
    return () => { document.title = prev }
  }, [])

  const urlValid = isValidUrl(url.trim())
  const qrUrl = urlValid ? url.trim() : DEFAULT_URL

  const rearText = ownRear && rear ? rear : { dealer, tagline }
  const sheets = useMemo(
    () => font ? SURFACES.map(id => buildSheet(font, UMO8[id], { ...(id === 'rear' ? rearText : { dealer, tagline }), url: qrUrl })) : [],
    [font, dealer, tagline, rearText.dealer, rearText.tagline, qrUrl],
  )
  // Which sheets a field's text goes on, to mark it when one of them has a problem with it
  const sides = ownRear ? sheets.slice(0, 2) : sheets
  const rearSheet = sheets.slice(2)

  const toggleOwnRear = (on: boolean) => {
    if (on && !rear) setRear({ dealer: dealer.replace(/\s*\n\s*/g, ' '), tagline })
    setOwnRear(on)
  }
  const ok = sheets.length > 0 && sheets.every(s => s.issues.length === 0)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { liveryZip } = await import('@/livery/pdf')
      const prefix = model === 'umo8' ? 'UMO8' : 'UMO5'
      const blob = await liveryZip(prefix, sheets)
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
            <h1 className="text-[24px] font-medium leading-none">Ливрея</h1>
          </div>

          <div className="grid grid-cols-1 gap-y-2 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo8'} onClick={() => setModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => setModel('umo5')} disabled title="Скоро">UMO 5</SegBtn>
              </Segments>
            </Field>

            <Field label="Дилер:">
              <TextArea value={dealer} onChange={setDealer} invalid={sides.some(s => s.dealer.issues.length > 0) || !dealer.trim()} />
            </Field>

            <Field label="Теглайн:">
              <TextArea value={tagline} onChange={setTagline} invalid={sides.some(s => s.tagline.issues.length > 0) || !tagline.trim()} />
            </Field>

            <Checkbox checked={ownRear} onChange={toggleOwnRear}>Свой текст на стекле</Checkbox>

            {ownRear && rear && (
              <>
                <Field label="Дилер на стекле:">
                  <TextArea value={rear.dealer} onChange={v => setRear({ ...rear, dealer: v })} invalid={rearSheet.some(s => s.dealer.issues.length > 0) || !rear.dealer.trim()} />
                </Field>

                <Field label="Теглайн на стекле:">
                  <TextArea value={rear.tagline} onChange={v => setRear({ ...rear, tagline: v })} invalid={rearSheet.some(s => s.tagline.issues.length > 0) || !rear.tagline.trim()} />
                </Field>
              </>
            )}

            <Field label="Ссылка QR:">
              <UrlField value={url} onChange={setUrl} />
            </Field>

            <Field label="Вид">
              <Segments>
                <SegBtn active={view === 'car'} onClick={() => setView('car')}>На машине</SegBtn>
                <SegBtn active={view === 'plan'} onClick={() => setView('plan')}>Чертёж</SegBtn>
              </Segments>
            </Field>

            <div className="flex gap-6">
              <Checkbox checked={seams} onChange={setSeams}>Швы</Checkbox>
              {/* The drawing always has them */}
              {view === 'car' && <Checkbox checked={dims} onChange={setDims}>Размеры</Checkbox>}
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok || !urlValid}>Скачать ZIP</DownloadButton>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
          {sheets.slice(0, 2).map(s => <SheetPreview key={s.surface.id} sheet={s} view={view} seams={seams} dims={dims} />)}
          {sheets[2] && (
            <div className={view === 'plan' ? 'w-full' : 'w-full md:w-1/2'}>
              <SheetPreview sheet={sheets[2]} view={view} seams={seams} dims={dims} />
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
