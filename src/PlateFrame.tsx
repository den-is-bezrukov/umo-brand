import { useEffect, useMemo, useRef, useState } from 'react'
import type { Font } from 'opentype.js'
import { goal } from '@/ui/metrika'
import { Field, Segments, SegBtn, TextInput, ComboField, GeneratorHeader, LinkButtons, DownloadBar } from '@/ui/form'
import { linkParams, useLinkState } from '@/ui/share'
import { loadFont, toD } from '@/livery/geometry'
import { STRIP, BASELINE, SIZE, TRACKING, buildStrip, lineStart, type Align } from '@/plate/frame'
import PlateArt from '@/plate/PlateArt'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'

// Number plate frame generator (Figma: UMO | Evrone, node 4970:2419): the dealer's line printed under the plate, as a
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

/** The frame's millimetres in container units: the container is the frame picture, 522 mm wide */
const mm = (v: number) => `${v * 100 / 522}cqw`

/**
 * The strip's text edited on the frame: a transparent input on the line, CoFo Sans Medium 18 mm with the tracking and
 * case forms of the print, its line box the strip's 21 mm round the baseline. Enter, Esc or a click elsewhere ends it
 */
function InlineLine({ font, x, value, onChange, color, onDone }: { font: Font; x: number; value: string; onChange: (v: string) => void; color: string; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  const ascent = font.ascender / font.unitsPerEm * SIZE
  const descent = -font.descender / font.unitsPerEm * SIZE
  const top = STRIP.y + BASELINE - (STRIP.h - ascent - descent) / 2 - ascent
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') onDone() }}
      spellCheck={false}
      aria-label="Дилер"
      className="absolute m-0 block border-0 bg-transparent p-0 font-medium outline-none [font-feature-settings:'case'_1]"
      style={{
        left: mm(x),
        top: mm(top),
        width: mm(STRIP.x + STRIP.w - x),
        height: mm(STRIP.h),
        fontSize: mm(SIZE),
        lineHeight: STRIP.h / SIZE,
        letterSpacing: `${TRACKING}em`,
        color,
        caretColor: color,
      }}
    />
  )
}

export default function PlateFrame() {
  const [link] = useState(linkParams)
  // The free line: on while the link has `text`, so it stays on as the address keeps it
  const [custom] = useState(() => link.has('text'))
  // Empty at first, as the name tag's fields: «Центр» stood in as a value and read as filled in
  const [name, setName] = useState(link.get('name') ?? '')
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
  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Рамка номера UMO'
    return () => { document.title = prev }
  }, [])

  const strip = useMemo(() => font ? buildStrip(font, shown, align) : undefined, [font, shown, align])
  /** The dealer's name (or the free line) edited right on the frame, after a double click on it */
  const [editing, setEditing] = useState(false)
  /** While editing, the fixed prefix stays drawn and the field starts where the name does */
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
      // The line goes along only when it isn't a dealer from the list: what dealers type for themselves
      const listed = !custom && NAMES.includes(name.trim())
      goal('download_plate_frame', { free: custom, align, listed, ...(listed ? {} : { line: line.trim().slice(0, 100) }) })
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
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
                <ComboField value={name} onChange={setName} options={NAMES} placeholder={PLACEHOLDER_NAME} label="Дилеры" singleLine invalid={wrong} />
              </Field>
            )}

            <Field label="Расположение">
              <Segments>
                <SegBtn active={align === 'left'} onClick={() => setAlign('left')}>Слева</SegBtn>
                <SegBtn active={align === 'center'} onClick={() => setAlign('center')}>По центру</SegBtn>
              </Segments>
            </Field>
          </div>

          {/* Nothing to copy or reset until there's a dealer or the line is centred */}
          {!blank && (
            <div className="pt-4 tracking-normal">
              <LinkButtons onReset={reset} />
            </div>
          )}
        </div>

        {/* Over it while it's off, the fault, which the preview also says under the strip */}
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={noName ? (custom ? 'Текст не указан' : 'Дилер не выбран') : strip?.issues[0]}
          onNote={toField}
          // Without «Копировать» and «Сбросить» over it, 40 px off the form, as the name tag's
          className={blank ? 'md:mt-8' : ''}
        />
      </aside>

      <main className="flex flex-1 items-center bg-[#f5f5f5] p-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        <figure className="mx-auto flex w-full max-w-[1200px] flex-col gap-2">
          {/* A double click on the frame edits the text right on it, as the name tags do */}
          <div className="@container relative cursor-text" onDoubleClick={() => setEditing(true)}>
            <PlateArt>
              {/* Empty, the placeholder grey, the fixed «UMO » white over it */}
              {strip && !(editing && noName) && <path d={toD(editing && start ? start.cmds : strip.cmds)} fill={noName ? GHOST : wrong ? RED : 'white'} />}
              {strip && noName && start && <path d={toD(start.cmds)} fill="white" />}
            </PlateArt>
            {editing && font && start && (
              <InlineLine
                font={font}
                x={STRIP.x + start.end}
                value={custom ? text : name}
                onChange={custom ? setText : setName}
                color={wrong ? RED : 'white'}
                onDone={() => setEditing(false)}
              />
            )}
          </div>
          <figcaption className="flex items-baseline justify-center gap-2 text-[14px] leading-5">
            <span className="font-medium">Поле печати</span>
            <span className="text-[#999]">{STRIP.w} × {STRIP.h} мм</span>
          </figcaption>
          {wrong && (
            <ul className="text-center text-[13px] leading-5 text-[#e30]">
              {strip.issues.map(t => <li key={t}>{t}</li>)}
            </ul>
          )}
        </figure>
      </main>

    </div>
  )
}
