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

const DEFAULT: Person = { name: 'Имя', surname: 'Фамилия', position: 'Продавец-консультант\nновых автомобилей' }
const BLANK: Person = { name: '', surname: '', position: '' }
const RED = '#e30'

interface Row extends Person { key: number }

let nextKey = 0
const row = (p: Person): Row => ({ ...p, key: nextKey++ })

const same = (a: Person, b: Person) => a.name === b.name && a.surname === b.surname && a.position === b.position

export default function NameTag() {
  // Not kept in the address, unlike the other generators: a staff list isn't something to send as a link
  const [people, setPeople] = useState<Row[]>(() => [row(DEFAULT)])
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
    ? people.map((p, i) => ({ key: `m${p.key}`, label: String(i + 1), person: p as Person }))
    : (table?.rows ?? []).map(r => ({ key: `t${r.line}`, label: `Строка ${r.line}`, person: r.person })), [mode, people, table])
  const tags = useMemo(() => fonts ? items.map(it => buildTag(fonts, it.person)) : undefined, [fonts, items])
  const ok = !!tags && tags.length > 0 && tags.every(t => t.issues.length === 0)

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

  // A row just added takes the focus
  const focusKey = useRef<number | null>(null)
  const fields = useRef(new Map<number, HTMLDivElement>())
  useEffect(() => {
    if (focusKey.current === null) return
    fields.current.get(focusKey.current)?.querySelector('input')?.focus()
    focusKey.current = null
  }, [people])

  const update = (key: number, patch: Partial<Person>) => setPeople(ps => ps.map(p => p.key === key ? { ...p, ...patch } : p))
  const remove = (key: number) => setPeople(ps => ps.filter(p => p.key !== key))
  const add = () => {
    const r = row(BLANK)
    focusKey.current = r.key
    setPeople(ps => [...ps, r])
  }
  /** A table pasted into any field of a row replaces that row (if it's empty or the example) and goes on after it */
  const paste = (key: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t')) return
    const rows = parsePasted(text).map(r => r.person)
    if (!rows.length) return
    e.preventDefault()
    setPeople(ps => {
      const i = ps.findIndex(p => p.key === key)
      const replace = same(ps[i], BLANK) || same(ps[i], DEFAULT)
      return [...ps.slice(0, replace ? i : i + 1), ...rows.map(row), ...ps.slice(i + 1)]
    })
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
              {people.map((p, i) => {
                const issues = tags?.[i]?.issues ?? []
                return (
                  <div
                    key={p.key}
                    ref={el => { if (el) fields.current.set(p.key, el); else fields.current.delete(p.key) }}
                    onPasteCapture={e => paste(p.key, e)}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-baseline justify-between text-[14px] leading-5">
                      <span className="font-medium">№&nbsp;{i + 1}</span>
                      {people.length > 1 && (
                        <button type="button" onClick={() => remove(p.key)} className="cursor-pointer text-[#999] hover:text-black">Удалить</button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={issues.some(t => /^(Имя|Нет имени)/.test(t))} />
                      <TextInput value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => /^(Фамилия|Нет имени)/.test(t))} />
                    </div>
                    <TextArea value={p.position} onChange={v => update(p.key, { position: v })} placeholder="Должность" invalid={issues.some(t => t.startsWith('Должность'))} />
                  </div>
                )
              })}
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
              <a href={TEMPLATE} download className={`${outlined} mt-2`}>Скачать шаблон</a>
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
            return (
              <figure key={it.key} className="flex flex-col gap-3">
                <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
                  <span className="font-medium">{it.label}</span>
                  <span className="text-[#999]">{TAG.w} × {TAG.h} мм</span>
                </figcaption>
                <TagArt text={tag ? toD(tag.cmds) : undefined} color={bad ? RED : undefined} />
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
