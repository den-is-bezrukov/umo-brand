import { useEffect, useMemo, useRef, useState } from 'react'
import { TextInput, TextArea, GeneratorHeader, DownloadButton, Segments, SegBtn, outlined } from '@/ui/form'
import { toD } from '@/livery/geometry'
import { TAG, buildTag, loadFonts, type Fonts, type Person } from '@/nametag/tag'
import { readXlsx, parsePasted, type TableRow } from '@/nametag/table'
import TagArt from '@/nametag/TagArt'

// Name tag generator (Figma: UMO | Evrone, node 4021:2878): a dealership's staff list in, one zip out with the tags
// in outlines, a page each, and the maker's requirements. Two modes: «Вручную», a list typed on the page, and «Из
// таблицы», the template filled in and loaded as .xlsx (or its rows pasted), shown but not edited here: the table stays
// the one source, its errors named by row. Rows copied from a spreadsheet can be pasted into the manual list too.

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_name-tags_template.xlsx`

/** Shown grey on the tag in place of an empty field, as the fields' placeholders; never in the PDF */
const PLACEHOLDER: Person = { name: 'Имя', surname: 'Фамилия', position: 'Должность' }
const BLANK: Person = { name: '', surname: '', position: '' }
const RED = '#e30'

interface Row extends Person { key: number }

let nextKey = 0
const row = (p: Person): Row => ({ ...p, key: nextKey++ })

/** A tag's title in the sidebar and over its preview; empty until a name is typed, and the number stands in */
const fullName = (p: Person) => [p.name, p.surname].map(v => v.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')

const same = (a: Person, b: Person) => a.name === b.name && a.surname === b.surname && a.position === b.position

export default function NameTag() {
  // Not kept in the address, unlike the other generators: a staff list isn't something to send as a link
  const [people, setPeople] = useState<Row[]>(() => [row(BLANK)])
  /** The one person the sidebar edits; the others are picked by clicking their tag */
  const [selected, setSelected] = useState(() => people[0].key)
  const current = people.find(p => p.key === selected) ?? people[0]
  const [mode, setMode] = useState<'manual' | 'table'>('manual')
  const [table, setTable] = useState<{ file: string; rows: TableRow[] }>()
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

  /** What's shown and downloaded: the manual list, or the table's rows labelled with their row numbers */
  const items = useMemo(() => mode === 'manual'
    ? people.map((p, i) => ({ key: `m${p.key}`, personKey: p.key as number | undefined, label: fullName(p) || String(i + 1), note: `${TAG.w} × ${TAG.h} мм`, person: p as Person }))
    : (table?.rows ?? []).map(r => ({ key: `t${r.line}`, personKey: undefined, label: fullName(r.person) || 'Без имени', note: `строка ${r.line}`, person: r.person })), [mode, people, table])
  const tags = useMemo(() => fonts ? items.map(it => buildTag(fonts, it.person)) : undefined, [fonts, items])
  /** The placeholders standing in for empty fields */
  const ghosts = useMemo(() => fonts ? items.map(({ person: p }) => buildTag(fonts, {
    name: p.name.trim() ? '' : PLACEHOLDER.name,
    surname: p.surname.trim() ? '' : PLACEHOLDER.surname,
    position: p.position.trim() ? '' : PLACEHOLDER.position,
  })) : undefined, [fonts, items])
  const named = items.every(it => it.person.name.trim() || it.person.surname.trim())
  const ok = !!tags && tags.length > 0 && named && tags.every(t => t.issues.length === 0)

  const loadFile = async (file: File) => {
    try {
      const rows = readXlsx(await file.arrayBuffer())
      if (!rows.length) throw new Error('В таблице нет строк')
      setTable({ file: file.name, rows })
      setTableError('')
    } catch (err) {
      setTableError(err instanceof Error && /xlsx|лист|строк/.test(err.message) ? err.message : 'Не получилось прочитать файл: нужен .xlsx')
    }
  }

  // In the table mode rows pasted anywhere on the page stand in for a file
  useEffect(() => {
    if (mode !== 'table') return
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text.includes('\t')) return
      const rows = parsePasted(text)
      if (!rows.length) return
      e.preventDefault()
      setTable({ file: 'Вставленные строки', rows })
      setTableError('')
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
    figures.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  const update = (key: number, patch: Partial<Person>) => setPeople(ps => ps.map(p => p.key === key ? { ...p, ...patch } : p))
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
    setPeople(ps => [...ps, r])
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

          {mode === 'manual' ? (
            <div className="flex flex-col gap-6 tracking-normal">
              {(() => {
                const p = current
                const i = people.indexOf(p)
                const issues = tags?.[i]?.issues ?? []
                return (
                  <div ref={form} onPasteCapture={e => paste(p.key, e)} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-[14px] leading-5">
                      <span className="font-medium">{fullName(p) || i + 1}</span>
                      {people.length > 1 && (
                        <button type="button" onClick={() => remove(p.key)} className="cursor-pointer text-[#999] hover:text-black">Удалить</button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={issues.some(t => t.startsWith('Имя'))} />
                      <TextInput value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => t.startsWith('Фамилия'))} />
                    </div>
                    <TextArea value={p.position} onChange={v => update(p.key, { position: v })} placeholder="Должность" invalid={issues.some(t => t.startsWith('Должность'))} />
                  </div>
                )
              })()}
              <button type="button" onClick={add} className={outlined}>Добавить</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 tracking-normal">
              <label
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
                className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed p-4 text-center text-[14px] leading-5
                  ${dragging ? 'border-black bg-[#f5f5f5]' : tableError ? 'border-[#e30]' : 'border-black/20 hover:border-black/40'}`}
              >
                <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />
                {table ? (
                  <>
                    <span className="font-medium break-all">{table.file}</span>
                    <span className="text-[#999]">{table.rows.length} {staff(table.rows.length)} · заменить</span>
                  </>
                ) : (
                  <span className="font-medium">Загрузить таблицу .xlsx</span>
                )}
              </label>
              {tableError && <p className="text-[13px] leading-5 text-[#e30]">{tableError}</p>}
              <a href={TEMPLATE} download="UMO_name-tags_template.xlsx" onClick={downloadTemplate} className={`${outlined} mt-2`}>Скачать шаблон</a>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>
            Скачать{items.length > 1 ? ` ${items.length} бейдж${plural(items.length)}` : ''}
          </DownloadButton>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-x-8 gap-y-10">
          {items.map((it, i) => {
            const tag = tags?.[i]
            const bad = !!tag && tag.issues.length > 0
            const key = it.personKey
            const pickable = key !== undefined && people.length > 1
            const active = pickable && key === current.key
            return (
              <figure
                key={it.key}
                ref={el => { if (key === undefined) return; if (el) figures.current.set(key, el); else figures.current.delete(key) }}
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
                  onClick={() => key !== undefined && setSelected(key)}
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
