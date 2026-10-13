import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, TrashIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet } from '@/ui/phone'

// A trial of the generators' phone layout (Figma 5098:5806, «Mobile Layout»): the canvas over a sheet holding the
// sidebar (header and form) with the download at its foot. A list's pictures are swiped one at a time, with a row over
// them: delete (its place kept empty while «Удаляем · Вернуть» has its own bin), «‹ n/total ↺ ›» (a slide that isn't an item: its name), copy; one portrait picture has its reset and copy in the canvas's top corners instead, a landscape one a row with its name. A tap on
// a picture that would grow by it folds the sheet away (a portrait one: a landscape one is as wide either way), a
// shrink icon under it bringing the sheet back; the sheet goes up over the screen with the finger, the form in it scrolling on.
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
const HALF = 0.6
/** A picture's inset in the canvas: 10 px of padding and 10 more beside it, over and under it (Figma 5105:8456) */
const SIDE = 20
const INSET = 10
/** Off the sides with the controls in the canvas's top corners: past them (10 + 30) and 10 more */
const CORNER = 50
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

  // The screen's size, to tell whether folding the sheet away would make the picture larger, and to place the sheet
  const root = useRef<HTMLDivElement>(null)
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const el = root.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setScreen({ w: e.contentRect.width, h: e.contentRect.height }))
    o.observe(el)
    return () => o.disconnect()
  }, [])
  // Under the row, if there's one
  const rowsH = (full || corners ? 0 : ROW) + 2 * PAD + 2 * INSET
  const growth = (ratio?: number) => {
    if (!ratio) return 1
    const w = screen.w - 2 * SIDE
    const half = Math.min(w, (screen.h * (1 - HALF) - rowsH) / ratio)
    const big = Math.min(w, (screen.h - rowsH - ROW) / ratio)
    return big / Math.max(1, half)
  }
  const canPreview = growth(slide?.ratio) >= GROWS

  // The sheet and the form in it are one native scroll (Apple Maps' sheet): over the sheet a space the canvas sticks
  // in, so a swipe up on the form lifts the sheet with the finger until it's over the screen and then, the same swipe,
  // scrolls the form, with the phone's own momentum; a swipe down brings it back, and on down to the picture alone
  // where that makes it larger, elsewhere springing back. A swipe let go between two places goes on to the next one its
  // way, and a fling stops at the first place it reaches. Was a swipe that, past a threshold, set the sheet going on its
  // own: it jumped while the form was being scrolled; then a grabber on its top edge, then an icon in its header.
  // Not a layer over the canvas letting touches through (`pointer-events: none`): iOS doesn't scroll it then
  /** The list's row stays over the sheet: the scroll starts under it */
  const rowH = row ? ROW + PAD : 0
  const room = Math.max(0, screen.h - rowH)
  const tops = { preview: room, half: Math.round(room - screen.h * HALF), full: row ? PAD : 0 }
  const spacer = canPreview ? room : tops.half
  /** Each place as the scroll's offset */
  const offsets = { preview: spacer - tops.preview, half: spacer - tops.half, full: spacer - tops.full }
  const places = useRef(offsets)
  places.current = offsets
  const order: Sheet[] = canPreview ? ['preview', 'half', 'full'] : ['half', 'full']
  const orderRef = useRef(order)
  orderRef.current = order

  const scroller = useRef<HTMLDivElement>(null)
  const foot = useRef<HTMLDivElement>(null)
  const finger = useRef(false)
  const letGo = useRef(0)
  const last = useRef(0)
  const way = useRef(0)
  const idle = useRef(0)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  /** The download goes down with the sheet under its usual place */
  const footOff = (y: number) => `translateY(${Math.max(0, places.current.half - y)}px)`

  const moveTo = (s: Sheet) => {
    setSheet(s)
    scroller.current?.scrollTo({ top: places.current[s], behavior: 'smooth' })
  }
  const rest = () => {
    const el = scroller.current
    if (!el || finger.current) return
    const y = el.scrollTop
    const p = places.current
    const list = orderRef.current
    if (y >= p.full - 1) { setSheet('full'); return }
    const here = list.find(s => Math.abs(p[s] - y) < 2)
    if (here) { setSheet(here); return }
    const below = [...list].reverse().find(s => p[s] < y) ?? list[0]
    const above = list.find(s => p[s] > y) ?? list[list.length - 1]
    moveTo(way.current < 0 ? below : above)
  }
  const onSheetScroll = () => {
    const el = scroller.current
    if (!el) return
    const y = el.scrollTop
    const prev = last.current
    last.current = y
    if (y !== prev) way.current = Math.sign(y - prev)
    if (foot.current) foot.current.style.transform = footOff(y)
    // A fling, the finger off, stops at the first place it reaches: momentum is cut by taking the scroll away a frame
    if (!finger.current && Date.now() - letGo.current < 1500) {
      const p = places.current
      const crossed = orderRef.current.find(s => (prev - p[s]) * (y - p[s]) < 0)
      if (crossed) {
        el.style.overflowY = 'hidden'
        el.scrollTop = p[crossed]
        last.current = p[crossed]
        requestAnimationFrame(() => { el.style.overflowY = '' })
        letGo.current = 0
        setSheet(crossed)
        return
      }
    }
    clearTimeout(idle.current)
    idle.current = window.setTimeout(rest, 120)
  }
  const down = () => { finger.current = true; clearTimeout(idle.current) }
  const up = () => {
    finger.current = false
    letGo.current = Date.now()
    clearTimeout(idle.current)
    idle.current = window.setTimeout(rest, 120)
  }

  // The sheet keeps its place as the screen, the row or the picture's chance to grow change (and starts half up)
  const spacerWas = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const was = spacerWas.current
    spacerWas.current = spacer
    const s = sheet === 'preview' && !canPreview ? 'half' : sheet
    if (s !== sheet) setSheet(s)
    if (was !== null && s === 'full' && el.scrollTop > offsets.full - (spacer - was)) el.scrollTop += spacer - was
    else el.scrollTop = offsets[s]
    last.current = el.scrollTop
    if (foot.current) foot.current.style.transform = footOff(el.scrollTop)
  }, [spacer, tops.full, tops.half]) // eslint-disable-line react-hooks/exhaustive-deps

  // A tap on the picture folds or unfolds the sheet; a double tap is left to the picture (text edited in place), and a
  // tap on a control in it to the control
  const tap = useRef(0)
  const canPreviewRef = useRef(false)
  canPreviewRef.current = canPreview
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button[aria-label], input, textarea, a')) return
    clearTimeout(tap.current)
    if (e.detail > 1) return
    if (!canPreviewRef.current) return
    tap.current = window.setTimeout(() => moveTo(sheetRef.current === 'preview' ? 'half' : 'preview'), 250)
  }

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
  /** The canvas over the sheet: above its usual place, the whole screen with the picture alone */
  const canvasH = preview ? tops.preview : tops.half

  return (
    <div ref={root} className="fixed inset-0 flex flex-col overflow-hidden bg-[#f5f5f5] font-sans text-black">
      {/* A list's row over the picture (Figma 5105:7604): delete on the left, copy on the right, between them the
          number between the arrows, the reset right after it; for a moment after a removal «Удаляем ·
          Вернуть» in the middle. Over the whole-screen form it's all there is of the canvas */}
      {row && (
        <div className="flex h-[40px] shrink-0 items-center justify-between px-[10px] pt-[10px]">
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

      <div
        ref={scroller}
        onScroll={onSheetScroll}
        onTouchStart={down}
        onTouchEnd={up}
        onTouchCancel={up}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* The space over the sheet, the canvas stuck at its top, 10 px in (Figma 5105:8488) */}
        <div style={{ height: spacer }}>
          <div
            className={`sticky top-0 flex flex-col px-[10px] pb-[10px] ${row ? '' : 'pt-[10px]'} ${preview ? 'pb-[calc(10px+env(safe-area-inset-bottom))]' : ''} transition-[height]`}
            style={{ height: canvasH, transitionDuration: `${TURN_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.67, 0, 0.33, 1)' }}
          >
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
                  // move a copy 4 px down and cut its top edge), nor moves the sheet up or down (pan-x); one taller than the
                  // screen's width scrolls. A sheet's caption goes, its name in the row
                  <div key={s.key} className={`flex h-full w-full shrink-0 snap-center ${s.ratio ? 'touch-pan-x overflow-clip' : 'overflow-y-auto [scrollbar-width:none]'} ${s.label ? '[&_figcaption]:hidden' : ''}`}>
                    {box.w > 0 && <Fitted ratio={s.ratio} box={box} node={s.node} side={corners ? CORNER : SIDE} />}
                  </div>
                ))}
              </div>
            </InSlide.Provider>

            {/* The picture alone: the shrink icon under it brings the sheet back (Figma 5105:8520) */}
            {preview && (
              <div className="flex h-[30px] shrink-0 items-center justify-center">
                <Btn label="Свернуть" onClick={() => moveTo('half')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M13.5 6.5H9.5V2.5M2.5 9.5H6.5V13.5M2.5 6.5H6.5V2.5M13.5 9.5H9.5V13.5" /></svg>
                </Btn>
              </div>
            )}
          </div>
        </div>

        {/* The sheet: the sidebar, 24 px in, as the sidebar on wide screens (Figma has 16; 20 was tried); its top corners
            24 px round, as its padding (Figma has none), a shadow over it (Figma 5098:5487); at least the screen's height */}
        <div
          data-sheet
          onFocus={e => setTyping(types(e.target))}
          onBlur={e => setTyping(types(e.relatedTarget))}
          className={`relative z-10 rounded-t-[24px] bg-white ${preview ? '' : 'shadow-[0_10px_30px_rgba(0,0,0,0.1)]'}`}
          style={{ minHeight: room - tops.full }}
        >
          {/* Groups 24 px apart (`src/index.css`, as on wide screens), so from one 48 px control to the next is 48 (16 + 8 for a label + 24) */}
          <div className="pb-[calc(96px+env(safe-area-inset-bottom))] *:gap-6! *:p-6!">
            <InSheet.Provider value={sheet}>{sidebar}</InSheet.Provider>
          </div>
        </div>
      </div>

      {/* The download at the screen's foot, over the form, on a white gradient the form fades under, 24 px in all round
          (Figma 5098:5539), plus the screen's bottom safe area under it (`viewport-fit=cover` in index.html), so it clears
          the home indicator. Tried closer to Safari's bottom tab bar: 16, then on iOS alone 16, 0, 2 and 8 — touching the
          edge, the black button turned Safari 26's bar black, and 24 all round is what the sheet's sides have */}
      {!preview && !typing && (
        <div
          ref={foot}
          data-sheet
          className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-b from-white/0 to-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] tracking-normal"
          style={{ transform: footOff(last.current) }}
        >
          <InFoot.Provider value={() => { if (sheetRef.current === 'preview') moveTo('half') }}>{download}</InFoot.Provider>
        </div>
      )}
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
