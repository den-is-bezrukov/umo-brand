import { useEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, CrossIcon, Removed, type Staff, type Row } from '@/ui/staff'

// A trial of the generators' phone layout (Figma 5098:5806, C and D): the canvas fills the screen above a sheet, the
// items swiped through one at a time, «‹ n ›» over them and their actions under them; the sheet holds the header, the
// form and the download, and swiped down it leaves only the download, the item large. Price card only for now.
// In the link: `arrows=0` hides the arrows (swiping alone), `bare` hides the download too when the sheet is down (B)

/** Whether the screen is a phone's, as the generators' `md` breakpoint */
export function usePhone() {
  const query = '(max-width: 767px)'
  const [phone, setPhone] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

const EASE = 'cubic-bezier(0.67, 0, 0.33, 1)'
const TURN_MS = 333
/** How far a swipe goes before it opens or closes the sheet */
const SWIPE = 40

const arrowsOn = () => new URLSearchParams(location.search).get('arrows') !== '0'
const bareMode = () => new URLSearchParams(location.search).has('bare')

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'square' as const, strokeLinejoin: 'bevel' as const }

function Btn({ label, onClick, hidden, children }: { label: string; onClick: () => void; hidden?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      // Hidden keeps its place, so the others don't move
      className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#808080] outline-none active:text-black ${hidden ? 'invisible' : ''}`}
    >
      {children}
    </button>
  )
}

export function MobileEditor<P extends object>({ staff, current, card, ratio, header, form, button }: {
  staff: Staff<P>
  current: Row<P>
  /** An item drawn into a box of this width */
  card: (item: Row<P>, width: number) => React.ReactNode
  /** The item's height to its width */
  ratio: number
  header: React.ReactNode
  form: React.ReactNode
  /** The sheet's foot: the download, or what's in the way */
  button: (openSheet: () => void) => React.ReactNode
}) {
  const { items } = staff
  const index = Math.max(0, items.findIndex(it => it.key === current.key))
  const [open, setOpen] = useState(true)
  const [arrows] = useState(arrowsOn)
  const [bare] = useState(bareMode)

  // The strip's box, to fit an item into it whole
  const strip = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    o.observe(el)
    return () => o.disconnect()
  }, [])
  const cardW = Math.max(0, Math.floor(Math.min(box.w - 32, (box.h - 16) / ratio)))

  // Swiping through the items: the one that comes to rest is selected; a selection made elsewhere (a copy, a removal)
  // brings its item into view
  const settle = useRef(0)
  const onScroll = () => {
    clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = strip.current
      if (!el || !el.clientWidth) return
      const at = Math.round(el.scrollLeft / el.clientWidth)
      const it = items[at]
      if (it && it.key !== current.key) staff.pick(it.key)
    }, 80)
  }
  useEffect(() => {
    const el = strip.current
    if (!el || !el.clientWidth) return
    const want = index * el.clientWidth
    if (Math.abs(el.scrollLeft - want) > 2) el.scrollTo({ left: want, behavior: 'smooth' })
  }, [index, items.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // A turned or resized screen keeps the item in place at once
  useEffect(() => {
    const el = strip.current
    if (el?.clientWidth) el.scrollTo({ left: index * el.clientWidth })
  }, [box.w]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d: number) => { const it = items[index + d]; if (it) staff.pick(it.key) }

  // The sheet goes down with a swipe down on it (once its form is scrolled to the top) and up with a swipe up
  const touch = useRef<{ y: number; top: boolean } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { y: e.touches[0].clientY, top: (scroller.current?.scrollTop ?? 0) <= 0 } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dy = e.changedTouches[0].clientY - t.y
    if (open && dy > SWIPE && t.top) setOpen(false)
    else if (!open && dy < -SWIPE) setOpen(true)
  }
  const openSheet = () => setOpen(true)

  const many = items.length > 1
  const sheetH = open ? 'min(52dvh, 420px)' : bare ? '0px' : '72px'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* ‹ n › */}
      <div className="flex h-12 shrink-0 items-center justify-between px-2 pt-2">
        <Btn label="Предыдущая" hidden={!arrows || !many || index === 0} onClick={() => go(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M10 3L5 8L10 13" /></svg>
        </Btn>
        <span className={`text-[14px] leading-5 text-[#808080] [font-feature-settings:'lnum'_1,'tnum'_1] ${many ? '' : 'invisible'}`}>{index + 1}</span>
        <Btn label="Следующая" hidden={!arrows || !many || index === items.length - 1} onClick={() => go(1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M6 3L11 8L6 13" /></svg>
        </Btn>
      </div>

      {/* The items, one to a screen; a tap on one opens or closes the sheet */}
      <div
        ref={strip}
        onScroll={onScroll}
        onTouchStart={!open ? onTouchStart : undefined}
        onTouchEnd={!open ? onTouchEnd : undefined}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(it => (
          <div key={it.key} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            {cardW > 0 && (
              <div onClick={() => setOpen(o => !o)} className="cursor-pointer">{card(it, cardW)}</div>
            )}
          </div>
        ))}
      </div>

      {/* The item's actions: reset, copy, remove (the cross furthest), or «Удалено · Вернуть» for a moment */}
      <div className="flex h-12 shrink-0 items-center justify-between px-2 pb-2">
        {staff.removed ? (
          <div className="flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
        ) : (
          <>
            <Btn label="Сбросить" hidden={staff.isBlank(current)} onClick={() => staff.clear(current.key)}><ResetIcon /></Btn>
            <Btn label="Дублировать" onClick={() => staff.duplicate(current.key)}><DuplicateIcon /></Btn>
            <Btn label="Удалить" hidden={!many} onClick={() => staff.remove(current.key)}><CrossIcon /></Btn>
          </>
        )}
      </div>

      {/* The sheet: header and form scrolling, the download at its foot */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex shrink-0 flex-col overflow-hidden rounded-t-[16px] bg-white"
        style={{ height: sheetH, transition: `height ${TURN_MS}ms ${EASE}` }}
      >
        <div ref={scroller} className={`min-h-0 flex-1 overflow-y-auto ${open ? '' : 'pointer-events-none'}`}>
          <div className="flex flex-col gap-6 p-6 pb-4 tracking-[-0.01em]">
            {header}
            {form}
          </div>
        </div>
        <div className="shrink-0 px-6 pt-3 pb-5 tracking-normal">{button(openSheet)}</div>
      </div>
    </div>
  )
}
