import { useEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, CrossIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet } from '@/ui/phone'

// A trial of the generators' phone layout (Figma 5098:5806, C and D): the canvas fills the screen above a sheet, what's
// made swiped through one at a time, «‹ n ›» over it and «Сбросить», «Дублировать», «Удалить» under it (Figma
// 5098:5449); the sheet holds the sidebar (header and form) with the download at its foot. A tap on the picture folds the
// sheet away, the picture large with no download, and another brings it back; a swipe up on the sheet's top edge opens the form
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

const TURN_MS = 500
/** The sheet's height under the picture */
const HALF = '60dvh'
/** How far a swipe goes before it opens or closes the form */
const SWIPE = 40
/** A fitted item's inset from the screen's sides: the canvas's 10 px padding and 6 more (Figma 5098:5543) */
const SIDE = 16
/** The canvas's padding and the rows' height, as Figma has them: 10 and 30, 8 between rows and picture */
const ROW = 30
const PAD = 10
/** Over and under a picture as tall as the strip, for its edge */
const EDGE_ROOM = 4

const arrowsOn = () => new URLSearchParams(location.search).get('arrows') !== '0'

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'square' as const, strokeLinejoin: 'bevel' as const }

function Btn({ label, onClick, hidden, children }: { label: string; onClick: () => void; hidden?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      // 30 px as in Figma, a finger's 40 round it (the ::after); hidden keeps its place, so the others don't move
      className={`relative flex size-[30px] shrink-0 after:absolute after:-inset-[5px] after:content-[''] cursor-pointer items-center justify-center rounded-[8px] text-[#808080] outline-none active:text-black ${hidden ? 'invisible' : ''}`}
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
  /** Its number, when it isn't its place in the strip (the business card's face is 0, its cards from 1) */
  number?: number
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
    // The number and arrows follow the swipe at once, the slide past the middle of the screen counting as shown (they
    // waited for it to settle and lagged behind); the item is selected once it has
    const el = strip.current
    if (el?.clientWidth) setAt(Math.round(el.scrollLeft / el.clientWidth))
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

  // Only the sheet's top edge, with its grabber, opens the form over the screen and puts it back, by a swipe or a tap, as
  // a native sheet's: anywhere on the form a swipe up opened it as soon as the form was at its top, so scrolling it did
  const touch = useRef<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = e.touches[0].clientY }
  const onTouchEnd = (e: React.TouchEvent) => {
    const y = touch.current
    touch.current = null
    if (y === null) return
    const dy = e.changedTouches[0].clientY - y
    if (sheet === 'half' && dy < -SWIPE) setSheet('full')
    else if (sheet === 'full' && dy > SWIPE) setSheet('half')
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
    : <span className={`text-[14px] leading-5 text-[#808080] [font-feature-settings:'lnum'_1,'tnum'_1] ${many ? '' : 'invisible'}`}>{slides[shown]?.number ?? shown + 1}</span>
  const reset = slides[shown]?.reset
  const height = { preview: '0px', half: HALF, full: `calc(100dvh - ${ROW + 2 * PAD}px)` }[sheet]

  // As large as the strip allows: its height but 4 px over and under, so the items' 1 px edge outside them
  // (`ITEM_EDGE`) isn't clipped by the slide however the strip's height rounds (2 px was clipped at some heights), its
  // width but the sides
  const fit = (ratio?: number) => ratio
    ? Math.max(0, Math.floor(Math.min(box.w - 2 * SIDE, (box.h - 2 * EDGE_ROOM) / ratio)))
    : Math.max(0, box.w - 2 * SIDE)

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* The canvas: 10 px in, rows of 30 px icons over and under the picture, 8 px off it (Figma 5098:5543) */}
      <div className={`flex min-h-0 flex-1 flex-col p-[10px] ${full ? '' : 'gap-2'}`}>
      {/* Over the picture the item's number (a sheet's name) between the arrows (Figma 5098:5449), and so with the form
          over the screen, all there is of the canvas then */}
      <div className="flex h-[30px] shrink-0 items-center justify-between">
        {back}{number}{next}
      </div>

      {/* The pictures, one to a screen */}
      <InSlide.Provider value={true}>
        <div
          ref={strip}
          onScroll={onScroll}
          onClick={onTap}
          // Across the whole screen, for the swipe, the picture inset in each slide
          className="-mx-[10px] flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map(s => (
            // A fitted picture's slide doesn't scroll at all (`clip`, not `hidden`, which still let the list's scrollIntoView
            // move a copy 4 px down and cut its top edge); one taller than the screen's width scrolls
            <div key={s.key} className={`flex h-full w-full shrink-0 snap-center ${s.ratio ? 'overflow-clip' : 'overflow-y-auto [scrollbar-width:none]'} ${s.title ? '[&_figcaption]:hidden' : ''}`}>
              {box.w > 0 && <div className="m-auto py-1" style={{ width: fit(s.ratio) }}>{typeof s.node === 'function' ? s.node(fit(s.ratio)) : s.node}</div>}
            </div>
          ))}
        </div>
      </InSlide.Provider>

      {/* Under it the item's actions: reset, copy, remove, the cross furthest (Figma 5098:5449); or «Удалено · Вернуть»
          for a moment */}
      {!full && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          {!staff ? (
            // A page that isn't a list (the livery, the plate frame, the sign) has only the sheet's reset, in the middle
            <>
              <Btn label="" hidden onClick={() => {}}>{null}</Btn>
              <Btn label={reset?.label ?? 'Сбросить'} hidden={!reset} onClick={() => reset?.onClick()}><ResetIcon /></Btn>
              <Btn label="" hidden onClick={() => {}}>{null}</Btn>
            </>
          ) : staff.removed ? (
            <div className="-my-[5px] flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
          ) : (
            <>
              <Btn label="Сбросить" hidden={!current || staff.isBlank(current)} onClick={() => staff.clear(current.key)}><ResetIcon /></Btn>
              <Btn label="Дублировать" hidden={!current} onClick={() => staff.duplicate(current.key)}><DuplicateIcon /></Btn>
              <Btn label="Удалить" hidden={!current || staff.people.length < 2} onClick={() => staff.remove(current.key)}><CrossIcon /></Btn>
            </>
          )}
        </div>
      )}

      </div>

      {/* The sheet: the sidebar scrolling, the download at its foot; folded, the download alone, over the canvas */}
      <div
        // As the generators' ring turns, the last easing that was kept (it was linear for a moment)
        className={`relative flex shrink-0 flex-col overflow-hidden transition-[height,border-radius,background-color] ${sheet === 'preview' ? 'bg-transparent' : 'bg-white'} ${sheet !== 'preview' ? 'rounded-t-[24px] shadow-[0_0_30px_-4px_rgba(0,0,0,0.1)]' : ''}`}
        style={{ height, transitionDuration: `${TURN_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.67, 0, 0.33, 1)' }}
      >
        {/* The top edge, over the form's own 24 px padding, the grabber in it */}
        {sheet !== 'preview' && (
          <div
            aria-hidden
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => setSheet(s => (s === 'full' ? 'half' : 'full'))}
            className="absolute inset-x-0 top-0 z-10 flex h-6 cursor-pointer touch-none justify-center pt-2"
          >
            <span className="h-1 w-9 rounded-full bg-black/10" />
          </div>
        )}
        <div ref={scroller} className={`min-h-0 flex-1 overflow-y-auto ${sheet === 'preview' ? 'pointer-events-none' : ''}`}>
          <div className="pb-20"><InSheet.Provider value={height}>{sidebar}</InSheet.Provider></div>
        </div>
        {/* The download under the form, open or over the whole screen; none over the picture alone. It lies over the
            form's foot, 80 px, the form fading out under it from white at 0% (Figma 5098:5634); the form keeps that
            much room under its last field to scroll it clear */}
        {sheet !== 'preview' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-white/0 to-white px-6 py-5 tracking-normal">
            <InFoot.Provider value={() => setSheet(s => (s === 'preview' ? 'half' : s))}>{download}</InFoot.Provider>
          </div>
        )}
      </div>
    </div>
  )
}
