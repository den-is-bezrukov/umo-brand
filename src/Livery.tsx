import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Font } from 'opentype.js'
import { Field, OptionalField, Segments, SegBtn, TextArea, UrlField, Checkbox, SizeSwitch, DownloadButton, isValidUrl } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'
import { LIVERIES, SURFACES, withoutQr, type Model } from '@/livery/layout'
import { loadFont, buildSheet, specMarks, toD, mm, type Sheet, type Line } from '@/livery/geometry'

// Dealer livery generator: lettering for both sides and the rear window of a dealer's demo car (Figma: UMO | Evrone,
// node 4021:2908). The preview puts the sheets on photos of the car, with the door seam and handle marked, so a
// dealer name or tagline that would run onto them shows up before the files go to the wrap shop.

const DEFAULT_URL = 'https://umo.auto/'
const DEFAULT_TOP = 'Автодом\nЦентр UMO'
// The tagline offered by default names what each model is
const DEFAULT_BOTTOM: Record<Model, string> = {
  umo8: 'Попробуй гибрид с технологиями Яндекса',
  umo5: 'Попробуй электрокар с технологиями Яндекса',
}

// The parts that can be left out, as the `off` link parameter names them
const PARTS = { qr: 'qr', dealer: 'top', tagline: 'bottom', rear: 'rear' } as const
const RED = '#ff2a1a'

