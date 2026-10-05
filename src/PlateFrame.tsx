import { useEffect, useMemo, useState } from 'react'
import type { Font } from 'opentype.js'
import { Field, Segments, SegBtn, TextInput, GeneratorHeader, LinkButtons, DownloadButton } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'
import { loadFont, toD } from '@/livery/geometry'
import { STRIP, buildStrip, type Align } from '@/plate/frame'
import PlateArt from '@/plate/PlateArt'

// Number plate frame generator (Figma: UMO | Evrone, node 4970:2419): the dealer's line printed under the plate, as a
// 501×21 mm PDF with the text in outlines, for the frame maker.

const DEFAULT_TEXT = 'Центр UMO | Название дилера'
const RED = '#ff2a1a'

export default function PlateFrame() {
  const [link] = useState(linkParams)
  const [text, setText] = useState(link.get('text') ?? DEFAULT_TEXT)
  const [align, setAlign] = useState<Align>(link.get('align') === 'center' ? 'center' : 'left')
  useLinkState({ text: text === DEFAULT_TEXT ? null : text, align: align === 'left' ? null : align })

  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Рамка номера UMO'
    return () => { document.title = prev }
  }, [])

  const strip = useMemo(() => font ? buildStrip(font, text, align) : undefined, [font, text, align])
  const ok = !!strip && strip.issues.length === 0

  const reset = () => {
    setText(DEFAULT_TEXT)
    setAlign('left')
  }

  const handleExport = async () => {
    if (!strip) return
    setExporting(true)
    try {
      const { stripPdf } = await import('@/plate/pdf')
      const blob = await stripPdf(strip)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_plate-frame_501x21.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/plate-frame" />

          <div className="flex flex-col gap-4 tracking-normal">
            <Field label="Текст">
              <TextInput value={text} onChange={setText} invalid={!!strip && strip.issues.length > 0} />
            </Field>

            <Field label="Расположение">
              <Segments>
                <SegBtn active={align === 'left'} onClick={() => setAlign('left')}>Слева</SegBtn>
                <SegBtn active={align === 'center'} onClick={() => setAlign('center')}>По центру</SegBtn>
              </Segments>
            </Field>
          </div>

          <div className="pt-2 tracking-normal">
            <LinkButtons onReset={reset} />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>Скачать PDF</DownloadButton>
        </div>
      </aside>

      <main className="flex flex-1 items-center bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <figure className="mx-auto flex w-full max-w-[1200px] flex-col gap-2">
          <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
            <span className="font-medium">Поле печати</span>
            <span className="text-[#999]">{STRIP.w} × {STRIP.h} мм</span>
          </figcaption>
          <PlateArt>
            {strip && <path d={toD(strip.cmds)} fill={ok ? 'white' : RED} />}
          </PlateArt>
          {strip && strip.issues.length > 0 && (
            <ul className="text-[13px] leading-5 text-[#e30]">
              {strip.issues.map(t => <li key={t}>{t}</li>)}
            </ul>
          )}
        </figure>
      </main>

    </div>
  )
}
