import { type Staff, type Row, plain, plural } from './useStaff'
import { ItemNumber, ITEM_EDGE, ITEM_EDGE_OVER, REMOVED_MS } from './staffState'
import { useContext, useEffect, useRef, useState } from 'react'
import { InSlide } from '@/ui/phone'
import { MOD, withMod } from '@/ui/keys'
import { outlined } from '@/ui/formUtils'
import { ICON } from './icons'
import { addTitle, itemName } from '@/data/generators'

// A staff list, shared by the generators that make one item per person (name tags, business cards): two modes,
// «Вручную», a list typed on the page with one person selected in the sidebar, and «Из документа», a filled-in template
// loaded as .xlsx (or its rows pasted), shown as it is. There's one list, not one per mode: clicking an item in the
// table mode takes the list to «Вручную», and the first edit makes it a list of its own, no longer the file.

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
          className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed p-4 text-center text-[14px] leading-5
            ${s.dragging ? 'border-ink bg-surface' : s.tableError ? 'border-error' : 'border-ink/20 hover:border-ink/40'}`}
        >
          <FileInput staff={s} />
          <span className="font-medium break-all">{s.file}</span>
          <span className="text-caption">{s.countWord(s.people.length)} · заменить</span>
        </label>
      )}
      {s.tableError && <p className="text-[13px] leading-5 text-error">{s.tableError}</p>}
      <a href={template} download={name} onClick={e => { e.preventDefault(); downloadTemplate(template, name) }} data-ui="button" className={`${outlined} ${s.file ? 'mt-2' : ''}`}>Скачать шаблон таблицы</a>
    </div>
  )
}

/** The whole preview as the upload, until a file is loaded */
export function UploadArea<P extends object>({ staff }: { staff: Staff<P> }) {
  const s = staff as unknown as Staff<object>
  return (
    <label className={`flex min-h-[240px] flex-1 cursor-pointer items-center justify-center rounded-control border border-dashed text-[14px] font-medium leading-5
      ${s.dragging ? 'border-ink bg-ink/5' : 'border-ink/20 hover:border-ink/40'}`}>
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
/** ⌘↩ (Ctrl+Enter) adds an item from anywhere, a field too: one card done, the next one (⌘N is the browser's own) */
/** Add, a plus in the canvas icons' 1 px stroke */
export const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M8 2.5V13.5M2.5 8H13.5" /></svg>
)

/** The line over the download while items are in work: «1 из 4 в работе», or «4 в работе» when it's all of them */
/** The table mode's upload, opened from «Загрузите таблицу» over the download */
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
          className="flex size-[30px] cursor-pointer items-center justify-center rounded-control text-caption hover:text-ink"
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
      className={`flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-control text-caption hover:text-ink`}
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
      {(staff.items.length > 1 || label) && <span aria-hidden className="pointer-events-none pb-[5px] text-center text-[14px] leading-5 text-caption [font-feature-settings:'lnum'_1,'tnum'_1]">{label ?? n}</span>}
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
    <button type="button" onClick={e => { e.stopPropagation(); staff.goTo(item) }} className="cursor-pointer self-center text-center text-[13px] leading-5 text-error">
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
    <div className="flex h-10 items-center justify-center gap-2 text-[14px] leading-5 text-caption">
      {/* The bin in its ring (1 px, #808080, black on hover), as «Удалить»: a click removes it for good at once */}
      <button type="button" title="Удалить сразу" aria-label="Удалить сразу" onClick={e => { e.stopPropagation(); staff.dismiss() }} className="relative flex size-[30px] cursor-pointer items-center justify-center rounded-full text-caption hover:text-ink">
        <TrashIcon />
        {/* The ring, from the top clockwise, a new one for each removal */}
        <svg key={staff.removed.item.key} width="30" height="30" viewBox="0 0 30 30" aria-hidden className="pointer-events-none absolute inset-0 -rotate-90 motion-reduce:hidden">
          <circle cx="15" cy="15" r="13" fill="none" stroke="currentColor" strokeWidth="1" pathLength={1} strokeDasharray="1" style={{ animation: `countdown ${REMOVED_MS}ms linear forwards` }} />
        </svg>
      </button>
      Удаляем ·
      <button type="button" title={`${MOD}Z`} onClick={e => { e.stopPropagation(); staff.restore() }} className="cursor-pointer text-ink hover:text-caption">Вернуть</button>
    </div>
  )
}