function SheetPreview({ sheet, seams, dims }: { sheet: Sheet; seams: boolean; dims: boolean }) {
  const s = sheet.surface
  const marks = specMarks(s)
  const [vx, vy, vw, vh] = s.photo.view
  const bad = (l: Line) => l.issues.length > 0
  const lines = [...sheet.dealer.lines, ...sheet.tagline.lines]
  const hairline = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1, fill: 'none' }
  const anchor = { left: 'start', center: 'middle', right: 'end' } as const
  // White decals on UMO 8 and on glass, black on the white UMO 5's sides
  const decal = s.decal ?? '#fff'
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
        <span className="font-medium">{s.title}</span>
        <span className="text-[#999]">{mm(s.w)} × {mm(s.h)} мм</span>
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
          {sheet.fixed.map((cmds, i) => <path key={i} d={toD(cmds)} fill={decal} fillRule="evenodd" />)}
          {lines.map((l, i) => (
            <path key={`t${i}`} d={toD(l.cmds)} fill={bad(l) || l.extra ? RED : decal} fillRule="evenodd" />
          ))}
          {seams && (
            <g stroke={RED} opacity={0.9}>
              {s.obstacles.map((o, i) =>
                o.kind === 'seam'
                  ? <line key={i} x1={o.top[0]} y1={o.top[1]} x2={o.bottom[0]} y2={o.bottom[1]} {...hairline} strokeWidth={2} />
                  : <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.h / 2} {...hairline} strokeWidth={2} />,
              )}
            </g>
          )}
          {/* The spec's dimensions */}
          {dims && (
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
  // Settings come from the link the page was opened with (see `useLinkState` below), defaults for the rest
  const [link] = useState(linkParams)
  const [model, setModel] = useState<Model>(link.get('model') === 'umo5' ? 'umo5' : 'umo8')
  const [dealer, setDealer] = useState(link.get('top') ?? DEFAULT_TOP)
  const [tagline, setTagline] = useState(() => link.get('bottom') ?? DEFAULT_BOTTOM[model])
  // Text of its own on the rear window; filled from the sides the first time it's turned on
  const [ownRear, setOwnRear] = useState(link.has('rtop') || link.has('rbottom'))
  const [rear, setRear] = useState<{ dealer: string; tagline: string } | undefined>(() =>
    link.has('rtop') || link.has('rbottom')
      ? { dealer: link.get('rtop') ?? dealer.replace(/\s*\n\s*/g, ' '), tagline: link.get('rbottom') ?? tagline }
      : undefined)
  const [url, setUrl] = useState(link.get('link') ?? DEFAULT_URL)
  // What goes into the files; a part that's off is in neither the preview, nor the decals, nor the spec
  const [on, setOn] = useState(() => {
    const off = (link.get('off') ?? '').split(',')
    return { qr: !off.includes(PARTS.qr), tagline: !off.includes(PARTS.tagline), dealer: !off.includes(PARTS.dealer), rear: !off.includes(PARTS.rear) }
  })
  const toggle = (key: keyof typeof on) => (v: boolean) => setOn(o => ({ ...o, [key]: v }))
  const show = (link.get('show') ?? '').split(',')
  const [seams, setSeams] = useState(show.includes('seams'))
  const [dims, setDims] = useState(show.includes('dims'))
  // The bottom text larger, 60 mm in two lines; the QR-less sides have room for it
  const [large, setLarge] = useState(link.get('size') === 'large')

  // Another model brings its own default tagline, unless the field holds text of the dealer's own
  const chooseModel = (m: Model) => {
    if (tagline === DEFAULT_BOTTOM[model]) setTagline(DEFAULT_BOTTOM[m])
    if (rear && rear.tagline === DEFAULT_BOTTOM[model]) setRear({ ...rear, tagline: DEFAULT_BOTTOM[m] })
    setModel(m)
  }
  // The larger tagline is a choice only where the QR-less sides have one (both models do)
  const layout = LIVERIES[model]
  const noQrSide = layout.left.noQr
  const canLarge = noQrSide.kind === 'layout' && !!noQrSide.taglineLarge

  useLinkState({
    model: model === 'umo8' ? null : model,
    link: url.trim() === DEFAULT_URL ? null : url.trim(),
    top: dealer === DEFAULT_TOP ? null : dealer,
    bottom: tagline === DEFAULT_BOTTOM[model] ? null : tagline,
    off: (Object.keys(PARTS) as (keyof typeof PARTS)[]).filter(k => !on[k]).map(k => PARTS[k]).join(','),
    rtop: ownRear && rear ? rear.dealer : null,
    rbottom: ownRear && rear ? rear.tagline : null,
    show: [...(dims ? ['dims'] : []), ...(seams ? ['seams'] : [])].join(','),
    size: large ? 'large' : null,
  })
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

  // The rear window's own text is offered while the rear window and some text are on
  const ownRearOffered = on.rear && (on.dealer || on.tagline)
  const ownRearOn = ownRearOffered && ownRear && !!rear
  const pick = (t: { dealer: string; tagline: string }) => ({ dealer: on.dealer ? t.dealer : null, tagline: on.tagline ? t.tagline : null })
  const sideText = pick({ dealer, tagline })
  const rearText = ownRearOn ? pick(rear!) : sideText
  const qr = on.qr ? qrUrl : null
  const sheets = useMemo(
    () => font
      ? SURFACES.filter(id => id !== 'rear' || on.rear).map(id => buildSheet(font, qr ? layout[id] : withoutQr(layout[id]), { ...(id === 'rear' ? rearText : sideText), url: qr, large }))
      : [],
    [font, layout, on.rear, sideText.dealer, sideText.tagline, rearText.dealer, rearText.tagline, qr, large],
  )
  // Which sheets a field's text goes on, to mark it when one of them has a problem with it
  const sides = sheets.filter(s => s.surface.id !== 'rear' || !ownRearOn)
  const rearSheet = ownRearOn ? sheets.filter(s => s.surface.id === 'rear') : []

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

          <div className="flex flex-col gap-4 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo8'} onClick={() => chooseModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => chooseModel('umo5')}>UMO 5</SegBtn>
              </Segments>
            </Field>

            <OptionalField label="QR-код" on={on.qr} onChange={toggle('qr')}>
              <UrlField value={url} onChange={setUrl} />
            </OptionalField>

            <OptionalField label="Текст сверху" on={on.dealer} onChange={toggle('dealer')}>
              <TextArea value={dealer} onChange={setDealer} invalid={sides.some(s => s.dealer.issues.length > 0) || !dealer.trim()} />
            </OptionalField>

            <OptionalField
              label="Текст снизу"
              on={on.tagline}
              onChange={toggle('tagline')}
              extra={<SizeSwitch large={large && !on.qr && canLarge} onChange={setLarge} disabled={on.qr || !canLarge} title={on.qr ? 'Крупный текст — на бортах без QR-кода' : !canLarge ? 'У этой модели один размер текста' : undefined} />}
            >
              <TextArea value={tagline} onChange={setTagline} invalid={sides.some(s => s.tagline.issues.length > 0) || !tagline.trim()} />
            </OptionalField>

            <OptionalField label="Заднее стекло" on={on.rear} onChange={toggle('rear')} />

            {ownRearOffered && <Checkbox checked={ownRear} onChange={toggleOwnRear}>Другой текст на стекле</Checkbox>}

            {ownRearOn && on.dealer && (
              <Field label="Текст сверху на стекле">
                <TextArea value={rear!.dealer} onChange={v => setRear({ ...rear!, dealer: v })} invalid={rearSheet.some(s => s.dealer.issues.length > 0) || !rear!.dealer.trim()} />
              </Field>
            )}

            {ownRearOn && on.tagline && (
              <Field label="Текст снизу на стекле">
                <TextArea value={rear!.tagline} onChange={v => setRear({ ...rear!, tagline: v })} invalid={rearSheet.some(s => s.tagline.issues.length > 0) || !rear!.tagline.trim()} />
              </Field>
            )}

            {/* Overlays on the preview only */}
            <Checkbox checked={dims} onChange={setDims}>Размеры</Checkbox>
            <Checkbox checked={seams} onChange={setSeams}>Швы</Checkbox>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky">
          <div className="flex gap-2">
            <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok || (on.qr && !urlValid)}>Скачать ZIP</DownloadButton>
            {/* <CopyLinkButton /> — hidden for now; the address already carries the settings */}
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
          {sheets.slice(0, 2).map(s => <SheetPreview key={s.surface.id} sheet={s} seams={seams} dims={dims} />)}
          {sheets[2] && (
            <div className="w-full md:w-1/2">
              <SheetPreview sheet={sheets[2]} seams={seams} dims={dims} />
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
