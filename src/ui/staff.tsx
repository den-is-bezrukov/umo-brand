import { useEffect, useRef, useState } from 'react'
import { outlined } from '@/ui/form'
import { splitFullName } from '@/nametag/table'

// A staff list, shared by the generators that make one item per person (name tags, business cards): two modes,
// «Вручную», a list typed on the page with one person selected in the sidebar, and «Из таблицы», a filled-in template
// loaded as .xlsx (or its rows pasted), shown as it is. There's one list, not one per mode: clicking an item in the
// table mode takes the list to «Вручную», and the first edit makes it a list of its own, no longer the file.

export type Mode = 'manual' | 'table'

export type Row<P> = P & { key: number }

let nextKey = 0
export const row = <P,>(p: P): Row<P> => ({ ...p, key: nextKey++ })

/** The person, without the list's key */
export function plain<P extends object>(r: Row<P>): P {
  const { key: _, ...p } = r
  return p as unknown as P
}

export interface StaffOptions<P> {
  blank: P
  /** Reads an .xlsx; throws with a message for the user */
  readFile: (data: ArrayBuffer) => P[]
  /** Rows copied from a spreadsheet (tab-separated) */
  readPasted: (text: string) => P[]
}

/**
 * The name field takes a whole name: pasted into it, or left in it, while the surname is still empty, «Иван Петров» (or
 * «Петров Иван Сергеевич») goes into both fields (`splitFullName`, name first unless a patronymic says otherwise).
 * A name of two words without a hyphen stays whole once the surname is filled in first.
 */
export function fullNameField(person: { name: string; surname: string }, set: (patch: { name: string; surname: string }) => void) {
  const split = (text: string) => (person.surname.trim() ? null : splitFullName(text, true))
  return {
    onPaste: (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text/plain')
      if (text.includes('\t') || person.name.trim()) return
      const s = split(text)
      if (s) { e.preventDefault(); set(s) }
    },
    onBlur: () => { const s = split(person.name); if (s) set(s) },
  }
}

