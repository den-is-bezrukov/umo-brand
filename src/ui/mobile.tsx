import { useEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, CrossIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet } from '@/ui/phone'

// A trial of the generators' phone layout (Figma 5098:5806, C and D): the canvas fills the screen above a sheet, what's
// made swiped through one at a time, the item's number between «Удалить» and «Сбросить» over it and «‹ Дублировать ›»
// under it; the sheet holds the sidebar (header and form) with the download at its foot. A tap on the picture folds the
// sheet away, the picture large with no download, and another brings it back; a swipe up on the sheet opens the form
// over the whole screen, with only «‹ n ›» over it, a swipe down puts it back. In the link: `arrows=0` hides the arrows (swiping alone)

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
/** How far a swipe goes before it opens or closes the form */
const SWIPE = 40
/** Under a fitted item: room for its caption or the line saying what's wrong with it */
const UNDER = 56

const arrowsOn = () => new URLSearchParams(location.search).get('arrows') !== '0'

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

export interface Slide {
  key: string | number
  /** The picture, or a function drawing it at a width (the price card's, sized in pixels) */
  node: React.ReactNode | ((width: number) => React.ReactNode)
  /** The picture's height to its width, to fit it whole; without one it takes the width and scrolls if taller */
  ratio?: number
  /** The list item it is, for the actions and the selection */
  item?: number
  /** Its name, in the number's place, for a page whose pictures aren't a list (the livery's sheets, the frame, the sign); their captions under the picture go */
  title?: React.ReactNode
  /** Its reset, in «Сбросить»'s place, while there's something to reset */
  reset?: { onClick: () => void; label: string }
}

