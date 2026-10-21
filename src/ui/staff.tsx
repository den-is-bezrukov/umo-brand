import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { InSlide } from '@/ui/phone'
import { MOD, withMod } from '@/ui/keys'
import { outlined, flash } from '@/ui/form'
import { splitFullName } from '@/nametag/table'
import { ICON } from './icons'
import { addTitle, itemName } from '@/data/generators'

// A staff list, shared by the generators that make one item per person (name tags, business cards): two modes,
// «Вручную», a list typed on the page with one person selected in the sidebar, and «Из таблицы», a filled-in template
// loaded as .xlsx (or its rows pasted), shown as it is. There's one list, not one per mode: clicking an item in the
// table mode takes the list to «Вручную», and the first edit makes it a list of its own, no longer the file.

export type Mode = 'manual' | 'table'

/** How long «Удаляем · Вернуть» stays; the ring round its bin runs out over it */
const REMOVED_MS = 4000

export type Row<P> = P & { key: number }

let nextKey = 0
/** The item ⌘C copied last, with the text it put on the clipboard: ⌘V on the same page takes it back whole while that's still there */
let copied: { item: any; text: string; page: string } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any
export const row = <P,>(p: P): Row<P> => ({ ...p, key: nextKey++ })

/** The person, without the list's key */
export function plain<P extends object>(r: Row<P>): P {
  const { key: _, ...p } = r
  return p as unknown as P
}

