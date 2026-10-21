import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Font } from 'opentype.js'
import { goal } from '@/ui/metrika'
import { Field, Segments, SegBtn, TextInput, ComboField, GeneratorHeader, LinkButtons, DownloadBar } from '@/ui/form'
import { CaptionReset } from '@/ui/staff'
import { linkParams, useLinkState, saveAndOpenPdf } from '@/ui/share'
import { toD } from '@/livery/geometry'
import { loadFont } from '@/ui/type'
import { STRIP, buildStrip, lineStart, type Align } from '@/plate/frame'
import PlateArt from '@/plate/PlateArt'
import { DEALER_NAMES, dealerFilter, withoutUmo } from '@/data/dealers'
import { MobileEditor, usePhone } from '@/ui/mobile'
import { recordText } from '@/ui/liveText'
import { TemplateButton, useTemplateLink } from '@/ui/template'

// Number plate frame generator: the dealer's line printed under the plate, as a
// 501×21 mm PDF with the text in outlines, for the frame maker. The line is the dealer's marketing name as umo.auto
// lists it («UMO АГАТ Владимир»): the «UMO » is fixed, so only the name is typed or picked from the suggestions.
// A link with `text` (even empty: /plate-frame?text) opens a hidden mode where the whole line is free, for the odd case
// the prefix doesn't fit; nothing on the page leads there.

const PREFIX = 'UMO '
/** The name field's placeholder, standing grey on the frame while it's empty; never in the PDF */
const PLACEHOLDER_NAME = 'Центр'
const PLACEHOLDER_TEXT = PREFIX + PLACEHOLDER_NAME
const GHOST = '#808080'
/** The dealers' names for the suggestions, without the fixed «UMO » */
const NAMES = DEALER_NAMES.map(withoutUmo)
const RED = '#ff2a1a'

