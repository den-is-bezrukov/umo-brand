import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, GeneratorHeader, DownloadBar, unfilled, stepsLeft, Segments, SegBtn, outlined } from '@/ui/form'
import { useStaff, plain, pickTable, TableSource, UploadArea, AddTile, fullNameField, ItemFrame, Removed, BESIDE, ITEM_EDGE } from '@/ui/staff'
import { goal } from '@/ui/metrika'
import { toD } from '@/livery/geometry'
import { TAG, TAGS_KEY, buildTag, loadFonts, type Field, type FieldBox, type Fonts, type Person } from '@/nametag/tag'
import { readXlsx, parsePasted } from '@/nametag/table'
import { POSITIONS } from '@/data/positions'
import TagArt from '@/nametag/TagArt'
import { isPdf, pdfInZip, readPdfData } from '@/ui/pdfData'

// Name tag generator (Figma: UMO | Evrone, node 4021:2878): a dealership's staff list in, one zip out with the tags
// in outlines, a page each, and the maker's requirements. Two modes: «Вручную», a list typed on the page, and «Из
// таблицы», the template filled in and loaded as .xlsx (or its rows pasted), shown as it is. Editing it means taking it
// to «Вручную». Rows copied from a spreadsheet can be pasted into the manual list too.

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_name-tags_template.xlsx`

/** Shown grey on the tag in place of an empty field, as the fields' placeholders; never in the PDF */
const PLACEHOLDER: Person = { name: 'Имя', surname: 'Фамилия', position: 'Должность' }
const BLANK: Person = { name: '', surname: '', position: '' }
const NO_NAME = 'Нет имени'
const NO_SURNAME = 'Нет фамилии'
const NO_POSITION = 'Нет должности'
/** The last empty field, said by name under the download */
const UNFILLED: Record<string, string> = { [NO_NAME]: 'Нужно добавить имя', [NO_SURNAME]: 'Добавить фамилию', [NO_POSITION]: 'Указать должность' }

export default function NameTag() {
  // Not kept in the address, unlike the other generators: a staff list isn't something to send as a link
  // One list for both modes. «Из таблицы» shows a loaded file as it is, with no form; clicking a tag there takes the
  // list to «Вручную» to edit it, and the first edit makes it a list of its own, no longer the file
  const staff = useStaff<Person>({
    blank: BLANK,
    // The tags' own ZIP, or the PDF from it, brings back the staff, to change a line and download again; else a table
    readFile: data => {
      const bytes = new Uint8Array(data)
      const pdf = isPdf(bytes) ? bytes : pdfInZip(bytes)
      if (!pdf) return readXlsx(data).map(r => r.person)
      const d = readPdfData(pdf, TAGS_KEY) as { people?: Partial<Person>[] } | undefined
      if (!d?.people?.length) throw new Error('В этом PDF нет бейджей: подходят ZIP и PDF, скачанные здесь')
      return d.people.map(p => ({ name: String(p.name ?? ''), surname: String(p.surname ?? ''), position: String(p.position ?? '') }))
    },
    readPasted: text => parsePasted(text).map(r => r.person),
    accept: '.xlsx,.zip,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/pdf',
    uploadLabel: 'Загрузить таблицу или ZIP',
  })
  const { mode, setMode, people, current, selected, setSelected, update } = staff
  /** A field being edited on the tag itself, after a double click on its text */
  const [editing, setEditing] = useState<{ key: number; field: Field } | null>(null)
  staff.useDeleteKey(!!editing)

  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFonts().then(setFonts) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Бейдж UMO'
    return () => { document.title = prev }
  }, [])

  /** What's shown and downloaded; no captions: the tags carry their own names, the selected one is outlined */
  const items = useMemo(() => staff.items.map(p => ({ key: p.key, person: p as Person })), [staff.items])
  const tags = useMemo(() => fonts ? items.map(it => buildTag(fonts, it.person)) : undefined, [fonts, items])
  /** The placeholders standing in for empty fields */
  const ghosts = useMemo(() => fonts ? items.map(({ person: p }) => buildTag(fonts, {
    name: p.name.trim() ? '' : PLACEHOLDER.name,
    surname: p.surname.trim() ? '' : PLACEHOLDER.surname,
    position: p.position.trim() ? '' : PLACEHOLDER.position,
  })) : undefined, [fonts, items])
  /** A tag needs a name, a surname and a position */
  const missing = items.map(({ person: p }) => [
    ...(!p.name.trim() ? [NO_NAME] : []),
    ...(!p.surname.trim() ? [NO_SURNAME] : []),
    ...(!p.position.trim() ? [NO_POSITION] : []),
  ])
  /** A tag's first fault, as the note over the download says it: a wrong value, else its first empty field */
  const problemOf = (i: number) => i < 0 ? undefined : tags?.[i]?.issues[0] ?? (missing[i].length ? unfilled(missing[i].map(t => UNFILLED[t])) : undefined)
  /** What's shown as errors: text over its room at once, empty fields on every tag but a fresh one being filled in */
  const problems = items.map((it, i) => [
    ...(tags?.[i]?.issues ?? []),
    ...(staff.showsMissing(it.key) ? missing[i] : []),
  ])
  /** The tags not ready, which keep «Скачать» off; the line over it counts them and leads through them */
  const failing = items.filter((_, i) => missing[i].length || tags?.[i]?.issues.length).map(it => it.key)
  const ok = !!tags && items.length > 0 && failing.length === 0

  const handleExport = async () => {
    if (!tags || !ok) return
    setExporting(true)
    try {
      const { tagsZip } = await import('@/nametag/pdf')
      const blob = await tagsZip(tags, staff.items.map(plain))
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_name-tags.zip'
      a.click()
      goal('download_name_tag', { count: tags.length })
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/name-tag" />

          <Labelled label="Данные">
            <Segments>
              <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
              <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
            </Segments>
          </Labelled>

          {mode === 'manual' && current && (
            <div className="flex flex-col gap-6 tracking-normal">
              {current && (() => {
                const p = current
                const i = people.indexOf(p)
                const issues = problems[i] ?? []
                return (
                  <div ref={staff.form} onPasteCapture={e => staff.paste(p.key, e)} className="flex flex-col gap-2">
                    <div className="flex flex-col gap-4">
                      <Labelled label="Имя">
                        <TextArea value={p.name} onChange={v => update(p.key, { name: v })} {...fullNameField(p, s => update(p.key, s))} placeholder="Имя" invalid={issues.some(t => t.startsWith('Имя') || t === NO_NAME)} />
                      </Labelled>
                      <Labelled label="Фамилия">
                        <TextArea value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => t.startsWith('Фамилия') || t === NO_SURNAME)} />
                      </Labelled>
                      <Labelled label="Должность">
                        <PositionPicker
                          key={p.key}
                          value={p.position}
                          onChange={v => update(p.key, { position: v })}
                          invalid={issues.some(t => t.startsWith('Должность') || t === NO_POSITION)}
                        />
                      </Labelled>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {mode === 'table' && <TableSource staff={staff} template={TEMPLATE} />}
        </div>

        {/* On phones pinned to the bottom of the screen, as on every generator; 40 px off the form on wide screens */}
        <DownloadBar
          format="ZIP"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={!items.length ? 'Нужно загрузить таблицу' : (failing.length ? problemOf(staff.inWork(failing).index) : undefined)}
          count={stepsLeft(items.reduce((n, _, i) => n + missing[i].length + (tags?.[i]?.issues.length ?? 0), 0))}
          onNote={items.length ? () => staff.nextOf(failing) : pickTable}
        />
      </aside>

      {/* The whole preview takes a dropped table in either mode, saying so only in the table mode, where until a file is
          loaded it's all an upload */}
      <main
        {...staff.dropTarget}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure, [data-add]')) setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && staff.file && staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !staff.file ? (
          <UploadArea staff={staff} />
        ) : (
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {items.map((it, i) => {
            const tag = tags?.[i]
            const edited = editing?.key === it.key ? editing.field : null
            const bad = problems[i].length > 0
            // Only the fields at fault turn red; a missing one is said under the tag, the rest stays as it is
            const wrong = faultyFields(tag?.issues ?? [])
            const key = it.key
            // In the manual list a tag is picked for editing; in the table one, clicking a tag goes to edit it there.
            // The tags but the selected one are dimmed; with none selected (in the table always) all are clear
            const active = mode === 'manual' && key === current?.key
            const dimmed = mode === 'manual' && !!current && !active
            return (
              <Fragment key={it.key}>
              <Removed staff={staff} at={i} />
              {/* The whole row of the canvas is the tag's: pointing or clicking anywhere across it hovers or picks it */}
              <figure
                key={it.key}
                ref={staff.figureRef(key)}
                onClick={() => staff.pick(key)}
                className="group/row flex cursor-pointer justify-center"
              >
                <div className="@container flex w-full max-w-[480px] flex-col gap-3">
                {/* In the manual list a tag is picked for editing by clicking it; the picked one is outlined. A double click
                    on its text edits that field right there */}
                <ItemFrame staff={staff} item={staff.items[i]} n={i + 1}>
                <button
                  type="button"
                  onDoubleClick={e => {
                    if (!tag || !ghosts?.[i]) return
                    const r = e.currentTarget.getBoundingClientRect()
                    const field = fieldAt(tag.fields, ghosts[i].fields, it.person, (e.clientY - r.top) / r.height * TAG.h)
                    setSelected(key)
                    setMode('manual')
                    setEditing({ key, field })
                  }}
                  aria-pressed={mode === 'manual' ? active : undefined}
                  // Edged as every generator's items (`ITEM_EDGE`)
                  className={`block w-full cursor-pointer rounded-[5.714cqw] ${ITEM_EDGE} transition-opacity duration-150
                    ${dimmed ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                >
                  <TagArt
                    text={tag ? toD(fieldsBut(tag.fields, edited, f => !wrong.has(f))) : undefined}
                    alert={tag && wrong.size ? toD(fieldsBut(tag.fields, edited, f => wrong.has(f))) : undefined}
                    ghost={ghosts?.[i] ? toD(fieldsBut(ghosts[i].fields, edited)) : undefined}
                  />
                </button>
                {edited && tag && (
                  <InlineField
                    box={(it.person[edited].trim() ? tag : ghosts![i]).fields[edited]}
                    field={edited}
                    value={it.person[edited]}
                    onChange={v => update(key, { [edited]: v })}
                    onDone={() => setEditing(null)}
                  />
                )}
                </ItemFrame>
                {bad && (
                  <p className={`text-[13px] leading-5 text-[#e30] ${BESIDE}`}>{alertLine(problems[i])}</p>
                )}
                </div>
              </figure>
              </Fragment>
            )
          })}
          <Removed staff={staff} at={items.length} />
          {/* «Добавить» as the next tag in the grid: a dashed plate of the tag's shape; the manual list only */}
          {mode === 'manual' && <AddTile onClick={() => staff.add()} />}
        </div>
        )}
      </main>

    </div>
  )
}

