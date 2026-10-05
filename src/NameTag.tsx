import { useEffect, useMemo, useRef, useState } from 'react'
import { TextArea, GeneratorHeader, DownloadButton, Segments, SegBtn, outlined } from '@/ui/form'
import { toD } from '@/livery/geometry'
import { buildTag, loadFonts, type Fonts, type Person } from '@/nametag/tag'
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
const NO_NAME = 'Нет имени'
const NO_SURNAME = 'Нет фамилии'
const NO_POSITION = 'Нет должности'
const RED = '#e30'

interface Row extends Person { key: number }

let nextKey = 0
const row = (p: Person): Row => ({ ...p, key: nextKey++ })

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
  /** The one person the sidebar edits, picked by clicking their tag; a click beside the tags leaves none selected */
  const [selectedKey, setSelected] = useState<number | null>(() => people[0].key)
  const current = people.find(p => p.key === selectedKey)
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

  /** What's shown and downloaded; no captions: the tags carry their own names, the selected one is outlined */
  const items = useMemo(() => (mode === 'table' && !file ? [] : people).map(p => ({ key: p.key, person: p as Person })), [mode, file, people])
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
  /** The tag reached through the line over «Скачать»: its empty fields show as errors even while it's being edited */
  const [flagged, setFlagged] = useState<number | null>(null)
  /**
   * Tags added empty and not yet left: the one on a fresh page and each «Добавить» gives. Their empty fields aren't
   * errors while they're being filled in for the first time
   */
  const [fresh, setFresh] = useState<Set<number>>(() => new Set([people[0].key]))
  useEffect(() => {
    setFresh(f => [...f].some(k => k !== selected) ? new Set([...f].filter(k => k === selected)) : f)
  }, [selected])
  /** What's shown as errors: text over its room at once, empty fields on every tag but a fresh one being filled in */
  const problems = items.map((it, i) => [
    ...(tags?.[i]?.issues ?? []),
    ...(it.key === selected && fresh.has(it.key) && it.key !== flagged ? [] : missing[i]),
  ])
  /** The tags not ready, which keep «Скачать» off; the line over it counts them and leads through them */
  const failing = items.filter((_, i) => missing[i].length || tags?.[i]?.issues.length).map(it => it.key)
  const ok = !!tags && items.length > 0 && failing.length === 0

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
    form.current?.querySelector('textarea')?.focus()
    if (selected !== undefined) figures.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  // Going to a tag with an error: select it for editing and bring it into view
  const [reveal, setReveal] = useState(0)
  useEffect(() => {
    if (reveal && selected !== undefined) figures.current.get(selected)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [reveal]) // eslint-disable-line react-hooks/exhaustive-deps
  const goTo = (key: number) => {
    setSelected(key)
    setFlagged(key)
    setMode('manual')
    setReveal(n => n + 1)
  }
  /** The next tag with an error after the selected one, round the list */
  const nextFailing = (keys: number[]) => {
    const at = items.findIndex(it => it.key === selected)
    const after = keys.find(k => items.findIndex(it => it.key === k) > at)
    goTo(after ?? keys[0])
  }

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
    setFresh(f => new Set(f).add(r.key))
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
    if (!tags || !ok) return
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

          {mode === 'manual' && (
            <div className="flex flex-col gap-6 tracking-normal">
              {current && (() => {
                const p = current
                const i = people.indexOf(p)
                const issues = problems[i] ?? []
                return (
                  <div ref={form} onPasteCapture={e => paste(p.key, e)} className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      <TextArea value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={issues.some(t => t.startsWith('Имя') || t === NO_NAME)} />
                      <TextArea value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => t.startsWith('Фамилия') || t === NO_SURNAME)} />
                    </div>
                    <TextArea value={p.position} onChange={v => update(p.key, { position: v })} placeholder="Должность" invalid={issues.some(t => t.startsWith('Должность') || t === NO_POSITION)} />
                    {/* The selected tag's actions under its fields, side by side as the other generators' «Копировать» and
                        «Сбросить»: «Сбросить» empties the fields, while there's something in them; «Удалить» only while
                        there's another tag to go to */}
                    {(!same(p, BLANK) || people.length > 1) && (
                      <div className="mt-2 flex gap-2">
                        {!same(p, BLANK) && <button type="button" onClick={() => update(p.key, BLANK)} className={outlined}>Сбросить</button>}
                        {people.length > 1 && <button type="button" onClick={() => remove(p.key)} className={outlined}>Удалить</button>}
                      </div>
                    )}
                  </div>
                )
              })()}
              {/* About the whole list, so set apart from the tag's own buttons */}
              <button type="button" onClick={add} className={`${outlined} ${current ? 'mt-2' : ''}`}>Добавить</button>
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
          {/* Until every tag is ready, the progress in the button's place, leading through the tags not ready yet; with a
              single tag, nothing: its form says enough, and «В работе 1» would only repeat it */}
          {failing.length > 0 ? items.length > 1 && (
            <button type="button" onClick={() => nextFailing(failing)} className="flex w-full cursor-pointer items-center justify-center p-3 text-[14px] leading-[1.13] tracking-[-0.01em] text-[#999] hover:text-black">
              {failing.length === items.length ? `В работе ${items.length}` : `${ready(items.length - failing.length)} ${items.length - failing.length} из ${items.length}`}
            </button>
          ) : items.length > 0 && (
            <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>
              Скачать{items.length > 1 ? ` ${items.length} бейдж${plural(items.length)}` : ''}
            </DownloadButton>
          )}
        </div>
      </aside>

      {/* In the table mode the preview takes a dropped file too, and until one is loaded it's all an upload */}
      <main
        {...(mode === 'table' ? dropTarget : {})}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure button')) setSelected(null) }}
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
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-8">
          {items.map((it, i) => {
            const tag = tags?.[i]
            const bad = problems[i].length > 0
            const key = it.key
            // In the manual list a tag is picked for editing; in the table one, clicking a tag goes to edit it there.
            // The tags but the selected one are dimmed; with none selected (in the table always) all are clear
            const active = mode === 'manual' && key === current?.key
            const dimmed = mode === 'manual' && !!current && !active
            return (
              <figure
                key={it.key}
                ref={el => { if (el) figures.current.set(key, el); else figures.current.delete(key) }}
                className="@container flex flex-col gap-3"
              >
                {/* In the manual list a tag is picked for editing by clicking it; the picked one is outlined */}
                <button
                  type="button"
                  onClick={() => { setSelected(key); setFlagged(null); setMode('manual') }}
                  aria-pressed={mode === 'manual' ? active : undefined}
                  className={`block cursor-pointer rounded-[5.714cqw] outline-offset-4 transition-opacity duration-150
                    ${active ? 'outline-2 outline-black' : 'outline-1 outline-transparent hover:outline-black/20'}
                    ${dimmed ? 'opacity-40 hover:opacity-100' : ''}`}
                >
                  <TagArt text={tag ? toD(tag.cmds) : undefined} ghost={ghosts?.[i] ? toD(ghosts[i].cmds) : undefined} color={bad ? RED : undefined} />
                </button>
                {bad && (
                  <p className="text-[13px] leading-5 text-[#e30]">{alertLine(problems[i])}</p>
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

/** A tag's errors in one line: the empty fields in one phrase («Нет имени, фамилии и должности»), then the rest */
function alertLine(problems: string[]): string {
  const empty = { [NO_NAME]: 'имени', [NO_SURNAME]: 'фамилии', [NO_POSITION]: 'должности' } as Record<string, string>
  const words = problems.filter(t => t in empty).map(t => empty[t])
  const missing = words.length ? `Нет ${words.length > 1 ? `${words.slice(0, -1).join(', ')} и ${words[words.length - 1]}` : words[0]}` : ''
  return [missing, ...problems.filter(t => !(t in empty))].filter(Boolean).join(' · ')
}

/** The verb agreeing with the count of tags ready: «Готов 1», «Готовы 2», «Готовы 5»; with none ready it's «В работе 4» */
function ready(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'Готов' : 'Готовы'
}

/** бейдж, бейджа, бейджей */
function plural(n: number): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return ''
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'а'
  return 'ей'
}
