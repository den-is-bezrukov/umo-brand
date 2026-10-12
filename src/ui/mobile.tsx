import { useEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet, SheetSize } from '@/ui/phone'

// A trial of the generators' phone layout (Figma 5098:5806, «Mobile Layout»): the canvas over a sheet holding the
// sidebar (header and form) with the download at its foot. A list's pictures are swiped one at a time, with a row over
// them: delete, «‹ n/Name ↺ ›», copy; one picture has its reset and copy in the canvas's top corners instead. A tap on
// a picture that would grow by it folds the sheet away (a portrait one: a landscape one is as wide either way), a
// shrink icon under it bringing the sheet back; the icon in the sheet's header opens the form over the whole screen.
// In the link: `arrows=0` hides the arrows (swiping alone)

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
/** A picture's inset in the canvas: 10 px of padding and 10 more beside it, over and under it (Figma 5105:8456) */
const SIDE = 20
const INSET = 10
/** The canvas's padding and its rows' height (Figma 5105:8488) */
const ROW = 30
const PAD = 10
/** How much larger a picture must get with the sheet folded away for a tap to do it */
const GROWS = 1.15

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
  /** Its name, after its number in the row over it («2/Иван Петров», «1/Левый борт») */
  label?: string
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
  const canPreviewRef = useRef(false)
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button[aria-label], input, textarea, a')) return
    clearTimeout(tap.current)
    if (e.detail > 1) return
    if (!canPreviewRef.current) return
    tap.current = window.setTimeout(() => setSheet(s => (s === 'preview' ? 'half' : 'preview')), 250)
  }

  const scroller = useRef<HTMLDivElement>(null)

  const many = slides.length > 1
  const full = sheet === 'full'
  const preview = sheet === 'preview'
  const slide = slides[shown]
  const reset = slide?.reset ?? (staff && current && !staff.isBlank(current) ? { onClick: () => staff.clear(current.key), label: 'Сбросить' } : undefined)
  /** The row over the picture: a list's, or a removal's «Вернуть» right after the last but one went */
  const row = many || !!staff?.removed

  // The screen's size, to tell whether folding the sheet away would make the picture larger
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const on = () => setScreen({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  const rowsH = (row ? ROW : 0) + 2 * PAD + 2 * INSET
  const growth = (ratio?: number) => {
    if (!ratio) return 1
    const w = screen.w - 2 * SIDE
    const half = Math.min(w, (screen.h * 0.4 - rowsH) / ratio)
    const big = Math.min(w, (screen.h - rowsH - ROW) / ratio)
    return big / Math.max(1, half)
  }
  const canPreview = growth(slide?.ratio) >= GROWS
  canPreviewRef.current = canPreview
  useEffect(() => { if (preview && !canPreview) setSheet('half') }, [preview, canPreview])

  const back = (
    <Btn label="Назад" hidden={!arrows || !many || shown === 0} onClick={() => go(-1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M10 4L6 8L10 12" /></svg>
    </Btn>
  )
  const next = (
    <Btn label="Вперёд" hidden={!arrows || !many || shown === slides.length - 1} onClick={() => go(1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M6 4L10 8L6 12" /></svg>
    </Btn>
  )
  const number = slide?.number ?? shown + 1
  const resetBtn = <Btn label={reset?.label ?? 'Сбросить'} hidden={!reset} onClick={() => reset?.onClick()}><ResetIcon /></Btn>
  const copyBtn = <Btn label="Дублировать" hidden={!staff || !current} onClick={() => staff?.duplicate(current.key, false)}><DuplicateIcon /></Btn>
  const height = { preview: '0px', half: HALF, full: row ? `calc(100dvh - ${ROW + 2 * PAD}px)` : '100dvh' }[sheet]

  // As large as the strip allows, 20 px off its sides and 10 over and under (the items' 1 px edge outside them stays
  // in, however the strip's height rounds)
  const fit = (ratio?: number) => ratio
    ? Math.max(0, Math.floor(Math.min(box.w - 2 * SIDE, (box.h - 2 * INSET) / ratio)))
    : Math.max(0, box.w - 2 * SIDE)

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* The canvas, 10 px in (Figma 5105:8488) */}
      <div className="relative flex min-h-0 flex-1 flex-col p-[10px]">
      {/* A list's row over the picture (Figma 5105:7604): delete on the left, copy on the right, between them the
          number and name between the arrows, the reset right after the name; for a moment after a removal «Удалено ·
          Вернуть» in the middle. Over the whole-screen form it's all there is of the canvas */}
      {row && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          <Btn label="Удалить" hidden={full || !staff || !current || staff.people.length < 2} onClick={() => staff?.remove(current.key)}><TrashIcon /></Btn>
          {staff?.removed ? (
            <div className="-my-[5px] min-w-0 flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {back}
              <span className="min-w-0 truncate px-1 text-[14px] leading-5 text-[#808080] [font-feature-settings:'case'_1,'lnum'_1,'tnum'_1]">
                {number}{slide?.label ? `/${slide.label}` : ''}
              </span>
              {reset && !full && resetBtn}
              {next}
            </div>
          )}
          {full ? <Btn label="" hidden onClick={() => {}}>{null}</Btn> : copyBtn}
        </div>
      )}

      {/* One picture: its reset and copy in the canvas's top corners, over the strip (Figma 5105:8373, 5105:8084) */}
      {!row && !full && (
        <div className="pointer-events-none absolute inset-x-[10px] top-[10px] z-10 flex justify-between *:pointer-events-auto">
          {resetBtn}
          {staff ? copyBtn : <span />}
        </div>
      )}

      {/* The pictures, one to a screen; a tap on one that grows by it folds the sheet away */}
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
            // move a copy 4 px down and cut its top edge); one taller than the screen's width scrolls. A sheet's caption
            // goes while its name is in the row
            <div key={s.key} className={`flex h-full w-full shrink-0 snap-center ${s.ratio ? 'overflow-clip' : 'overflow-y-auto [scrollbar-width:none]'} ${row && s.label ? '[&_figcaption]:hidden' : ''}`}>
              {box.w > 0 && <div className="m-auto" style={{ width: fit(s.ratio) }}>{typeof s.node === 'function' ? s.node(fit(s.ratio)) : s.node}</div>}
            </div>
          ))}
        </div>
      </InSlide.Provider>

      {/* The picture alone: the shrink icon under it brings the sheet back (Figma 5105:8520) */}
      {preview && (
        <div className="flex h-[30px] shrink-0 items-center justify-center">
          <Btn label="Свернуть" onClick={() => setSheet('half')}>
            <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M13.5 6.5H9.5V2.5M2.5 9.5H6.5V13.5M2.5 6.5H6.5V2.5M13.5 9.5H9.5V13.5" /></svg>
          </Btn>
        </div>
      )}
      </div>

      {/* The sheet: the sidebar scrolling, 24 px in, as the sidebar on wide screens (Figma has 16; 20 was tried), the
          download at its foot; its top corners 24 px round, as its padding (Figma has none), a shadow over it (Figma 5098:5487) */}
      <div
        className={`relative flex shrink-0 flex-col overflow-hidden transition-[height] ${preview ? '' : 'rounded-t-[24px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)]'}`}
        // As the generators' ring turns, the last easing that was kept (it was linear for a moment)
        style={{ height, transitionDuration: `${TURN_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.67, 0, 0.33, 1)' }}
      >
        <div ref={scroller} data-sheet className={`min-h-0 flex-1 overflow-y-auto ${preview ? 'pointer-events-none' : ''}`}>
          <div className="pb-20 *:gap-4! *:p-6!">
            <SheetSize.Provider value={{ full, toggle: () => setSheet(s => (s === 'full' ? 'half' : 'full')) }}>
              <InSheet.Provider value={height}>{sidebar}</InSheet.Provider>
            </SheetSize.Provider>
          </div>
        </div>
        {/* The download over the form's foot, on a white gradient the form fades under, 24 px in (Figma 5098:5539) */}
        {!preview && (
          <div data-sheet className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-white/0 to-white p-6 tracking-normal">
            <InFoot.Provider value={() => setSheet(s => (s === 'preview' ? 'half' : s))}>{download}</InFoot.Provider>
          </div>
        )}
      </div>
    </div>
  )
}

/** Delete, a bin (Figma 5105:8492, its outline as exported), the canvas icons' 1 px stroke */
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M3.5 5.5V10.5C3.5 12.3856 3.5 13.3284 4.08579 13.9142C4.67157 14.5 5.61438 14.5 7.5 14.5H8.5C10.3856 14.5 11.3284 14.5 11.9142 13.9142C12.5 13.3284 12.5 12.3856 12.5 10.5V5.5M2.5 3.5H13.5M5.5 3V1.5H10.5V3M9.5 6.5V11.5M6.5 6.5V11.5" /></svg>
)