/**
 * The position: a combobox of the typical positions (`POSITIONS`, each carrying its line break on the tag), free text
 * still allowed
 */
function PositionPicker({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  return <ComboField value={value} onChange={onChange} options={POSITIONS} placeholder="Должность" label="Типовые должности" invalid={invalid} />
}

/** The outlines of every field (of those `only` keeps) but the one being edited, which the inline field stands in for */
function fieldsBut(fields: Record<Field, FieldBox>, except: Field | null, only: (f: Field) => boolean = () => true) {
  return (Object.keys(fields) as Field[]).filter(f => f !== except && only(f)).flatMap(f => fields[f].cmds)
}

/** The fields a tag's issues are about, by the label they start with (`buildTag`); a missing glyph could be in any */
function faultyFields(issues: string[]): Set<Field> {
  const wrong = new Set<Field>()
  for (const t of issues) {
    if (t.startsWith('Имя и фамилия')) { wrong.add('name'); wrong.add('surname') }
    else if (t.startsWith('Имя')) wrong.add('name')
    else if (t.startsWith('Фамилия')) wrong.add('surname')
    else if (t.startsWith('Должность') || t.startsWith('При имени')) wrong.add('position')
    else if (t.startsWith('Нет в шрифте')) { wrong.add('name'); wrong.add('surname'); wrong.add('position') }
  }
  return wrong
}

/** The field under a double click at `y` mm: the one whose lines it hits, else the nearest; empty fields by their placeholders */
function fieldAt(real: Record<Field, FieldBox>, ghost: Record<Field, FieldBox>, person: Person, y: number): Field {
  const fields: Field[] = ['name', 'surname', 'position']
  const box = (f: Field) => (person[f].trim() ? real : ghost)[f]
  const dist = (f: Field) => {
    const b = box(f)
    const bottom = b.top + b.lines * b.leading
    return y < b.top ? b.top - y : y > bottom ? y - bottom : 0
  }
  return fields.reduce((a, f) => dist(f) < dist(a) ? f : a)
}

/**
 * A field edited on the tag: a transparent textarea over its lines, in the same font, size and leading (the tag's
 * millimetres in container units: the figure is the container, 70 mm wide), so it reads as typing on the tag. Enter is
 * a line break, as in the sidebar; Esc or a click elsewhere ends it
 */
function InlineField({ box, field, value, onChange, onDone }: { box: FieldBox; field: Field; value: string; onChange: (v: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  const mm = (v: number) => `${v * 100 / TAG.w}cqw`
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={e => { if (e.key === 'Escape') onDone() }}
      spellCheck={false}
      aria-label={{ name: 'Имя', surname: 'Фамилия', position: 'Должность' }[field]}
      className="absolute m-0 block resize-none overflow-hidden border-0 bg-transparent p-0 text-[#262626] outline-none"
      style={{
        left: mm(4),
        top: mm(box.top),
        width: mm(TAG.w - 8),
        height: mm(box.lines * box.leading),
        fontSize: mm(box.size),
        lineHeight: box.leading / box.size,
        fontWeight: box.medium ? 500 : 400,
        whiteSpace: field === 'position' ? 'pre-wrap' : 'pre',
        letterSpacing: 0,
      }}
    />
  )
}

/** A tag's errors in one line: the empty fields in one phrase («Нет имени, фамилии и должности»), then the rest */
function alertLine(problems: string[]): string {
  const empty = { [NO_NAME]: 'имени', [NO_SURNAME]: 'фамилии', [NO_POSITION]: 'должности' } as Record<string, string>
  const words = problems.filter(t => t in empty).map(t => empty[t])
  const missing = words.length ? `Нет ${words.length > 1 ? `${words.slice(0, -1).join(', ')} и ${words[words.length - 1]}` : words[0]}` : ''
  return [missing, ...problems.filter(t => !(t in empty))].filter(Boolean).join(' · ')
}