export function useStaff<P extends object>({ blank, readFile, readPasted }: StaffOptions<P>) {
  const [mode, setMode] = useState<Mode>('manual')
  const [people, setList] = useState<Row<P>[]>(() => [row(blank)])
  /** The file the list is, while it's unedited */
  const [file, setFile] = useState('')
  const setPeople = (next: Row<P>[]) => {
    setList(next)
    setFile('')
  }
  /** The one person the sidebar edits, picked by clicking their item; a click beside them leaves none selected */
  const [selectedKey, setSelected] = useState<number | null>(() => people[0].key)
  const current = people.find(p => p.key === selectedKey)
  const selected = current?.key
  const [tableError, setTableError] = useState('')
  const [dragging, setDragging] = useState(false)
  /** What's shown and downloaded: in the table mode only a loaded file */
  const items = mode === 'table' && !file ? [] : people

  /** The item reached through the line over «Скачать»: its empty fields show as errors even while it's being edited */
  const [flagged, setFlagged] = useState<number | null>(null)
  /**
   * Items added empty and not yet left: the one on a fresh page and each «Добавить» gives. Their empty fields aren't
   * errors while they're being filled in for the first time
   */
  const [fresh, setFresh] = useState<Set<number>>(() => new Set([people[0].key]))
  useEffect(() => {
    setFresh(f => [...f].some(k => k !== selected) ? new Set([...f].filter(k => k === selected)) : f)
  }, [selected])
  /** Whether an item's empty fields are errors yet */
  const showsMissing = (key: number) => !(key === selected && fresh.has(key) && key !== flagged)

  /** A file's rows replace the list, whatever was on it */
  const loadRows = (rows: P[], name: string) => {
    const loaded = rows.map(r => row(r))
    setList(loaded)
    setSelected(loaded[0]?.key)
    setFile(name)
    setTableError('')
  }
  const loadRowsRef = useRef(loadRows)
  loadRowsRef.current = loadRows

  // A file is a table, so loading one (dropped on the canvas in either mode) goes to «Из таблицы», where it shows
  const loadFile = async (f: File) => {
    setMode('table')
    try {
      const rows = readFile(await f.arrayBuffer())
      if (!rows.length) throw new Error('В таблице нет строк')
      loadRows(rows, f.name)
    } catch (err) {
      setTableError(err instanceof Error && /xlsx|лист|строк/.test(err.message) ? err.message : 'Не получилось прочитать файл: нужен .xlsx')
    }
  }

  // In the table mode rows pasted anywhere on the page (but into a field, which adds them) stand in for a file
  const readPastedRef = useRef(readPasted)
  readPastedRef.current = readPasted
  useEffect(() => {
    if (mode !== 'table') return
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text.includes('\t')) return
      const rows = readPastedRef.current(text)
      if (!rows.length) return
      e.preventDefault()
      loadRowsRef.current(rows, 'Вставленные строки')
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [mode])

  // A person just added takes the focus, and their item scrolls into view; added with «Добавить», it comes to the
  // middle of the canvas with the tile under it in view, so a long list fills in one after another without scrolling.
  // An item selected by a click stays put, under the cursor.
  const focusNext = useRef(false)
  const centre = useRef(false)
  /** The selected person's form, whose first field takes the focus */
  const form = useRef<HTMLDivElement>(null)
  /** Each item's row on the canvas, to scroll to */
  const figures = useRef(new Map<number, HTMLElement>())
  useEffect(() => {
    if (!focusNext.current) return
    focusNext.current = false
    form.current?.querySelector<HTMLElement>('textarea, input')?.focus()
    if (selected !== undefined) figures.current.get(selected)?.scrollIntoView({ block: centre.current ? 'center' : 'nearest', behavior: 'smooth' })
    centre.current = false
  }, [selected])
  const figureRef = (key: number) => (el: HTMLElement | null) => { if (el) figures.current.set(key, el); else figures.current.delete(key) }

  // Going to an item with an error: select it for editing and bring it into view
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
  /** The next item of `keys` after the selected one, round the list */
  const nextOf = (keys: number[]) => {
    const at = items.findIndex(it => it.key === selected)
    const after = keys.find(k => items.findIndex(it => it.key === k) > at)
    goTo(after ?? keys[0])
  }
  /** A click on an item: select it, in the manual mode */
  const pick = (key: number) => {
    setSelected(key)
    setFlagged(null)
    setMode('manual')
  }

  const update = (key: number, patch: Partial<P>) => setPeople(people.map(p => p.key === key ? { ...p, ...patch } : p))
  /**
   * The one just removed, for «Вернуть» in its place for a few seconds: there's no undo otherwise, and the cross stands
   * right by the item
   */
  const [removed, setRemoved] = useState<{ item: Row<P>; index: number } | null>(null)
  useEffect(() => {
    if (!removed) return
    const t = setTimeout(() => setRemoved(null), 5000)
    return () => clearTimeout(t)
  }, [removed])
  /** Removing the selected one selects its neighbour after (or before) it; removing another keeps the selection */
  const remove = (key: number) => {
    const i = people.findIndex(p => p.key === key)
    const rest = people.filter(p => p.key !== key)
    setRemoved({ item: people[i], index: i })
    setPeople(rest)
    if (key === selected) setSelected(rest[Math.min(i, rest.length - 1)].key)
  }
  /** The removed one back where it stood, selected */
  const restore = () => {
    if (!removed) return
    setPeople([...people.slice(0, removed.index), removed.item, ...people.slice(removed.index)])
    setSelected(removed.item.key)
    setRemoved(null)
  }
  /** A copy right after the item, selected, its first field focused: the colleague with the same position and phone */
  const duplicate = (key: number) => {
    const i = people.findIndex(p => p.key === key)
    const copy = row(plain(people[i]))
    focusNext.current = true
    setPeople([...people.slice(0, i + 1), copy, ...people.slice(i + 1)])
    setSelected(copy.key)
  }
  /** The item's fields emptied, as a fresh one, so they aren't errors until it's left */
  const clear = (key: number) => {
    setFresh(f => new Set(f).add(key))
    update(key, blank)
  }
  const add = () => {
    const r = row(blank)
    setFresh(f => new Set(f).add(r.key))
    focusNext.current = true
    centre.current = true
    setPeople([...people, r])
    setSelected(r.key)
  }
  const isBlank = (p: P) => (Object.keys(blank) as (keyof P)[]).every(k => p[k] === blank[k])

  /**
   * Delete or Backspace removes the selected item, as on any canvas, while the focus isn't in a field (where they edit
   * the text) and there's more than one, as «Удалить» does. `busy` holds it off, e.g. while text is edited in place
   */
  const useDeleteKey = (busy: boolean) => useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (mode !== 'manual' || !current || people.length < 2 || busy) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      remove(current.key)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  /** A table pasted into any field of a row replaces that row (if it's empty) and goes on after it */
  const paste = (key: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t')) return
    const rows = readPasted(text)
    if (!rows.length) return
    e.preventDefault()
    const added = rows.map(r => row(r))
    const i = people.findIndex(p => p.key === key)
    const replace = isBlank(people[i])
    setPeople([...people.slice(0, replace ? i : i + 1), ...added, ...people.slice(i + 1)])
    setSelected(added[0].key)
  }

  /** A file dropped here loads the table: the whole canvas in either mode, shown only in the table mode */
  const dropTarget = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true) },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) },
  }

  return {
    mode, setMode, people, items, file, current, selected, setSelected, tableError, dragging, dropTarget, loadFile,
    showsMissing, form, figureRef, nextOf, pick, update, remove, add, isBlank, paste, useDeleteKey,
    duplicate, clear, removed, restore,
  }
}