export interface StaffOptions<P> {
  blank: P
  /** Reads an .xlsx (or what `accept` lets in); throws with a message for the user */
  readFile: (data: ArrayBuffer) => P[] | Promise<P[]>
  /** Rows copied from a spreadsheet (tab-separated) */
  readPasted: (text: string) => P[]
  /** The list the page opens with (the price cards from a link); one blank item otherwise */
  initial?: P[]
  /** The files the upload takes, an .xlsx by default (the price tags take their own PDF back too) */
  accept?: string
  /** What the upload says */
  uploadLabel?: string
  /** The loaded list's count, «3 сотрудника» by default */
  countWord?: (n: number) => string
  /** The columns ⌘C writes an item as, title by field, a header row over its row, so a spreadsheet or another
   * generator whose table reads those titles takes it */
  columns?: Partial<Record<keyof P, string>>
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

export function useStaff<P extends object>({ blank, readFile, readPasted, initial, accept = XLSX, uploadLabel = 'Загрузить таблицу .xlsx', countWord = staffWord, columns }: StaffOptions<P>) {
  const [mode, setMode] = useState<Mode>('manual')
  const [people, setList] = useState<Row<P>[]>(() => initial?.length ? initial.map(p => row(p)) : [row(blank)])
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
      const rows = await readFile(await f.arrayBuffer())
      if (!rows.length) throw new Error('В таблице нет строк')
      loadRows(rows, f.name)
    } catch (err) {
      setTableError(err instanceof Error && /xlsx|лист|строк|PDF/.test(err.message) ? err.message : 'Не получилось прочитать файл: нужен .xlsx')
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

  // A person just added takes the focus. The item being edited comes to the middle of the canvas whenever it's selected
  // (clicked, added, duplicated, pasted, brought back, picked or moved with the arrows; «Добавить» stays in view under
  // it), so a long list fills in one after another without scrolling. A click left it under the cursor once
  const focusNext = useRef(false)
  const centre = useRef(false)
  /** The selected person's form, whose first field takes the focus */
  const form = useRef<HTMLDivElement>(null)
  /** Each item's row on the canvas, to scroll to */
  const figures = useRef(new Map<number, HTMLElement>())
  /**
   * The item to the middle of the canvas. The first and the last ones have no room over or under them to get there, so
   * the canvas grows at its top or foot by just what's missing, nothing more, so there's no scrolling off into the empty
   * (and gives it back once a middle one is centred, or none is selected). The list doesn't jump as it grows or shrinks:
   * the scroll makes up for it where it can, and what's left glides back into place
   */
  const ROOM = { top: 0, bottom: 0 }
  const room = useRef(ROOM)
  const roomFor = (canvas: HTMLElement, key: number | undefined) => {
    const el = key === undefined ? undefined : figures.current.get(key)
    const list = canvas.firstElementChild as HTMLElement | null
    const before = list?.getBoundingClientRect().top
    const set = (r: typeof ROOM) => {
      const pad = getComputedStyle(canvas)
      canvas.style.paddingTop = `${parseFloat(pad.paddingTop) - room.current.top + r.top}px`
      canvas.style.paddingBottom = `${parseFloat(pad.paddingBottom) - room.current.bottom + r.bottom}px`
      room.current = r
    }
    set(ROOM)
    // Only on wide screens: a phone's canvas is its slides. The list centred in the canvas while it fits moves by half
    // of what's added over it, so the room is found in a few steps
    if (el && matchMedia('(min-width: 768px)').matches) {
      for (let i = 0; i < 8; i++) {
        const r = el.getBoundingClientRect()
        const want = r.top - canvas.getBoundingClientRect().top + canvas.scrollTop + r.height / 2 - canvas.clientHeight / 2
        const over = -want
        const under = want - (canvas.scrollHeight - canvas.clientHeight)
        if (over < 1 && under < 1) break
        set({ top: room.current.top + Math.max(0, over), bottom: room.current.bottom + Math.max(0, under) })
      }
    }
    if (!list || before === undefined) return
    canvas.scrollTop += list.getBoundingClientRect().top - before
    const left = before - list.getBoundingClientRect().top
    if (Math.abs(left) >= 1) list.animate([{ transform: `translateY(${left}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.33, 0, 0.67, 1)' })
  }
  const centreOn = (key: number) => {
    const el = figures.current.get(key)
    const canvas = el?.closest('main')
    if (!el || !canvas) return
    roomFor(canvas, key)
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  useEffect(() => {
    if (focusNext.current) form.current?.querySelector<HTMLElement>('textarea, input')?.focus()
    if (centre.current && selected !== undefined) centreOn(selected)
    // None selected: the room given back
    if (selected === undefined) { const canvas = [...figures.current.values()][0]?.closest('main'); if (canvas) roomFor(canvas, undefined) }
    focusNext.current = false
    centre.current = false
  }, [selected])
  const figureRef = (key: number) => (el: HTMLElement | null) => { if (el) figures.current.set(key, el); else figures.current.delete(key) }

  // Going to an item with an error: select it for editing and bring it into view, its first field at fault taking the
  // focus once the errors show. Rendered at once (flushSync) and focused in the tap itself: iOS raises the keyboard
  // only for a focus within the gesture (a tick later, the field only lights up)
  const goTo = (key: number) => {
    flushSync(() => {
      setSelected(key)
      setFlagged(key)
      setMode('manual')
    })
    const wide = matchMedia('(min-width: 768px)').matches
    if (wide) centreOn(key)
    // On phones a plain focus, so the browser brings the field above the keyboard as it does for a tap (scrolled by
    // script to the middle before the keyboard is up, it ends under it)
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(wide ? { preventScroll: true } : undefined)
  }
  /** The next item of `keys` after the selected one, round the list */
  const nextTarget = (keys: number[]) => {
    const at = items.findIndex(it => it.key === selected)
    return keys.find(k => items.findIndex(it => it.key === k) > at) ?? keys[0]
  }
  const nextOf = (keys: number[]) => goTo(nextTarget(keys))
  /** The item in work a click on the note over the download leads to: its place in the list, whose first fault the note names */
  const inWork = (keys: number[]) => ({ index: items.findIndex(it => it.key === nextTarget(keys)) })
  /** A click on an item: select it, in the manual mode, to the middle of the canvas, the one already selected too (a lone business card, selected from the start, stayed under its face) */
  const pick = (key: number) => {
    if (key === selected) centreOn(key)
    centre.current = true
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
    const t = setTimeout(() => setRemoved(null), REMOVED_MS)
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
    centre.current = true
    setSelected(removed.item.key)
    setRemoved(null)
  }
  /**
   * A copy right after the item, selected, its first field focused: the colleague with the same position and phone. On
   * a phone (`focus` false) the copy is only shown: the keyboard coming up over it hides what happened, and errors
   * pouring over a copy of an unfinished item say more than it does
   */
  const duplicate = (key: number, focus = true) => {
    const i = people.findIndex(p => p.key === key)
    const copy = row(plain(people[i]))
    focusNext.current = focus
    centre.current = focus
    // Not focused, it's fresh as an added one: its empty fields aren't errors until it's left, as on a new page
    if (!focus) setFresh(f => new Set(f).add(copy.key))
    setPeople([...people.slice(0, i + 1), copy, ...people.slice(i + 1)])
    setSelected(copy.key)
  }
  /** The item's fields emptied, as a fresh one, so they aren't errors until it's left */
  const clear = (key: number) => {
    setFresh(f => new Set(f).add(key))
    update(key, blank)
  }
  /**
   * A new item at the end: empty, or a copy of `from` (the price card's next card starts as the last one), fresh unless
   * said otherwise (a business card's new person starts with the salon's phone, still fresh)
   */
  /** A new item, `from` or blank, at the end or right after the item `after` (the plus in its column) */
  const add = (from?: P, fresh = !from, after?: number) => {
    const r = row(from ?? blank)
    if (fresh) setFresh(f => new Set(f).add(r.key))
    // Not on phones: a focus out of the tap brings no keyboard there, only the form over the whole screen
    focusNext.current = matchMedia('(min-width: 768px)').matches
    centre.current = true
    const at = after === undefined ? -1 : people.findIndex(p => p.key === after)
    setPeople(at < 0 ? [...people, r] : [...people.slice(0, at + 1), r, ...people.slice(at + 1)])
    setSelected(r.key)
  }
  /**
   * Every item changed by `patch` where it returns something (a dealer's phone into the people who had none). Not an
   * edit: a loaded file stays the file
   */
  const fill = (patch: (p: Row<P>) => Partial<P> | null) => setList(list => list.map(p => { const c = patch(p); return c ? { ...p, ...c } : p }))
  const isBlank = (p: P) => (Object.keys(blank) as (keyof P)[]).every(k => p[k] === blank[k])

  /**
   * The list's keys, as on any canvas. Out of a field: Delete or Backspace removes the selected item (while there's more
   * than one, as «Удалить»), ↑ ↓ select the one before or after it, ⌘Z brings back the one just removed (in a field ⌘Z
   * undoes the typing). Anywhere: ⌘D duplicates the selected one, Esc leaves a field (unless a list in it took Esc) so
   * the arrows pick again. `busy` holds them off, e.g. while text is edited in place
   */
  const useKeys = (busy: boolean) => useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return
      const t = e.target as HTMLElement
      const inField = !!t.closest('input, textarea, select, [contenteditable]')
      if (e.key === 'Escape' && inField && !e.defaultPrevented) { t.blur(); return }
      // The generators' line has its own arrows and Enter
      if (mode !== 'manual' || !current || t.closest('nav')) return
      if (withMod(e, 'KeyD')) { e.preventDefault(); duplicate(current.key); return }
      if (inField) return
      if (withMod(e, 'KeyZ') && !e.shiftKey && removed) { e.preventDefault(); restore(); return }
      const i = people.findIndex(p => p.key === current.key)
      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      // ⌥↑ ⌥↓ move it in the list: the order the sheet and the tags print in
      if (step && e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        const j = i + step
        if (j < 0 || j >= people.length) return
        const moved = [...people]
        ;[moved[i], moved[j]] = [moved[j], moved[i]]
        setPeople(moved)
        requestAnimationFrame(() => centreOn(current.key))
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && people.length > 1) { e.preventDefault(); remove(current.key) }
      // Enter goes into the item, its first field, as into a selected frame in Figma; not from a button, which it presses
      if (e.key === 'Enter' && (t === document.body || t.matches('main figure [aria-pressed]'))) {
        e.preventDefault()
        form.current?.querySelector<HTMLElement>('textarea, input')?.focus()
      }
      if (step) {
        e.preventDefault()
        const next = people[i + step]
        if (next) pick(next.key)
      }
    }
    // ⌘C out of a field (and with no text selected) copies the item: as rows a spreadsheet takes, under `columns`'
    // titles, and kept as it is for ⌘V here, which puts a copy after the selected one (rows from a spreadsheet too)
    const out = (e: ClipboardEvent) => (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable], nav')
    const onCopy = (e: ClipboardEvent) => {
      if (busy || mode !== 'manual' || !current || out(e) || !document.getSelection()?.isCollapsed || !e.clipboardData) return
      const item = plain(current)
      const keys = (Object.keys(columns ?? {}) as (keyof P)[])
      const cell = (v: unknown) => String(v ?? '').replace(/\s*\n\s*/g, ' ')
      const text = keys.length
        ? `${keys.map(k => columns![k]).join('\t')}\n${keys.map(k => cell(item[k])).join('\t')}`
        : Object.values(item).filter(v => typeof v === 'string' && v).join('\t')
      e.preventDefault()
      e.clipboardData.setData('text/plain', text)
      copied = { item, text, page: location.pathname }
      flash('Карточка скопирована')
    }
    const onPaste = (e: ClipboardEvent) => {
      if (busy || mode !== 'manual' || !current || out(e) || e.defaultPrevented) return
      const text = e.clipboardData?.getData('text/plain') ?? ''
      // Another generator's item comes in through its rows, as a spreadsheet's
      const rows = copied && text === copied.text && copied.page === location.pathname ? [copied.item as P] : text.includes('\t') ? readPasted(text) : []
      if (!rows.length) return
      e.preventDefault()
      const added = rows.map(r => row(r))
      const i = people.findIndex(p => p.key === current.key)
      centre.current = true
      setPeople([...people.slice(0, i + 1), ...added, ...people.slice(i + 1)])
      setSelected(added[0].key)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
    }
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
    showsMissing, form, figureRef, goTo, nextOf, inWork, pick, update, fill, remove, add, isBlank, paste, useKeys,
    duplicate, clear, removed, restore, dismiss: () => setRemoved(null), accept, uploadLabel, countWord,
  }
}

export type Staff<P extends object> = ReturnType<typeof useStaff<P>>

function FileInput({ staff }: { staff: Staff<object> }) {
  return (
    <input type="file" accept={staff.accept} className="sr-only"
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
          <span className="text-[#808080]">{s.countWord(s.people.length)} · заменить</span>
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
      {s.uploadLabel}
    </label>
  )
}

/**
 * An item's edge on the canvas, the same on every generator: 1 px inside it at 10% black, 40% while the pointer is in
 * its row (the secondary buttons' edge; not black, too loud for a poster). Inside, so an item as wide as the phone's
 * 480 px sheet hides whole behind it (outside, it shows at the sheet's sides as a line)
 */
export const ITEM_EDGE = 'outline-1 -outline-offset-1 outline-black/10 group-hover/row:outline-black/40'
/** `ITEM_EDGE` on a layer over the item, for an item whose art is positioned inside it (the price card's poster, the
 * memo's pages), which would cover an edge on the item itself; the item is `relative`. 20% on hover: 40 is harsh round
 * a page this big */
export const ITEM_EDGE_OVER = "relative after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:outline-1 after:-outline-offset-1 after:outline-black/10 group-hover/row:after:outline-black/20"

/** ⌘↩ (Ctrl+Enter) adds an item from anywhere, a field too: one card done, the next one (⌘N is the browser's own) */
export function useAddKey(add: (() => void) | undefined) {
  const latest = useRef(add)
  latest.current = add
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!withMod(e, 'Enter') || e.defaultPrevented || !latest.current) return
      e.preventDefault()
      latest.current()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])
}

/** Add, a plus in the canvas icons' 1 px stroke */
export const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M8 2.5V13.5M2.5 8H13.5" /></svg>
)

/** The line over the download while items are in work: «1 из 4 в работе», or «4 в работе» when it's all of them */
/** The table mode's upload, opened from «Загрузите таблицу» over the download */
export const pickTable = () => document.querySelector<HTMLInputElement>('main input[type="file"]')?.click()


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
  return `${n} сотрудник` + ({ '': '', 'а': 'а', 'ей': 'ов' } as Record<string, string>)[plural(n)]
}

const XLSX = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


export const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" {...ICON} aria-hidden><path d="M2.5 8.5C2.5 10.9853 4.51472 13 7 13C9.48528 13 11.5 10.9853 11.5 8.5C11.5 6.01472 9.48528 4 7 4L2.25 4M4.75 6.5L2.25 4L4.75 1.5" /></svg>
)

/**
 * «Сбросить» at the end of a sheet's caption on the canvas (the livery's sides and glass, the plate frame's strip), as
 * the items' own reset beside them: the same icon, #808080, black on hover; always in view while there's something to
 * reset (unlike the items' actions, shown on hover: a page with one layout has nothing to pick, and the icon showing
 * says the layout was changed). Put it in a `relative` span with the
 * caption's text
 */
export function CaptionReset({ onClick, label = 'Сбросить', extra }: { onClick?: () => void; label?: string; extra?: React.ReactNode }) {
  // Hung after the caption's text, out of its flow, so the caption stays centred whether or not it shows; 1 px over
  // the text's middle. `extra` goes first («Скачать шаблон», always there), the reset after it, while there's one
  return (
    <span className="absolute top-[calc(50%-1px)] left-full ml-1 flex -translate-y-1/2">
      {extra}
      {onClick && (
        <button
          type="button"
          title={label}
          aria-label={label}
          onClick={onClick}
          className="flex size-[30px] cursor-pointer items-center justify-center rounded-[8px] text-[#808080] hover:text-black"
        >
          <ResetIcon />
        </button>
      )}
    </span>
  )
}

export { DuplicateIcon } from './icons'

/** Delete, a bin (its outline as exported from Figma), the canvas icons' 1 px stroke; on wide screens and phones alike */
export const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M3.5 5.5V10.5C3.5 12.3856 3.5 13.3284 4.08579 13.9142C4.67157 14.5 5.61438 14.5 7.5 14.5H8.5C10.3856 14.5 11.3284 14.5 11.9142 13.9142C12.5 13.3284 12.5 12.3856 12.5 10.5V5.5M2.5 3.5H13.5M5.5 3V1.5H10.5V3M9.5 6.5V11.5M6.5 6.5V11.5" /></svg>
)


/** The item's actions: 30 px buttons (a phone's slide has its own, over the picture), the icon #808080, black on hover, no tile, as the other quiet controls */
/** The number of the item whose column an action stands in, while there are several, for its screen readers' name */
export const ItemNumber = createContext<number | undefined>(undefined)

/** `name`: what screen readers and agents call it, the tooltip's word with the item it acts on («Удалить визитку 2»):
 * a page of «Удалить, Удалить, Удалить» read out of their places says nothing; the tooltip stays the word alone */
export function Action({ label, name, keys, hidden, onClick, children }: { label: string; name?: string; keys?: string; hidden?: boolean; onClick: () => void; children: React.ReactNode }) {
  if (hidden) return null
  return (
    <button
      type="button"
      title={keys ? `${label} ${keys}` : label}
      aria-label={name ?? label}
      aria-keyshortcuts={keys?.replace('⌘', 'Meta+').replace('Ctrl+', 'Control+')}
      // A click here is the action's, not the row's, which would select the item again
      onClick={e => { e.stopPropagation(); onClick() }}
      className={`flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#808080] hover:text-black`}
    >
      {children}
    </button>
  )
}

/**
 * An item on the canvas with its number (from 1, as the table's rows; wide screens only) and its actions in one column
 * to its right, shown while the pointer is in its row (or the focus in it), on any item, acting on it
 * without selecting it; with no pointer to hover (touch screens), under the selected one only. The actions: «Дублировать», «Сбросить» (while there's something to
 * empty), «Удалить» (while there's another), the most used and harmless first, then «Добавить», a new item rather than an action on this one, last. A phone's slide
 * shows the item bare, its number and actions in the row over it. An action not offered leaves no gap: the next moves up.
 */
export function ItemFrame<P extends object>({ staff, item, n, label, onAdd, extra, children }: {
  staff: Staff<P>; item: Row<P>; n: number
  /** Said in the number's place, a lone item's too (the memo's «1.2», its page in view) */
  label?: string
  /** «Добавить», last in the column, the manual list only: a new item right after this one (⌘↩ is the page's, `useAddKey`, at the end) */
  onAdd?: (after: number) => void
  /** The list's own actions after it, in either mode («Скачать шаблон») */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  // On a phone's slide the item stands alone: its number is over the strip, its actions under it
  if (useContext(InSlide)) return <div className="@container relative">{children}</div>
  const active = staff.mode === 'manual' && item.key === staff.selected
  const num = staff.items.length > 1 ? n : undefined
  const of = itemName(location.pathname, num)
  const hover = '[@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover/row:flex [@media(hover:hover)]:group-focus-within/row:flex'
  return (
    // The column hangs outside the item
    <div className="relative">
      {/* The item's own box, a container for what's set in its units (the name tag's corners, text edited in place) */}
      <div className="@container relative">{children}</div>
      {/* One column right of the item, 8 px off it, from its top: the number, then the actions. The
          8 px are its own padding, not a margin, so the pointer crossing them stays on the item: an item as wide as
          the canvas (the memo's spread) ends where its figure does, and the actions hid on the way to them */}
      <div className="absolute top-0 bottom-0 left-full flex w-[38px] flex-col items-center pl-2">
      {/* A lone item has no number: a «1» there says nothing */}
      {(staff.items.length > 1 || label) && <span aria-hidden className="pointer-events-none pb-[5px] text-center text-[14px] leading-5 text-[#808080] [font-feature-settings:'lnum'_1,'tnum'_1]">{label ?? n}</span>}
      {(staff.mode === 'manual' || extra) && (
        <div className={`flex-1 flex-col items-center ${active ? 'flex' : 'hidden'} ${hover}`}>
          {/* What acts on this item: duplicate, template, reset, the bin; then the plus, a new one after it, last */}
          {staff.mode === 'manual' && (
            <Action label="Дублировать" name={`Дублировать ${of}`} keys={`${MOD}D`} onClick={() => staff.duplicate(item.key)}>
              <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M3.5 6H2V14H10V12.5M6 2H14V10H6V2Z" /></svg>
            </Action>
          )}
          <ItemNumber.Provider value={num}>{extra}</ItemNumber.Provider>
          {staff.mode === 'manual' && (
            <>
              <Action label="Сбросить" name={`Сбросить ${of}`} hidden={staff.isBlank(item)} onClick={() => staff.clear(item.key)}>
                <ResetIcon />
              </Action>
              <Action label="Удалить" name={`Удалить ${of}`} hidden={staff.people.length < 2} onClick={() => staff.remove(item.key)}>
                <TrashIcon />
              </Action>
              {onAdd && (
                <Action label={addTitle(location.pathname)} keys={MOD === '⌘' ? '⌘↩' : 'Ctrl+Enter'} onClick={() => onAdd(item.key)}>
                  <PlusIcon />
                </Action>
              )}
            </>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

/**
 * What's wrong with an item, under it, centred, as the canvas's captions: a click goes to the field at fault, selecting
 * the item, as the download's note does (the faults are said as the form's labels turn red, so the line leads there)
 */
export function ItemAlert<P extends object>({ staff, item, children }: { staff: Staff<P>; item: number; children: React.ReactNode }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); staff.goTo(item) }} className="cursor-pointer self-center text-center text-[13px] leading-5 text-[#e30]">
      {children}
    </button>
  )
}

/**
 * In place of an item just removed, for four seconds, 40 px tall as the buttons:
 * «Удаляем · Вернуть» led by the bin, the bin closing it at once for one sure of the removal. A ring
 * round the bin runs out over the four seconds, first in the line as Telegram's undo, so it shows how long is left
 * (none with reduced motion)
 */
export function Removed<P extends object>({ staff, at }: { staff: Staff<P>; at: number }) {
  // On a phone it stands in the actions' row, not in the strip
  if (useContext(InSlide)) return null
  if (staff.removed?.index !== at || staff.mode !== 'manual') return null
  return (
    <div className="flex h-10 items-center justify-center gap-2 text-[14px] leading-5 text-[#808080]">
      {/* The bin in its ring (1 px, #808080, black on hover), as «Удалить»: a click removes it for good at once */}
      <button type="button" title="Удалить сразу" aria-label="Удалить сразу" onClick={e => { e.stopPropagation(); staff.dismiss() }} className="relative flex size-[30px] cursor-pointer items-center justify-center rounded-full text-[#808080] hover:text-black">
        <TrashIcon />
        {/* The ring, from the top clockwise, a new one for each removal */}
        <svg key={staff.removed.item.key} width="30" height="30" viewBox="0 0 30 30" aria-hidden className="pointer-events-none absolute inset-0 -rotate-90 motion-reduce:hidden">
          <circle cx="15" cy="15" r="13" fill="none" stroke="currentColor" strokeWidth="1" pathLength={1} strokeDasharray="1" style={{ animation: `countdown ${REMOVED_MS}ms linear forwards` }} />
        </svg>
      </button>
      Удаляем ·
      <button type="button" title={`${MOD}Z`} onClick={e => { e.stopPropagation(); staff.restore() }} className="cursor-pointer text-black hover:text-[#808080]">Вернуть</button>
    </div>
  )
}