export default function PlateFrame() {
  const [link] = useState(linkParams)
  // The free line: on while the link has `text`, so it stays on as the address keeps it
  const [custom] = useState(() => link.has('text'))
  // Empty at first, as the name tag's fields: «Центр» as a value reads as filled in
  // A name with «UMO» (a link made by hand) loses it, as the prefix is fixed
  const [name, setName] = useState(() => withoutUmo(link.get('name') ?? ''))
  const [text, setText] = useState(link.get('text') ?? '')
  const [align, setAlign] = useState<Align>(link.get('align') === 'center' ? 'center' : 'left')
  useLinkState({
    name: custom || !name ? null : name,
    text: custom ? text : null,
    align: align === 'left' ? null : align,
  })
  const line = custom ? text : PREFIX + name
  const noName = custom ? !text.trim() : !name.trim()
  /** What the frame shows: the placeholder while the field is empty */
  const shown = noName ? (custom ? PLACEHOLDER_TEXT : PREFIX + PLACEHOLDER_NAME) : line

  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)
  const phone = usePhone()
  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Рамка номера UMO'
    return () => { document.title = prev }
  }, [])

  const strip = useMemo(() => font ? buildStrip(font, shown, align) : undefined, [font, shown, align])
  /** The fixed prefix alone, drawn white over the grey placeholder */
  const start = useMemo(() => !font || !strip ? undefined : custom ? { cmds: [], end: strip.x } : lineStart(font, PREFIX, strip.x), [font, strip, custom])
  const ok = !!strip && strip.issues.length === 0 && !noName
  /** Red only for a wrong line, never an empty one */
  const wrong = !noName && !!strip && strip.issues.length > 0

  /** Nothing to copy or reset: no dealer, the line on the left */
  const blank = noName && align === 'left'
  const form = useRef<HTMLDivElement>(null)
  /** The line under the download leads to the field, which opens its suggestions on focus */
  const toField = () => form.current?.querySelector<HTMLElement>('input, textarea')?.focus()

  const reset = () => {
    setName('')
    setText('')
    setAlign('left')
  }

  const downloadGoal = (extra?: Record<string, unknown>) => {
    // The line goes along only when it isn't a dealer from the list: what dealers type for themselves
    const listed = !custom && NAMES.includes(name.trim())
    goal('download_plate_frame', { free: custom, align, listed, ...(listed ? {} : { line: line.trim().slice(0, 100) }), ...extra })
  }

  /** The strip's PDF for «Поделиться» to send, made again as it changes */
  const shareFile = useCallback(async () => {
    const { stripPdf, STRIP_FILE } = await import('@/plate/pdf')
    return new File([await stripPdf(strip!)], STRIP_FILE, { type: 'application/pdf' })
  }, [strip])

  const handleExport = async () => {
    if (!strip) return
    setExporting(true)
    try {
      const { stripPdf, STRIP_FILE } = await import('@/plate/pdf')
      const blob = await stripPdf(strip)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = STRIP_FILE
      a.click()
      downloadGoal()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  /** The editable template: the strip as on the page, the placeholder while nothing is typed */
  const templateOf = (line: string) => {
    const one = recordText(() => buildStrip(font!, line, align))
    return import('@/plate/pdf').then(m => m.stripTemplate(one.result, one.lines))
  }
  const makeTemplate = font ? () => templateOf(shown) : undefined
  /** The blank one a `template` link gives: «UMO Центр» */
  const makeBlank = font ? () => templateOf(PREFIX + PLACEHOLDER_NAME) : undefined
  const templateOnly = useTemplateLink(makeBlank, 'UMO_plate-frame_template.pdf', 'download_plate_frame_template')

  // `pdf` in the link (a link made for the dealer) opens the strip's PDF itself, with no editor, once the font
  // is in; a line at fault opens the editor instead, showing what's wrong
  const [pdfOnly, setPdfOnly] = useState(() => link.has('pdf'))
  const pdfStarted = useRef(false)
  useEffect(() => {
    if (!pdfOnly || !strip || pdfStarted.current) return
    pdfStarted.current = true
    if (!ok) { setPdfOnly(false); return }
    import('@/plate/pdf')
      .then(async ({ stripPdf, STRIP_FILE }) => { const blob = await stripPdf(strip); downloadGoal({ via: 'link' }); saveAndOpenPdf(blob, STRIP_FILE) })
      .catch(() => setPdfOnly(false))
  }, [strip]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = (
    <>
        <figure className="group/sheet mx-auto flex w-full max-w-[1200px] flex-col gap-2">
          <div>
            <PlateArt>
              {/* Empty, the placeholder grey, the fixed «UMO » white over it */}
              {strip && <path d={toD(strip.cmds)} fill={noName ? GHOST : wrong ? RED : 'white'} />}
              {strip && noName && start && <path d={toD(start.cmds)} fill="white" />}
            </PlateArt>
          </div>
          <figcaption className="mt-0.5 text-center text-[14px] leading-5 text-caption">
            <span className="relative">
              Поле печати, {STRIP.w}&nbsp;×&nbsp;{STRIP.h}&nbsp;мм
              {/* The reset, by what it resets, as the livery's sheets and the cards' own */}
              <CaptionReset onClick={blank ? undefined : reset} label="Вернуть рамку по умолчанию" extra={<TemplateButton make={makeTemplate} name="UMO_plate-frame_template.pdf" goalId="download_plate_frame_template" />} />
            </span>
          </figcaption>
          {wrong && (
            <ul className="text-center text-[13px] leading-5 text-[#e30]">
              {strip.issues.map(t => <li key={t}>{t}</li>)}
            </ul>
          )}
        </figure>
    </>
  )

  const sidebar = (
    <>
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/plate-frame" />

          <div ref={form} className="flex flex-col gap-4 tracking-normal">
            {custom ? (
              <Field label="Текст">
                {/* Case-sensitive forms as in the print, so a bar stands with the capitals here too */}
                <TextInput value={text} onChange={setText} placeholder={PLACEHOLDER_TEXT} invalid={wrong} className="[font-feature-settings:'case'_1]" />
              </Field>
            ) : (
              <Field label="Дилер">
                <ComboField value={name} onChange={setName} options={NAMES} filter={dealerFilter} placeholder={PLACEHOLDER_NAME} label="Дилеры" singleLine invalid={wrong} />
              </Field>
            )}

            <Field label="Расположение">
              <Segments>
                <SegBtn active={align === 'left'} onClick={() => setAlign('left')}>Слева</SegBtn>
                <SegBtn active={align === 'center'} onClick={() => setAlign('center')}>По центру</SegBtn>
              </Segments>
            </Field>
          </div>

        </div>

        {/* Over it while it's off, the fault, which the preview also says under the strip */}
    </>
  )

  const download = (
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={noName ? (custom ? 'Добавить текст' : 'Выбрать дилера') : strip?.issues[0]}
          onNote={toField}
          // Nothing to copy or reset until there's a dealer or the line is centred
          links={!blank && <LinkButtons incomplete={!ok} file={shareFile} />}
        />
  )

  if (pdfOnly || templateOnly) return null
  // Phones: the canvas over a sheet with the form (trial)
  if (phone) return <MobileEditor slides={[{ key: 'frame', label: 'Поле печати', node: preview, reset: blank ? undefined : { onClick: reset, label: 'Вернуть рамку по умолчанию' } }]} sidebar={sidebar} download={download} />

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        {sidebar}
        {download}
      </aside>

      <main className="flex flex-1 items-center bg-surface p-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        {preview}
      </main>

    </div>
  )
}
