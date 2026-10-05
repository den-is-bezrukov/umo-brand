import { useEffect, useMemo, useRef, useState } from 'react'
import { TextInput, TextArea, GeneratorHeader, DownloadButton, outlined } from '@/ui/form'
import { toD } from '@/livery/geometry'
import { TAG, buildTag, loadFonts, type Fonts, type Person } from '@/nametag/tag'
import TagArt from '@/nametag/TagArt'

// Name tag generator (Figma: UMO | Evrone, node 4021:2878): a dealership's staff list in, one zip out with the tags
// in outlines, a page each, and the maker's requirements. A list pasted from a spreadsheet (columns: name, surname,
// position) fills in one row per person.

const DEFAULT: Person = { name: 'Имя', surname: 'Фамилия', position: 'Продавец-консультант\nновых автомобилей' }
const BLANK: Person = { name: '', surname: '', position: '' }
const RED = '#e30'

interface Row extends Person { key: number }

let nextKey = 0
const row = (p: Person): Row => ({ ...p, key: nextKey++ })

/**
 * Rows of a spreadsheet: tab-separated cells. Three or more are name, surname and position; two with a space in the
 * first are «Имя Фамилия» and position, otherwise name and surname.
 */
function parseTable(text: string): Person[] {
  return text.split(/\r?\n/).map(l => l.split('\t').map(c => c.trim())).filter(c => c.some(Boolean)).map(c => {
    if (c.length >= 3) return { name: c[0], surname: c[1], position: c.slice(2).filter(Boolean).join(' ') }
    if (c.length === 2 && c[0].includes(' ')) {
      const [name, ...rest] = c[0].split(/\s+/)
      return { name, surname: rest.join(' '), position: c[1] }
    }
    return { name: c[0] ?? '', surname: c[1] ?? '', position: '' }
  })
}

const same = (a: Person, b: Person) => a.name === b.name && a.surname === b.surname && a.position === b.position

export default function NameTag() {
  // Not kept in the address, unlike the other generators: a staff list isn't something to send as a link
  const [people, setPeople] = useState<Row[]>(() => [row(DEFAULT)])

  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFonts().then(setFonts) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Бейдж UMO'
    return () => { document.title = prev }
  }, [])

  const tags = useMemo(() => fonts ? people.map(p => buildTag(fonts, p)) : undefined, [fonts, people])
  const ok = !!tags && tags.every(t => t.issues.length === 0)

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
  const reset = () => setPeople([row(DEFAULT)])

  /** A table pasted into any field of a row replaces that row (if it's empty or the example) and goes on after it */
  const paste = (key: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t')) return
    const rows = parseTable(text)
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

          <p className="text-[14px] leading-5 tracking-normal text-[#999]">
            Список можно вставить из таблицы: колонки Имя, Фамилия, Должность. Должность переносится сама или по Enter.
          </p>

          <div className="flex flex-col gap-6 tracking-normal">
            {people.map((p, i) => {
              const issues = tags?.[i].issues ?? []
              return (
                <div
                  key={p.key}
                  ref={el => { if (el) fields.current.set(p.key, el); else fields.current.delete(p.key) }}
                  onPasteCapture={e => paste(p.key, e)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-baseline justify-between text-[14px] leading-5">
                    <span className="font-medium">Сотрудник {i + 1}</span>
                    {people.length > 1 && (
                      <button type="button" onClick={() => remove(p.key)} className="cursor-pointer text-[#999] hover:text-black">Удалить</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={issues.some(t => /^(Имя|Нет имени)/.test(t))} />
                    <TextInput value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={issues.some(t => /^(Фамилия|Нет имени)/.test(t))} />
                  </div>
                  <TextArea value={p.position} onChange={v => update(p.key, { position: v })} placeholder="Должность" invalid={issues.some(t => t.startsWith('Должность'))} />
                </div>
              )
            })}
            <button type="button" onClick={add} className={outlined}>Добавить сотрудника</button>
          </div>

          <div className="pt-2 tracking-normal">
            <button type="button" onClick={reset} title="Вернуть пример вместо списка" className={outlined}>Сбросить</button>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:pt-0">
          <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>
            Скачать{people.length > 1 ? ` ${people.length} бейдж${plural(people.length)}` : ''}
          </DownloadButton>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-x-8 gap-y-10">
          {people.map((p, i) => {
            const tag = tags?.[i]
            const bad = !!tag && tag.issues.length > 0
            return (
              <figure key={p.key} className="flex flex-col gap-3">
                <figcaption className="flex items-baseline gap-2 text-[14px] leading-5">
                  <span className="font-medium">{i + 1}</span>
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

/** бейдж, бейджа, бейджей */
function plural(n: number): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return ''
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'а'
  return 'ей'
}
