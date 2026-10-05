import { useEffect, useMemo, useRef, useState } from 'react'
import { TextInput, TextArea, GeneratorHeader, DownloadButton, Segments, SegBtn, outlined } from '@/ui/form'
import { toD } from '@/livery/geometry'
import { TAG, buildTag, loadFonts, type Fonts, type Person } from '@/nametag/tag'
import { readXlsx, parsePasted, type TableRow } from '@/nametag/table'
import TagArt from '@/nametag/TagArt'

// Name tag generator (Figma: UMO | Evrone, node 4021:2878): a dealership's staff list in, one zip out with the tags
// in outlines, a page each, and the maker's requirements. Two modes: «Вручную», a list typed on the page, and «Из
// таблицы», the template filled in and loaded as .xlsx (or its rows pasted), shown as it is. Editing it means taking it
// to «Вручную». Rows copied from a spreadsheet can be pasted into the manual list too.

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_name-tags_template.xlsx`

/** Shown grey on the tag in place of an empty field, as the fields' placeholders; never in the PDF */
const PLACEHOLDER: Person = { name: 'Имя', surname: 'Фамилия', position: 'Должность' }
const BLANK: Person = { name: '', surname: '', position: '' }
const RED = '#e30'

interface Row extends Person { key: number }

let nextKey = 0
const row = (p: Person): Row => ({ ...p, key: nextKey++ })

/**
 * A tag's title in the sidebar and over its preview, a typed line break after a hyphen joined back («Римская-Корсакова»);
 * empty until a name is typed, and the number stands in
 */
const fullName = (p: Person) => [p.name, p.surname].map(v => v.replace(/-\s*\n\s*/g, '-').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')

const same = (a: Person, b: Person) => a.name === b.name && a.surname === b.surname && a.position === b.position

export default function NameTag() {
  // Not kept in the address, unlike the other generators: a staff list isn't something to send as a link
  // One list for both modes. «Из таблицы» shows a loaded file as it is, with no form; clicking a tag there takes the
  // list to «Вручную» to edit it, and the first edit makes it a list of its own, no longer the file
  const [mode, setMode] = useState<'manual' | 'table'>('manual')
  const [people, setList] = useState<Row[]>(() => [row(BLANK)])
  /** The file the list is, while it's unedited */
  const [file, setFile] = useState('')
  const setPeople = (next: Row[]) => {
    setList(next)
    setFile('')
  }
  /** The one person the sidebar edits; the others are picked by clicking their tag */
  const [selectedKey, setSelected] = useState<number>()
  const current = people.find(p => p.key === selectedKey) ?? people[0]
  const selected = current?.key
  const [tableError, setTableError] = useState('')
  const [dragging, setDragging] = useState(false)

  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFonts().then(setFonts) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Бейдж UMO'
    return () => { document.title = prev }
  }, [])

  /** What's shown and downloaded, titled by name, and numbered as the PDF's pages */
  const items = useMemo(() => (mode === 'table' && !file ? [] : people).map((p, i) => ({
    key: p.key,
    label: fullName(p) || `Бейдж ${i + 1}`,
    note: fullName(p) ? `Бейдж ${i + 1}` : `${TAG.w} × ${TAG.h} мм`,
    person: p as Person,
  })), [mode, file, people])
  const tags = useMemo(() => fonts ? items.map(it => buildTag(fonts, it.person)) : undefined, [fonts, items])
  /** The placeholders standing in for empty fields */
  const ghosts = useMemo(() => fonts ? items.map(({ person: p }) => buildTag(fonts, {
    name: p.name.trim() ? '' : PLACEHOLDER.name,
    surname: p.surname.trim() ? '' : PLACEHOLDER.surname,
    position: p.position.trim() ? '' : PLACEHOLDER.position,
  })) : undefined, [fonts, items])
  const named = items.every(it => it.person.name.trim() || it.person.surname.trim())
  const ok = !!tags && tags.length > 0 && named && tags.every(t => t.issues.length === 0)

  /** A file's rows replace the list, whatever was on it */
  const loadRows = (rows: TableRow[], name: string) => {
    const loaded = rows.map(r => row(r.person))
    setList(loaded)
    setSelected(loaded[0]?.key)
    setFile(name)
    setTableError('')
  }
  const loadRowsRef = useRef(loadRows)
  loadRowsRef.current = loadRows

  const loadFile = async (f: File) => {
    try {
      const rows = readXlsx(await f.arrayBuffer())
      if (!rows.length) throw new Error('В таблице нет строк')
      loadRows(rows, f.name)
    } catch (err) {
      setTableError(err instanceof Error && /xlsx|лист|строк/.test(err.message) ? err.message : 'Не получилось прочитать файл: нужен .xlsx')
    }
  }

  // In the table mode rows pasted anywhere on the page (but into a field, which adds them) stand in for a file
  useEffect(() => {
    if (mode !== 'table') return
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text.includes('\t')) return
      const rows = parsePasted(text)
      if (!rows.length) return
      e.preventDefault()
      loadRowsRef.current(rows, 'Вставленные строки')
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [mode])

  // A person just added takes the focus, and their tag scrolls into view
  const focusNext = useRef(false)
  const form = useRef<HTMLDivElement>(null)
  const figures = useRef(new Map<number, HTMLElement>())
  useEffect(() => {
    if (!focusNext.current) return
    focusNext.current = false
    form.current?.querySelector('input')?.focus()
    if (selected !== undefined) figures.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  const update = (key: number, patch: Partial<Person>) => setPeople(people.map(p => p.key === key ? { ...p, ...patch } : p))
  /** The neighbour after (or before) the one removed is selected */
  const remove = (key: number) => {
    const i = people.findIndex(p => p.key === key)
    const rest = people.filter(p => p.key !== key)
    setPeople(rest)
    setSelected(rest[Math.min(i, rest.length - 1)].key)
  }
  const add = () => {
    const r = row(BLANK)
    focusNext.current = true
    setPeople([...people, r])
    setSelected(r.key)
  }
  /** A table pasted into any field of a row replaces that row (if it's empty or the example) and goes on after it */
  const paste = (key: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t')) return
    const rows = parsePasted(text).map(r => r.person)
    if (!rows.length) return
    e.preventDefault()
    const added = rows.map(row)
    const i = people.findIndex(p => p.key === key)
    const replace = same(people[i], BLANK)
    setPeople([...people.slice(0, replace ? i : i + 1), ...added, ...people.slice(i + 1)])
    setSelected(added[0].key)
  }

  /** A file dropped here loads the table */
  const dropTarget = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true) },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) },
  }
  const fileInput = (
    <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
      onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />
  )

  const handleExport = async () => {
    if (!tags) return
    setExporting(true)
    try {
      const { tagsZip } = await import('@/nametag/pdf')
      const blob = await tagsZip(tags)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_name-tags.zip'
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
          <GeneratorHeader current="/name-tag" />

          <Segments>
            <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
            <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
          </Segments>

          {mode === 'manual' && current && (
            <div className="flex flex-col gap-6 tracking-normal">
              {(() => {
                const p = current
                const i = people.indexOf(p)
                const issues = tags?.[i]?.issues ?? []
                return (
                  <div ref={form} onPasteCapture={e => paste(p.key, e)} className="flex flex-col gap-2">
                    <span className="text-[14px] font-medium leading-5">{items[i]?.label}</span>
                    <div className="flex flex-col gap-2">
                      <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={issues.some(t => t.startsWith('Имя'))} />
                      <TextArea value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => t.startsWith('Фамилия'))} />
                    </div>
                    <TextArea value={p.position} onChange={v => update(p.key, { position: v })} placeholder="Должность" invalid={issues.some(t => t.startsWith('Должность'))} />
                    {/* The selected tag's actions under its fields, side by side as the other generators' «Копировать» and
                        «Сбросить»: «Сбросить» empties the fields, «Удалить» only while there's another tag to go to */}
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => update(p.key, BLANK)} className={outlined}>Сбросить</button>
                      {people.length > 1 && <button type="button" onClick={() => remove(p.key)} className={outlined}>Удалить</button>}
                    </div>
                  </div>
                )
              })()}
              {/* About the whole list, so set apart from the tag's own buttons */}
              <button type="button" onClick={add} className={`${outlined} mt-2`}>Добавить</button>
            </div>
          )}

          {mode === 'table' && (
            <div className="flex flex-col gap-2 tracking-normal">
              {/* The loaded file, to replace it; until there's one the preview is the upload */}
              {file && (
                <label
                  {...dropTarget}
                  className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed p-4 text-center text-[14px] leading-5
                    ${dragging ? 'border-black bg-[#f5f5f5]' : tableError ? 'border-[#e30]' : 'border-black/20 hover:border-black/40'}`}
                >
                  {fileInput}
                  <span className="font-medium break-all">{file}</span>
                  <span className="text-[#999]">{people.length} {staff(people.length)} · заменить</span>
                </label>
              )}
              {tableError && <p className="text-[13px] leading-5 text-[#e30]">{tableError}</p>}
              <a href={TEMPLATE} download="UMO_name-tags_template.xlsx" onClick={downloadTemplate} className={`${outlined} ${file ? 'mt-2' : ''}`}>Скачать шаблон таблицы</a>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>
            Скачать{items.length > 1 ? ` ${items.length} бейдж${plural(items.length)}` : ''}
          </DownloadButton>
        </div>
      </aside>

      {/* In the table mode the preview takes a dropped file too, and until one is loaded it's all an upload */}
      <main
        {...(mode === 'table' ? dropTarget : {})}
        className={`flex flex-1 flex-col bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && file && dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !file ? (
          <label className={`flex min-h-[240px] flex-1 cursor-pointer items-center justify-center rounded-[4px] border border-dashed text-[14px] font-medium leading-5
            ${dragging ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}>
            {fileInput}
            Загрузить таблицу .xlsx
          </label>
        ) : (
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-x-8 gap-y-10">
          {items.map((it, i) => {
            const tag = tags?.[i]
            const bad = !!tag && tag.issues.length > 0
            const key = it.key
            // In the manual list a tag is picked for editing; in the table one, clicking a tag goes to edit it there
            const pickable = mode === 'table' || people.length > 1
            const active = mode === 'manual' && pickable && key === current?.key
            return (
              <figure
                key={it.key}
                ref={el => { if (el) figures.current.set(key, el); else figures.current.delete(key) }}
                className="@container flex flex-col gap-3"
              >
                <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
                  <span className="font-medium">{it.label}</span>
                  <span className="text-[#999]">{it.note}</span>
                </figcaption>
                {/* In the manual list a tag is picked for editing by clicking it; the picked one is outlined */}
                <button
                  type="button"
                  disabled={!pickable}
                  onClick={() => { setSelected(key); setMode('manual') }}
                  aria-pressed={pickable ? active : undefined}
                  className={`block rounded-[5.714cqw] outline-offset-4 ${pickable ? 'cursor-pointer' : 'cursor-default'}
                    ${active ? 'outline-2 outline-black' : pickable ? 'outline-1 outline-transparent hover:outline-black/20' : ''}`}
                >
                  <TagArt text={tag ? toD(tag.cmds) : undefined} ghost={ghosts?.[i] ? toD(ghosts[i].cmds) : undefined} color={bad ? RED : undefined} />
                </button>
                {bad && (
                  <ul className="text-[13px] leading-5 text-[#e30]">
                    {tag.issues.map(t => <li key={t}>{t}</li>)}
                  </ul>
                )}
              </figure>
            )
          })}
        </div>
        )}
      </main>

    </div>
  )
}

/**
 * The template as an .xlsx with its type set: a server that sends it without one (Vite's dev server) has browsers sniff
 * the zip inside and save a .zip
 */
async function downloadTemplate(e: React.MouseEvent) {
  e.preventDefault()
  const data = await (await fetch(TEMPLATE)).arrayBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = 'UMO_name-tags_template.xlsx'
  a.click()
  URL.revokeObjectURL(a.href)
}

/** сотрудник, сотрудника, сотрудников */
function staff(n: number): string {
  return 'сотрудник' + ({ '': '', 'а': 'а', 'ей': 'ов' } as Record<string, string>)[plural(n)]
}

/** бейдж, бейджа, бейджей */
function plural(n: number): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return ''
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'а'
  return 'ей'
}