type Sheet = 'preview' | 'half' | 'full'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MobileEditor({ slides, staff, sidebar, download }: {
  slides: Slide[]
  /** A list's pages: the selected item shown, a swipe selecting the next */
  staff?: Staff<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  sidebar: React.ReactNode
  download: React.ReactNode
}) {
  const [sheet, setSheet] = useState<Sheet>('half')
  const [arrows] = useState(arrowsOn)

  // The slide in view: the selected item's on a list's page
  const selectedAt = staff ? slides.findIndex(s => s.item === staff.selected) : -1
  const [at, setAt] = useState(Math.max(0, selectedAt))
  const shown = Math.min(at, slides.length - 1)
  const item = slides[shown]?.item
  const current = staff?.items.find((it: { key: number }) => it.key === item)

  // The strip's box, to fit a picture into it whole
  const strip = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    o.observe(el)
    return () => o.disconnect()
  }, [])

  // Swiping: the slide that comes to rest is shown and, an item, selected; an item selected otherwise (a copy, a
  // removal, the line over the download) comes into view
  const settle = useRef(0)
  const onScroll = () => {
    clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = strip.current
      if (!el || !el.clientWidth) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setAt(i)
      const key = slides[i]?.item
      if (staff && key !== undefined && key !== staff.selected) staff.pick(key)
    }, 80)
  }
  const scrollTo = (i: number, smooth = true) => {
    const el = strip.current
    if (!el || !el.clientWidth) return
    const want = i * el.clientWidth
    if (Math.abs(el.scrollLeft - want) > 2) el.scrollTo({ left: want, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => {
    if (selectedAt >= 0 && selectedAt !== at) { setAt(selectedAt); scrollTo(selectedAt) }
  }, [selectedAt, slides.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // A turned or resized screen keeps the slide in place at once
  useEffect(() => scrollTo(shown, false), [box.w]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d: number) => {
    const i = Math.min(Math.max(shown + d, 0), slides.length - 1)
    setAt(i)
    scrollTo(i)
    const key = slides[i]?.item
    if (staff && key !== undefined) staff.pick(key)
  }

  // A tap on the picture folds or unfolds the sheet; a double tap is left to the picture (text edited in place), and a
  // tap on a control in it to the control
  const tap = useRef(0)
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button[aria-label], input, textarea, a')) return
    clearTimeout(tap.current)
    if (e.detail > 1) return
    tap.current = window.setTimeout(() => setSheet(s => (s === 'preview' ? 'half' : 'preview')), 250)
  }

  // A swipe up on the sheet opens the form over the screen, a swipe down (with the form scrolled to its top) puts it back
  const touch = useRef<{ y: number; top: boolean } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { y: e.touches[0].clientY, top: (scroller.current?.scrollTop ?? 0) <= 0 } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dy = e.changedTouches[0].clientY - t.y
    if (sheet === 'half' && dy < -SWIPE && t.top) setSheet('full')
    else if (sheet === 'full' && dy > SWIPE && t.top) setSheet('half')
  }

  const many = slides.length > 1
  const full = sheet === 'full'
  const back = (
    <Btn label="Назад" hidden={!arrows || !many || shown === 0} onClick={() => go(-1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M10 3L5 8L10 13" /></svg>
    </Btn>
  )
  const next = (
    <Btn label="Вперёд" hidden={!arrows || !many || shown === slides.length - 1} onClick={() => go(1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M6 3L11 8L6 13" /></svg>
    </Btn>
  )
  const title = slides[shown]?.title
  const number = title
    ? <span className="min-w-0 truncate text-[14px] leading-5 text-[#808080]">{title}</span>
    : <span className={`text-[14px] leading-5 text-[#808080] [font-feature-settings:'lnum'_1,'tnum'_1] ${many ? '' : 'invisible'}`}>{shown + 1}</span>
  const reset = slides[shown]?.reset
  const height = { preview: '0px', half: 'min(52dvh, 420px)', full: 'calc(100dvh - 48px)' }[sheet]

  const fit = (ratio?: number) => ratio
    ? Math.max(0, Math.floor(Math.min(box.w - 32, (box.h - UNDER) / ratio)))
    : Math.max(0, box.w - 32)

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* Over the picture the item's number between its remove and reset, or «Удалено · Вернуть» for a moment; with the
          form over the screen, the number between the arrows, all there is of the canvas then */}
      <div className="flex h-12 shrink-0 items-center justify-between px-2 pt-2">
        {full ? (
          <>{back}{number}{next}</>
        ) : staff?.removed ? (
          <div className="flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
        ) : (
          <>
            <Btn label="Удалить" hidden={!staff || !current || staff.people.length < 2} onClick={() => staff?.remove(current.key)}><CrossIcon /></Btn>
            {number}
            {reset
              ? <Btn label={reset.label} onClick={reset.onClick}><ResetIcon /></Btn>
              : <Btn label="Сбросить" hidden={!staff || !current || staff.isBlank(current)} onClick={() => staff?.clear(current.key)}><ResetIcon /></Btn>}
          </>
        )}
      </div>

      {/* The pictures, one to a screen */}
      <InSlide.Provider value={true}>
        <div
          ref={strip}
          onScroll={onScroll}
          onClick={onTap}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map(s => (
            <div key={s.key} className={`flex h-full w-full shrink-0 snap-center overflow-y-auto [scrollbar-width:none] ${s.title ? '[&_figcaption]:hidden' : ''}`}>
              {box.w > 0 && <div className="m-auto py-2" style={{ width: fit(s.ratio) }}>{typeof s.node === 'function' ? s.node(fit(s.ratio)) : s.node}</div>}
            </div>
          ))}
        </div>
      </InSlide.Provider>

      {/* Under it the arrows with the copy between them */}
      {!full && (
        <div className="flex h-12 shrink-0 items-center justify-between px-2 pb-2">
          {back}
          <Btn label="Дублировать" hidden={!staff || !current || !!staff.removed} onClick={() => staff?.duplicate(current.key)}><DuplicateIcon /></Btn>
          {next}
        </div>
      )}

      {/* The sheet: the sidebar scrolling, the download at its foot; folded, the download alone, over the canvas */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`flex shrink-0 flex-col overflow-hidden transition-[height,border-radius,background-color] ${sheet === 'preview' ? 'bg-transparent' : 'bg-white'} ${sheet !== 'preview' ? 'rounded-t-[16px]' : ''}`}
        style={{ height, transitionDuration: `${TURN_MS}ms`, transitionTimingFunction: EASE }}
      >
        {/* No breadcrumbs in the sheet for now: the ring of generators opens it */}
        <div ref={scroller} className={`min-h-0 flex-1 overflow-y-auto [&_[data-crumbs]]:hidden ${sheet === 'preview' ? 'pointer-events-none' : ''}`}>
          <InSheet.Provider value={true}>{sidebar}</InSheet.Provider>
        </div>
        {/* The download under the form, open or over the whole screen; none over the picture alone */}
        {sheet !== 'preview' && (
          <div className="shrink-0 px-6 pt-3 pb-5 tracking-normal">
            <InFoot.Provider value={() => setSheet(s => (s === 'preview' ? 'half' : s))}>{download}</InFoot.Provider>
          </div>
        )}
      </div>
    </div>
  )
}
