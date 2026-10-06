import { useEffect, useMemo, useState } from 'react'
import type { Font } from 'opentype.js'
import { Field, OptionalField, Segments, SegBtn, ComboField, UrlField, Checkbox, SizeSwitch, RowAction, GeneratorHeader, LinkButtons, DownloadButton, isValidUrl } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'
import { DEFAULT_TAGLINE, TAGLINES } from '@/data/taglines'
import { LIVERIES, SURFACES, withoutQr, smallQr, type Model } from '@/livery/layout'
import { loadFont, buildSheet, specMarks, toD, mm, type Sheet, type Line } from '@/livery/geometry'

// Dealer livery generator: lettering for both sides and the rear window of a dealer's demo car (Figma: UMO | Evrone,
// node 4021:2908). The preview puts the sheets on photos of the car, with the door seam and handle marked, so a
// dealer name or tagline that would run onto them shows up before the files go to the wrap shop.

/** The QR leads to the model's own page unless another link is set, as on the price card */
const DEFAULT_URL: Record<Model, string> = { umo8: 'https://umo.auto/umo8', umo5: 'https://umo.auto/umo5' }
const DEFAULT_TOP = 'Центр UMO'

// The parts that can be left out, as the `off` link parameter names them
const PARTS = { qr: 'qr', dealer: 'top', tagline: 'bottom', rear: 'rear', rearDealer: 'rdealer', rearTagline: 'rslogan' } as const
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
  const [tagline, setTagline] = useState(() => link.get('bottom') ?? DEFAULT_TAGLINE[model])
  // The rear window's slogan follows the sides' until it's edited (as the price card's credit price follows the full
  // one); the dealer there is always the sides' (one line), only left off or not: there's no reason for it to differ.
  // Links from when it could carry its own (`rtop`) open with the sides'.
  const [rearTagline, setRearTagline] = useState<string | undefined>(() => link.get('rbottom') ?? undefined)
  const [url, setUrl] = useState(link.get('link') ?? DEFAULT_URL[model])
  // What goes into the files; a part that's off is in neither the preview, nor the decals, nor the spec
  const [on, setOn] = useState(() => {
    const off = (link.get('off') ?? '').split(',')
    return { qr: !off.includes(PARTS.qr), tagline: !off.includes(PARTS.tagline), dealer: !off.includes(PARTS.dealer), rear: !off.includes(PARTS.rear), rearDealer: !off.includes(PARTS.rearDealer), rearTagline: !off.includes(PARTS.rearTagline) }
  })
  const toggle = (key: keyof typeof on) => (v: boolean) => setOn(o => ({ ...o, [key]: v }))
  const show = (link.get('show') ?? '').split(',')
  // The «Швы» overlay is hidden for now: the limits keep text off the seam and handle, and a sheet that touches them
  // says so under it. Off, and links with `show=seams` open without it, as there'd be no way to turn it off.
  // const [seams, setSeams] = useState(show.includes('seams'))
  const seams = false
  const [dims, setDims] = useState(show.includes('dims'))
  // The bottom text larger, 60 mm in two lines; the QR-less sides have room for it
  const [large, setLarge] = useState(link.get('size') === 'large')
  // The sides' QR as tall as the lettering, behind it; the rear window keeps its own
  const [qrSmall, setQrSmall] = useState(link.get('qr') === 'small')

  // Another model brings its own tagline in place of the old model's suggestion (the default or the one without
  // «Попробуй»), unless the field holds text of the dealer's own
  const chooseModel = (m: Model) => {
    const swap = (t: string) => { const i = TAGLINES[model].indexOf(t); return i < 0 ? t : TAGLINES[m][i] }
    setTagline(swap(tagline))
    if (rearTagline !== undefined) setRearTagline(swap(rearTagline))
    if (url.trim() === DEFAULT_URL[model]) setUrl(DEFAULT_URL[m])
    setModel(m)
  }
  // The larger tagline is a choice only where the QR-less sides have one (both models do)
  const layout = LIVERIES[model]
  const noQrSide = layout.left.noQr
  const canLarge = noQrSide.kind === 'layout' && !!noQrSide.taglineLarge

  // The rear window's own slogan, once edited apart from the sides'
  const ownRearOn = on.rear && on.tagline && on.rearTagline && rearTagline !== undefined && rearTagline !== tagline
  useLinkState({
    model: model === 'umo8' ? null : model,
    link: url.trim() === DEFAULT_URL[model] ? null : url.trim(),
    top: dealer === DEFAULT_TOP ? null : dealer,
    bottom: tagline === DEFAULT_TAGLINE[model] ? null : tagline,
    off: (Object.keys(PARTS) as (keyof typeof PARTS)[]).filter(k => !on[k]).map(k => PARTS[k]).join(','),
    rbottom: ownRearOn ? rearTagline : null,
    show: [...(dims ? ['dims'] : []), ...(seams ? ['seams'] : [])].join(','),
    size: large ? 'large' : null,
    qr: qrSmall ? 'small' : null,
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
  const qrUrl = urlValid ? url.trim() : DEFAULT_URL[model]

  const sideText = { dealer: on.dealer ? dealer : null, tagline: on.tagline ? tagline : null }
  const rearText = {
    dealer: on.rearDealer ? sideText.dealer : null,
    tagline: !on.rearTagline ? null : ownRearOn ? rearTagline! : sideText.tagline,
  }
  const qr = on.qr ? qrUrl : null
  const sheets = useMemo(
    () => font
      ? SURFACES.filter(id => id !== 'rear' || on.rear).map(id => {
        const surface = !qr ? withoutQr(layout[id]) : qrSmall && id !== 'rear' ? smallQr(layout[id]) : layout[id]
        return buildSheet(font, surface, { ...(id === 'rear' ? rearText : sideText), url: qr, large })
      })
      : [],
    [font, layout, on.rear, sideText.dealer, sideText.tagline, rearText.dealer, rearText.tagline, qr, qrSmall, large],
  )
  // Which sheets a field's text goes on, to mark it when one of them has a problem with it
  const sloganSheets = sheets.filter(s => s.surface.id !== 'rear' || !ownRearOn)
  const rearSheet = ownRearOn ? sheets.filter(s => s.surface.id === 'rear') : []
  // The rear window's options: there are some while the sides carry a text, opened by «Изменить» and kept shown while
  // something differs from the sides, so nothing set apart from them is hidden; «По умолчанию» puts them back and folds
  const rearOptions = on.dealer || on.tagline
  const rearCustom = (on.dealer && !on.rearDealer) || (on.tagline && (!on.rearTagline || ownRearOn))
  const [rearOpen, setRearOpen] = useState(false)
  const rearShown = rearOptions && (rearOpen || rearCustom)
  const resetRear = () => {
    setOn(o => ({ ...o, rearDealer: true, rearTagline: true }))
    setRearTagline(undefined)
    setRearOpen(false)
  }
  // «Сбросить» keeps the model and brings the rest back to its defaults
  const reset = () => {
    setDealer(DEFAULT_TOP)
    setTagline(DEFAULT_TAGLINE[model])
    setRearTagline(undefined)
    setRearOpen(false)
    setUrl(DEFAULT_URL[model])
    setOn({ qr: true, tagline: true, dealer: true, rear: true, rearDealer: true, rearTagline: true })
    setDims(false)
    setLarge(false)
    setQrSmall(false)
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

      {/* Sidebar per Figma 4900:4588, as the price card's */}
      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/livery" />

          <div className="flex flex-col gap-4 tracking-normal">
            <Field label="Модель">
              <Segments>
                <SegBtn active={model === 'umo8'} onClick={() => chooseModel('umo8')}>UMO 8</SegBtn>
                <SegBtn active={model === 'umo5'} onClick={() => chooseModel('umo5')}>UMO 5</SegBtn>
              </Segments>
            </Field>

            <OptionalField
              label="QR-код"
              on={on.qr}
              onChange={toggle('qr')}
              extra={<SizeSwitch large={!qrSmall} onChange={v => setQrSmall(!v)} label="Крупный QR-код" />}
            >
              <UrlField value={url} onChange={setUrl} />
            </OptionalField>

            <OptionalField label="Дилер" on={on.dealer} onChange={toggle('dealer')}>
              <ComboField value={dealer} onChange={setDealer} options={DEALER_NAMES} shownAs={withoutUmo} label="Дилеры" invalid={sheets.some(s => s.dealer.issues.length > 0) || !dealer.trim()} />
            </OptionalField>

            <OptionalField
              label="Слоган"
              on={on.tagline}
              onChange={toggle('tagline')}
              // The larger size is for the sides laid out without the big QR: no QR or the small one
              extra={(!on.qr || qrSmall) && canLarge ? <SizeSwitch large={large} onChange={setLarge} label="Крупный текст" /> : undefined}
            >
              <ComboField value={tagline} onChange={setTagline} options={TAGLINES[model]} label="Варианты текста" invalid={sloganSheets.some(s => s.tagline.issues.length > 0) || !tagline.trim()} />
            </OptionalField>

            {/* The rear window carries what the sides do; «Изменить» opens what can differ there, «По умолчанию» puts it back
                and folds it, so nothing set apart from the sides is ever hidden */}
            <OptionalField
              label="Заднее стекло"
              on={on.rear}
              onChange={toggle('rear')}
              extra={rearOptions ? <RowAction onClick={rearShown ? resetRear : () => setRearOpen(true)}>{rearShown ? 'По умолчанию' : 'Изменить'}</RowAction> : undefined}
            />

            {on.rear && rearShown && on.tagline && (
              <OptionalField
                label="Слоган на стекле"
                on={on.rearTagline}
                onChange={toggle('rearTagline')}
              >
                <ComboField value={ownRearOn ? rearTagline! : tagline} onChange={setRearTagline} options={TAGLINES[model]} label="Варианты текста" invalid={(ownRearOn ? rearSheet : sloganSheets).some(s => s.tagline.issues.length > 0) || !(ownRearOn ? rearTagline! : tagline).trim()} />
              </OptionalField>
            )}

            {on.rear && rearShown && on.dealer && <Checkbox checked={on.rearDealer} onChange={toggle('rearDealer')}>Дилер на стекле</Checkbox>}

            {/* Overlays on the preview only */}
            <Checkbox checked={dims} onChange={setDims}>Показать размеры</Checkbox>
            {/* <Checkbox checked={seams} onChange={setSeams}>Швы</Checkbox> */}
          </div>

          <div className="pt-2 tracking-normal">
            <LinkButtons onReset={reset} />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok || (on.qr && !urlValid)}>Скачать ZIP</DownloadButton>
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