export type Staff<P extends object> = ReturnType<typeof useStaff<P>>

function FileInput({ staff }: { staff: Staff<object> }) {
  return (
    <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
      onChange={e => { const f = e.target.files?.[0]; if (f) staff.loadFile(f); e.target.value = '' }} />
  )
}

/**
 * The template as an .xlsx with its type set: a server that sends it without one (Vite's dev server) has browsers sniff
 * the zip inside and save a .zip
 */
async function downloadTemplate(url: string, name: string) {
  const data = await (await fetch(url)).arrayBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** The table mode's sidebar: the loaded file, to replace it (until there's one the preview is the upload), and the template */
export function TableSource<P extends object>({ staff, template }: { staff: Staff<P>; template: string }) {
  const s = staff as unknown as Staff<object>
  const name = template.split('/').pop()!
  return (
    <div className="flex flex-col gap-2 tracking-normal">
      {s.file && (
        <label
          {...s.dropTarget}
          className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed p-4 text-center text-[14px] leading-5
            ${s.dragging ? 'border-black bg-[#f5f5f5]' : s.tableError ? 'border-[#e30]' : 'border-black/20 hover:border-black/40'}`}
        >
          <FileInput staff={s} />
          <span className="font-medium break-all">{s.file}</span>
          <span className="text-[#999]">{s.people.length} {staffWord(s.people.length)} · заменить</span>
        </label>
      )}
      {s.tableError && <p className="text-[13px] leading-5 text-[#e30]">{s.tableError}</p>}
      <a href={template} download={name} onClick={e => { e.preventDefault(); downloadTemplate(template, name) }} className={`${outlined} ${s.file ? 'mt-2' : ''}`}>Скачать шаблон таблицы</a>
    </div>
  )
}

/** The whole preview as the upload, until a file is loaded */
export function UploadArea<P extends object>({ staff }: { staff: Staff<P> }) {
  const s = staff as unknown as Staff<object>
  return (
    <label className={`flex min-h-[240px] flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-dashed text-[14px] font-medium leading-5
      ${s.dragging ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}>
      <FileInput staff={s} />
      Загрузить таблицу .xlsx
    </label>
  )
}

/** «Добавить» as the next item on the canvas: a dashed plate of the item's shape; the manual list only */
export function AddTile({ onClick, aspect, radius }: { onClick: () => void; aspect: string; radius?: string }) {
  return (
    <div className="@container mx-auto w-full max-w-[480px] self-start">
      <button
        type="button"
        data-add
        onClick={onClick}
        style={{ aspectRatio: aspect, borderRadius: radius }}
        className="flex w-full cursor-pointer items-center justify-center gap-2 self-start border border-black/10 text-[14px] font-medium leading-5 text-black hover:border-black/40"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" /></svg>
        Добавить
      </button>
    </div>
  )
}

/**
 * Until every item is ready, the progress in the download button's place: it counts the items still in work, which a
 * click leads through («1 из 4 в работе», or «4 в работе» when it's all of them)
 */
export function Progress({ failing, total, onClick }: { failing: number; total: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center justify-center px-3 py-[10px] text-[14px] leading-5 text-[#808080] hover:text-black">
      {failing}{failing < total ? ` из ${total}` : ''} в работе
    </button>
  )
}

/** The Russian ending for a count: '' (1, 21), 'а' (2–4, 22–24), 'ей' (5–20…) as in бейдж, бейджа, бейджей */
export function plural(n: number): '' | 'а' | 'ей' {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return ''
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'а'
  return 'ей'
}

/** сотрудник, сотрудника, сотрудников */
function staffWord(n: number): string {
  return 'сотрудник' + ({ '': '', 'а': 'а', 'ей': 'ов' } as Record<string, string>)[plural(n)]
}

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'bevel' as const }

/** The item's actions (Figma 5030:11424): 40 px buttons, the icon #808080, black on a white tile on hover */
function Action({ label, hidden, onClick, children }: { label: string; hidden?: boolean; onClick: () => void; children: React.ReactNode }) {
  if (hidden) return null
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // A click here is the action's, not the row's, which would select the item again
      onClick={e => { e.stopPropagation(); onClick() }}
      className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#808080] outline-none hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-black/30`}
    >
      {children}
    </button>
  )
}

/**
 * An item on the canvas with its number (from 1, as the table's rows; wide screens only) and its actions in one column
 * to its right (Figma 5030:11397; they were the number left and the actions right, 5008:10960), shown while the pointer is in its row (or the focus in it), on any item, acting on it
 * without selecting it; with no pointer to hover (touch screens), under the selected one only. The actions: «Дублировать», «Сбросить» (while there's something to
 * empty), «Удалить» (while there's another), the most used and harmless first, the cross furthest. On phones, where
 * there's no room beside the item, they stand in a row under it. An action not offered leaves no gap: the next moves up.
 */
export function ItemFrame<P extends object>({ staff, item, n, children }: { staff: Staff<P>; item: Row<P>; n: number; children: React.ReactNode }) {
  const active = staff.mode === 'manual' && item.key === staff.selected
  const hover = '[@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover/row:flex [@media(hover:hover)]:group-focus-within/row:flex'
  return (
    <div className="relative">
      {children}
      {/* One column right of the item, 10 px off it, from its top (Figma 5030:11397): the number, then the actions */}
      <div className="md:absolute md:top-0 md:left-full md:ml-[10px] md:flex md:w-10 md:flex-col">
      {/* A lone item has no number: a «1» there says nothing */}
      {staff.items.length > 1 && <span aria-hidden className="pointer-events-none hidden h-7 text-center text-[14px] leading-5 text-[#808080] [font-feature-settings:'tnum'_1] md:block">{n}</span>}
      {staff.mode === 'manual' && (
        <div className={`mt-2 justify-end md:mt-0 md:flex-col ${active ? 'flex' : 'hidden'} ${hover}`}>
          <Action label="Дублировать" onClick={() => staff.duplicate(item.key)}>
            <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><rect x="6" y="2" width="8" height="8" strokeLinecap="square" /><path d="M3 6H2V14H10V13" /></svg>
          </Action>
          <Action label="Сбросить" hidden={staff.isBlank(item)} onClick={() => staff.clear(item.key)}>
            <svg width="14" height="14" viewBox="0 0 14 14" {...ICON} aria-hidden><path d="M2.5 8.5C2.5 10.9853 4.51472 13 7 13C9.48528 13 11.5 10.9853 11.5 8.5C11.5 6.01472 9.48528 4 7 4L2.5 4" /><path d="M4.75 1.5L2.25 4L4.75 6.5" strokeLinecap="square" /></svg>
          </Action>
          <Action label="Удалить" hidden={staff.people.length < 2} onClick={() => staff.remove(item.key)}>
            <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M12 4L8 8M8 8L4 4M8 8L12 12M8 8L4 12" strokeLinecap="square" /></svg>
          </Action>
        </div>
      )}
      </div>
    </div>
  )
}

/** In place of an item just removed, as tall as it was, for five seconds: «Удалено · Вернуть» */
export function Removed<P extends object>({ staff, at, aspect, radius }: { staff: Staff<P>; at: number; aspect: string; radius?: string }) {
  if (staff.removed?.index !== at || staff.mode !== 'manual') return null
  return (
    <div className="@container mx-auto w-full max-w-[480px]">
      <div style={{ aspectRatio: aspect, borderRadius: radius }} className="flex w-full items-center justify-center gap-2 text-[14px] leading-5 text-[#808080]">
        Удалено ·
        <button type="button" onClick={e => { e.stopPropagation(); staff.restore() }} className="cursor-pointer text-black outline-none hover:text-[#808080] focus-visible:ring-2 focus-visible:ring-black/30">Вернуть</button>
      </div>
    </div>
  )
}
