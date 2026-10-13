import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, TrashIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet } from '@/ui/phone'

// A trial of the generators' phone layout (Figma 5098:5806, «Mobile Layout»): the canvas over a sheet holding the
// sidebar (header and form) with the download at its foot. A list's pictures are swiped one at a time, with a row over
// them: delete (its place kept empty while «Удаляем · Вернуть» has its own bin), «‹ n/total ↺ ›» (a slide that isn't an item: its name), copy; one portrait picture has its reset and copy in the canvas's top corners instead, a landscape one a row with its name. A tap on
// a picture that would grow by it folds the sheet away (a portrait one: a landscape one is as wide either way), a
// shrink icon under it bringing the sheet back; a form longer than the sheet, scrolled to its end, opens over the whole
// screen, and a swipe down at its top puts it back.
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
/** The sheet's share of the screen under the picture */
const HALF_SHARE = 0.6
/** A picture's inset in the canvas: 10 px of padding and 10 more beside it, over and under it (Figma 5105:8456) */
const SIDE = 20
const INSET = 10
/** Off the sides with the controls in the canvas's top corners: past them (10 + 30) and 10 more */
const CORNER = 50
/** The canvas's padding and its rows' height (Figma 5105:8488) */
const ROW = 30
const PAD = 10
/** How far a finger pulls past the form's edge to turn the sheet, as a pull to refresh */
const PULL = 70
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
      className={`relative flex size-[30px] shrink-0 after:absolute after:-inset-[5px] after:content-[''] cursor-pointer items-center justify-center rounded-[8px] text-[#808080] active:text-black ${hidden ? 'invisible' : ''}`}
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
  /** Its name: over one picture, or after its number in a row of slides that aren't items («1/Левый борт») */
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
  const scroller = useRef<HTMLDivElement>(null)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  /** Where the sheet came from and how far its form was scrolled, to carry the form on from there */
  const from = useRef<{ sheet: Sheet; top: number } | null>(null)
  const move = (s: Sheet) => {
    if (s === sheetRef.current) return
    from.current = { sheet: sheetRef.current, top: scroller.current?.scrollTop ?? 0 }
    setSheet(s)
  }
  const [arrows] = useState(arrowsOn)
  // A text field in the form has the focus, so the keyboard is up: the download steps aside, as a phone's own forms do,
  // or it covered the field the keyboard had just brought above it
  const [typing, setTyping] = useState(false)
  const types = (el: EventTarget | null) => el instanceof HTMLTextAreaElement ? !el.readOnly : el instanceof HTMLInputElement && !el.readOnly && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type)

  // The slide in view: the selected item's on a list's page
  const selectedAt = staff ? slides.findIndex(s => s.item === staff.selected) : -1
  const [at, setAt] = useState(Math.max(0, selectedAt))
  const shown = Math.min(at, slides.length - 1)
  const item = slides[shown]?.item
  // A loaded table is only looked through, as on wide screens: a swipe selects nothing (selecting took the list to
  // «Вручную»), and its items have no actions
  const browsing = staff?.mode === 'table'
  const current = browsing ? undefined : staff?.items.find((it: { key: number }) => it.key === item)

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
      if (staff && !browsing && key !== undefined && key !== staff.selected) staff.pick(key)
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
    if (staff && !browsing && key !== undefined) staff.pick(key)
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
    tap.current = window.setTimeout(() => move(sheetRef.current === 'preview' ? 'half' : 'preview'), 250)
  }

  // A hard pull past the form's edge, as a page's pull to refresh, turns the sheet: past its end a form longer than the
  // sheet opens over the whole screen (a short one never does), past its top it goes back. Only a new gesture started
  // at the edge does it, never the scroll running into it. Was the scroll reaching the end opening it, an icon in the
  // header, a grabber on the sheet's edge before it, and a sheet following the finger, which jerked and moved the picture
  const pull = useRef<{ y: number; top: boolean; end: boolean } | null>(null)
  const edges = () => {
    const el = scroller.current
    if (!el) return { top: false, end: false }
    const room = el.scrollHeight - el.clientHeight
    return { top: el.scrollTop <= 0, end: room > 1 && el.scrollTop >= room - 1 }
  }
  const onTouchStart = (e: React.TouchEvent) => { pull.current = { y: e.touches[0].clientY, ...edges() } }
  const onTouchMove = (e: React.TouchEvent) => {
    const p = pull.current
    if (!p) return
    const dy = e.touches[0].clientY - p.y
    if (p.top && dy > PULL && sheetRef.current === 'full') { pull.current = null; move('half') }
    else if (p.end && dy < -PULL && sheetRef.current === 'half') { pull.current = null; move('full') }
  }
  const onTouchEnd = () => { pull.current = null }
  // The wheel, in a narrow window: a turn on past the edge it already stood at
  const wheelAt = useRef({ top: false, end: false })
  const onWheel = (e: React.WheelEvent) => {
    const now = edges()
    const was = wheelAt.current
    wheelAt.current = now
    if (sheetRef.current === 'full' && now.top && was.top && e.deltaY < -10) move('half')
    else if (sheetRef.current === 'half' && now.end && was.end && e.deltaY > 10) move('full')
  }

  const many = slides.length > 1
  const full = sheet === 'full'
  const preview = sheet === 'preview'
  const slide = slides[shown]
  const reset = slide?.reset ?? (staff && current && !staff.isBlank(current) ? { onClick: () => staff.clear(current.key), label: 'Сбросить' } : undefined)
  /** The row over the picture: a list's, or a removal's «Вернуть» right after the last but one went */
  const row = many || !!staff?.removed
  /** One portrait picture (the price card, the sign) has its reset and copy in the canvas's top corners, no row over it,
   * so it takes the canvas's height (Figma 5105:8373); a landscape one keeps the row, the corners being over its edge */
  const corners = !row && (slide?.ratio ?? 0) > 1

  // The screen's size, to tell whether folding the sheet away would make the picture larger
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const on = () => setScreen({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  // Under the row, if there's one
  const rowsH = (full || corners ? 0 : ROW) + 2 * PAD + 2 * INSET
  const growth = (ratio?: number) => {
    if (!ratio) return 1
    const w = screen.w - 2 * SIDE
    const half = Math.min(w, (screen.h * 0.4 - rowsH) / ratio)
    const big = Math.min(w, (screen.h - rowsH - ROW) / ratio)
    return big / Math.max(1, half)
  }
  const canPreview = growth(slide?.ratio) >= GROWS
  canPreviewRef.current = canPreview
  useEffect(() => { if (preview && !canPreview) move('half') }, [preview, canPreview])

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
  // A list's item shows its number of all («2/5»), its name being on it already; a slide that isn't an item its name,
  // after its number only when it has one of its own (the business card's face, «0/Обложка»; the livery's «Левый борт»)
  const total = slides.filter(s => s.item !== undefined).length
  const resetBtn = <Btn label={reset?.label ?? 'Сбросить'} hidden={!reset} onClick={() => reset?.onClick()}><ResetIcon /></Btn>
  const copyBtn = <Btn label="Дублировать" hidden={!staff || !current} onClick={() => staff?.duplicate(current.key, false)}><DuplicateIcon /></Btn>
  // The sheet is always as tall as over the whole screen and moved down out of it (its edge, the white under the form,
  // and the form each a layer moved and cut, which a phone draws without laying the form out again: a sheet changing its
  // height froze on an iPhone, the form laid out on every frame). At 60% the form has as much again under its end, so it
  // scrolls to its end in view
  const tall = Math.max(0, screen.h - (row ? ROW + 2 * PAD : 0))
  const below = Math.max(0, Math.round(tall - screen.h * HALF_SHARE))
  const edge = { preview: tall, half: below, full: 0 }
  const sheetBg = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const was = from.current
    from.current = null
    const el = scroller.current
    if (!was || !el || !form.current || !sheetBg.current) return
    // The form carries on from where it stood, however much its scroll was cut short by the room under it changing
    const fromAt = edge[was.sheet] - was.top
    const start = fromAt + el.scrollTop
    const to = edge[sheet]
    const timing = { duration: TURN_MS, easing: 'cubic-bezier(0.67, 0, 0.33, 1)' }
    sheetBg.current.animate([{ transform: `translateY(${edge[was.sheet]}px)` }, { transform: `translateY(${to}px)` }], timing)
    const cut = (top: number) => `inset(${Math.max(0, Math.round(top))}px 0 0 0 round 24px 24px 0 0)`
    form.current.animate([
      { transform: `translateY(${start}px)`, clipPath: cut(edge[was.sheet] - start) },
      { transform: `translateY(${to}px)`, clipPath: cut(0) },
    ], timing)
  }, [sheet]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* The canvas, 10 px in (Figma 5105:8488): above the sheet at 60%, the whole screen with the picture alone. The
          sheet over the whole screen slides over it, leaving it as it is (it shrank under the sheet, the picture refitted
          as it went and jerked) */}
      <div
        className={`relative flex shrink-0 flex-col p-[10px] transition-[height] ${preview ? 'pb-[calc(10px+env(safe-area-inset-bottom))]' : ''}`}
        style={{ height: preview ? screen.h : screen.h - tall + below, transitionDuration: `${TURN_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.67, 0, 0.33, 1)' }}
      >
      {/* A list's row over the picture (Figma 5105:7604): delete on the left, copy on the right, between them the
          number between the arrows, the reset right after it; for a moment after a removal «Удаляем ·
          Вернуть» in the middle. Over the whole-screen form it's all there is of the canvas */}
      {row && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          <Btn label="Удалить" hidden={full || !staff || !current || staff.people.length < 2 || !!staff.removed} onClick={() => staff?.remove(current.key)}><TrashIcon /></Btn>
          {staff?.removed ? (
            <div className="-my-[5px] min-w-0 flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {back}
              <span className="min-w-0 truncate px-1 text-[14px] leading-5 text-[#808080] [font-feature-settings:'case'_1,'lnum'_1,'tnum'_1]">
                {slide?.item !== undefined ? `${number}/${total}` : slide?.number !== undefined ? `${number}/${slide.label}` : slide?.label}
              </span>
              {reset && !full && resetBtn}
              {next}
            </div>
          )}
          {full ? <Btn label="" hidden onClick={() => {}}>{null}</Btn> : copyBtn}
        </div>
      )}

      {/* One picture: a row over it as a list's, its name in the middle with the reset after it, copy on the right (in
          the canvas's top corners over the strip, Figma 5105:8373, they covered a landscape item's edge, and the name
          stood in a caption under the picture, unlike a list's) */}
      {!row && !corners && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          <Btn label="" hidden onClick={() => {}}>{null}</Btn>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {slide?.label && slide.item === undefined && <span className="min-w-0 truncate px-1 text-[14px] leading-5 text-[#808080] [font-feature-settings:'case'_1,'lnum'_1,'tnum'_1]">{slide.label}</span>}
            {/* Only while there's something to reset: the name and the reset centred together, no place kept for it */}
            {reset && resetBtn}
          </div>
          {staff ? copyBtn : <Btn label="" hidden onClick={() => {}}>{null}</Btn>}
        </div>
      )}

      {corners && (
        <>
          <div className="absolute top-[10px] left-[10px] z-10">{reset && resetBtn}</div>
          <div className="absolute top-[10px] right-[10px] z-10">{staff && copyBtn}</div>
        </>
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
            // goes, its name in the row
            <div key={s.key} className={`flex h-full w-full shrink-0 snap-center ${s.ratio ? 'overflow-clip' : 'overflow-y-auto [scrollbar-width:none]'} ${s.label ? '[&_figcaption]:hidden' : ''}`}>
              {box.w > 0 && <Fitted ratio={s.ratio} box={box} node={s.node} side={corners ? CORNER : SIDE} />}
            </div>
          ))}
        </div>
      </InSlide.Provider>

      {/* The picture alone: the shrink icon under it brings the sheet back (Figma 5105:8520) */}
      {preview && (
        <div className="flex h-[30px] shrink-0 items-center justify-center">
          <Btn label="Свернуть" onClick={() => move('half')}>
            <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M13.5 6.5H9.5V2.5M2.5 9.5H6.5V13.5M2.5 6.5H6.5V2.5M13.5 9.5H9.5V13.5" /></svg>
          </Btn>
        </div>
      )}
      </div>

      {/* The sheet: the sidebar scrolling, 24 px in, as the sidebar on wide screens (Figma has 16; 20 was tried), the
          download at its foot; its top corners 24 px round, as its padding (Figma has none), a shadow over it (Figma 5098:5487) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10" style={{ height: tall }}>
        <div
          ref={sheetBg}
          className={`absolute inset-0 rounded-t-[24px] bg-white ${preview ? '' : 'shadow-[0_10px_30px_rgba(0,0,0,0.1)]'}`}
          style={{ transform: `translateY(${edge[sheet]}px)` }}
        />
        <div ref={form} className={`absolute inset-0 flex flex-col ${preview ? '' : 'pointer-events-auto'}`} style={{ transform: `translateY(${edge[sheet]}px)` }}>
          <div ref={scroller} data-sheet onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} onWheel={onWheel} onFocus={e => setTyping(types(e.target))} onBlur={e => setTyping(types(e.relatedTarget))} className="min-h-0 flex-1 overflow-y-auto">
            {/* Groups 24 px apart (`src/index.css`, as on wide screens), so from one 48 px control to the next is 48 (16 + 8 for a label + 24) */}
            <div className="*:gap-6! *:p-6!" style={{ paddingBottom: `calc(${96 + (full ? 0 : below)}px + env(safe-area-inset-bottom))` }}>
              <InSheet.Provider value={sheet}>{sidebar}</InSheet.Provider>
            </div>
          </div>
        </div>
        {/* The download over the form's foot, on a white gradient the form fades under, 24 px in all round (Figma 5098:5539),
            plus the screen's bottom safe area under it (`viewport-fit=cover` in index.html), so it clears the home
            indicator. Tried closer to Safari's bottom tab bar: 16, then on iOS alone 16, 0, 2 and 8 — touching the edge,
            the black button turned Safari 26's bar black, and 24 all round is what the sheet's sides have */}
        {!preview && !typing && (
          <div data-sheet className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-b from-white/0 to-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] tracking-normal">
            <InFoot.Provider value={() => { if (sheetRef.current === 'preview') move('half') }}>{download}</InFoot.Provider>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A picture as large as the strip allows, 20 px off its sides and 10 over and under (the items' 1 px edge outside them
 * stays in, however the strip's height rounds), along with what stands under it — an item's faults, a sheet's caption —
 * measured, so they're never cut off by the sheet
 */
function Fitted({ ratio, box, node, side }: { ratio?: number; box: { w: number; h: number }; node: Slide['node']; side: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // The height beyond the picture's own
  const [extra, setExtra] = useState(0)
  const w = ratio
    ? Math.max(0, Math.floor(Math.min(box.w - 2 * side, (box.h - 2 * INSET - extra) / ratio)))
    : Math.max(0, box.w - 2 * side)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !ratio) return
    const measure = () => {
      const c = Math.max(0, Math.round(el.offsetHeight - w * ratio))
      setExtra(e => (Math.abs(c - e) > 1 ? c : e))
    }
    measure()
    const o = new ResizeObserver(measure)
    o.observe(el)
    return () => o.disconnect()
  }, [w, ratio])
  return <div ref={ref} className="m-auto" style={{ width: w }}>{typeof node === 'function' ? node(w) : node}</div>
}
